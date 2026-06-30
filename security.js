/**
 * Flay Omni - Security Module
 * Headers, CSRF, rate limiting, input validation, CSP
 */

const crypto = require('crypto');
const config = require('./config');

class Security {
    constructor() {
        this.rateLimits = new Map();
        this.blockedIPs = new Set();
        this.loginAttempts = new Map();
        this.CSRF_TOKENS = new Map();
    }

    // === Rate Limiting ===
    checkRateLimit(key, windowMs, max) {
        const now = Date.now();
        if (!this.rateLimits.has(key)) this.rateLimits.set(key, []);
        const hits = this.rateLimits.get(key).filter(t => t > now - windowMs);
        this.rateLimits.set(key, hits);
        if (hits.length >= max) return false;
        hits.push(now);
        return true;
    }

    // Login rate limit: 5 attempts per 15 min
    checkLoginLimit(ip) {
        const key = `login:${ip}`;
        if (!this.checkRateLimit(key, 900000, 5)) {
            this.incrementBlock(ip);
            return false;
        }
        return true;
    }

    incrementBlock(ip) {
        const key = `blocks:${ip}`;
        const blocks = (this.rateLimits.get(key) || []).filter(t => t > Date.now() - 3600000);
        blocks.push(Date.now());
        this.rateLimits.set(key, blocks);
        if (blocks.length >= 3) this.blockedIPs.add(ip);
    }

    isBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    // Cleanup every 10 min
    cleanup() {
        const now = Date.now();
        for (const [key, hits] of this.rateLimits) {
            const valid = hits.filter(t => t > now - 3600000);
            if (valid.length === 0) this.rateLimits.delete(key);
            else this.rateLimits.set(key, valid);
        }
        // Unblock IPs after 1h
        for (const ip of this.blockedIPs) {
            const blocks = this.rateLimits.get(`blocks:${ip}`) || [];
            if (blocks.length === 0 || blocks[blocks.length - 1] < now - 3600000) {
                this.blockedIPs.delete(ip);
            }
        }
    }

    // === CSRF ===
    generateCSRF() {
        const token = crypto.randomBytes(32).toString('hex');
        this.CSRF_TOKENS.set(token, Date.now());
        return token;
    }

    validateCSRF(token) {
        if (!token || !this.CSRF_TOKENS.has(token)) return false;
        const time = this.CSRF_TOKENS.get(token);
        this.CSRF_TOKENS.delete(token); // One-time use
        return Date.now() - time < 3600000; // Valid for 1h
    }

    // === Input Validation ===
    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    validatePassword(password) {
        const errors = [];
        if (password.length < 8) errors.push('8 caracteres minimum');
        if (!/[A-Z]/.test(password)) errors.push('1 majuscule minimum');
        if (!/[0-9]/.test(password)) errors.push('1 chiffre minimum');
        return errors;
    }

    sanitize(str) {
        if (typeof str !== 'string') return str;
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim()
            .substring(0, 10000); // Max 10KB per field
    }

    sanitizeObj(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'string') out[k] = this.sanitize(v);
            else if (typeof v === 'object' && !Array.isArray(v)) out[k] = this.sanitizeObj(v);
            else out[k] = v;
        }
        return out;
    }

    // === Security Headers ===
    setHeaders(res, isAPI = false) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
        res.setHeader('X-Powered-By', 'Flay DigitalStrategies'); // Custom header
        if (isAPI) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
        }
    }

    // === Request Logging ===
    logRequest(req, res, startTime) {
        const duration = Date.now() - startTime;
        const status = res.statusCode;
        const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
        console.log(`[${level}] ${req.method} ${req.url} ${status} ${duration}ms`);
    }

    // === IP Extraction ===
    getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.socket?.remoteAddress ||
               'unknown';
    }

    // === Password Hashing (enhanced) ===
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return { salt, hash, iterations: 100000 };
    }

    verifyPassword(password, stored) {
        const hash = crypto.pbkdf2Sync(password, stored.salt, stored.iterations || 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored.hash));
    }

    // === JWT Enhancement ===
    generateToken(payload, expiresIn = 86400) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64url');
        const jwtSecret = config.JWT_SECRET;
        const signature = crypto.createHmac('sha256', jwtSecret)
            .update(`${header}.${body}`)
            .digest('base64url');
        return `${header}.${body}.${signature}`;
    }

    verifyToken(token) {
        try {
            const [header, body, signature] = token.split('.');
            const jwtSecret = config.JWT_SECRET;
            const expectedSig = crypto.createHmac('sha256', jwtSecret)
                .update(`${header}.${body}`)
                .digest('base64url');
            if (signature !== expectedSig) return null;
            const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
            if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
            return payload;
        } catch { return null; }
    }
}

module.exports = new Security();
