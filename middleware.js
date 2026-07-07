/**
 * Flay Super App v1.01 - Middleware System
 * Rate limiting, auth, validation, CORS, logging
 */

const crypto = require('crypto');

class Middleware {
    constructor() {
        this.rateLimits = new Map();
        this.blockedIPs = new Set();
        this.middlewares = [];
    }

    // === Rate Limiting ===
    rateLimit(windowMs = 60000, max = 100) {
        return (req, res, next) => {
            const ip = this.getClientIP(req);
            const key = `rl:${ip}:${req.url}`;
            const now = Date.now();

            if (!this.rateLimits.has(key)) this.rateLimits.set(key, []);
            const hits = this.rateLimits.get(key).filter(t => t > now - windowMs);
            this.rateLimits.set(key, hits);

            if (hits.length >= max) {
                res.writeHead(429, {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.ceil(windowMs / 1000)
                });
                res.end(JSON.stringify({
                    error: 'Trop de requetes',
                    retryAfter: Math.ceil(windowMs / 1000)
                }));
                return;
            }

            hits.push(now);
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', max - hits.length);
            res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
            next();
        };
    }

    // Strict rate limit for auth
    authRateLimit() {
        return this.rateLimit(900000, 10); // 10 attempts per 15 min
    }

    // === Authentication ===
    authenticate(db, authUtils) {
        return (req, res, next) => {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token manquant' }));
                return;
            }

            const payload = authUtils.verifyToken(token);
            if (!payload) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token invalide ou expire' }));
                return;
            }

            const user = db.get('users', payload.userId);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Utilisateur non trouve' }));
                return;
            }

            req.user = user;
            req.userId = user.id;
            next();
        };
    }

    // Optional auth (doesn't fail if no token)
    optionalAuth(db, authUtils) {
        return (req, res, next) => {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                const payload = authUtils.verifyToken(token);
                if (payload) {
                    req.user = db.get('users', payload.userId);
                    req.userId = payload.userId;
                }
            }
            next();
        };
    }

    // === Authorization ===
    requireRole(...roles) {
        return (req, res, next) => {
            if (!req.user || !roles.includes(req.user.role)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Acces interdit' }));
                return;
            }
            next();
        };
    }

    requirePlan(...plans) {
        return (req, res, next) => {
            if (!req.user || !plans.includes(req.user.plan)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Plan insuffisant. Mis a jour vers Pro ou Premium.' }));
                return;
            }
            next();
        };
    }

    // === CORS ===
    cors(options = {}) {
        const {
            origin = '*',
            methods = 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
            headers = 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With',
            credentials = false,
            maxAge = 86400
        } = options;

        return (req, res, next) => {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', methods);
            res.setHeader('Access-Control-Allow-Headers', headers);
            if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Max-Age', maxAge);

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }
            next();
        };
    }

    // === Security Headers ===
    securityHeaders() {
        return (req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');

            if (req.url?.startsWith('/api/')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            } else {
                res.setHeader('Cache-Control', 'public, max-age=3600');
            }
            next();
        };
    }

    // === Request Parsing ===
    parseBody(maxSize = 1048576) { // 1MB default
        return (req, res, next) => {
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                let body = '';
                let size = 0;

                req.on('data', chunk => {
                    size += chunk.length;
                    if (size > maxSize) {
                        res.writeHead(413, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Corps de requete trop volumineux' }));
                        req.destroy();
                        return;
                    }
                    body += chunk.toString();
                });

                req.on('end', () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                        next();
                    } catch (e) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'JSON invalide' }));
                    }
                });
            } else {
                req.body = {};
                next();
            }
        };
    }

    // === Validation ===
    validate(validatorFn) {
        return (req, res, next) => {
            const validator = require('./validator');
            validatorFn(validator, req.body);

            if (!validator.isValid()) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Donnees invalides',
                    details: validator.getErrors()
                }));
                return;
            }
            next();
        };
    }

    // === Logging ===
    logger() {
        return (req, res, next) => {
            const start = Date.now();
            const originalEnd = res.end;

            res.end = function (...args) {
                const duration = Date.now() - start;
                const status = res.statusCode;
                const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
                const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '-';
                console.log(`[${level}] ${req.method} ${req.url} ${status} ${duration}ms ${ip}`);
                originalEnd.apply(res, args);
            };
            next();
        };
    }

    // === Error Handler ===
    errorHandler() {
        return (err, req, res, next) => {
            console.error('[ERROR]', err.message, err.stack);
            res.writeHead(err.status || 500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: process.env.NODE_ENV === 'production' ? 'Erreur interne' : err.message
            }));
        };
    }

    // === CSRF ===
    csrfProtection() {
        const tokens = new Map();

        return {
            generate: (req, res) => {
                const token = crypto.randomBytes(32).toString('hex');
                tokens.set(token, Date.now());
                res.setHeader('X-CSRF-Token', token);
                return token;
            },
            validate: (req, res, next) => {
                if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                    const token = req.headers['x-csrf-token'];
                    if (!token || !tokens.has(token)) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'CSRF token invalide' }));
                        return;
                    }
                    const time = tokens.get(token);
                    tokens.delete(token); // One-time use
                    if (Date.now() - time > 3600000) {
                        res.writeHead(403, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'CSRF token expire' }));
                        return;
                    }
                }
                next();
            }
        };
    }

    // === Helpers ===
    getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.socket?.remoteAddress ||
               'unknown';
    }

    // Cleanup old rate limits every 10 min
    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, hits] of this.rateLimits) {
                const valid = hits.filter(t => t > now - 3600000);
                if (valid.length === 0) this.rateLimits.delete(key);
                else this.rateLimits.set(key, valid);
            }
        }, 600000);
    }
}

module.exports = new Middleware();
