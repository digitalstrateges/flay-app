const crypto = require('crypto');
const config = require('./config');

class Security {
  constructor() {
    this.rateLimits = new Map();
    this.blockedIPs = new Set();
    this.CSRF_TOKENS = new Map();
    this._tokenBlacklist = new Set();
    this._cleanupInterval = setInterval(() => this._cleanup(), 300000);
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, hits] of this.rateLimits) {
      const valid = hits.filter(t => t > now - 3600000);
      if (valid.length === 0) this.rateLimits.delete(key);
      else this.rateLimits.set(key, valid);
    }
    for (const ip of this.blockedIPs) {
      const blocks = this.rateLimits.get(`blocks:${ip}`) || [];
      if (blocks.length === 0 || blocks[blocks.length - 1] < now - 3600000) {
        this.blockedIPs.delete(ip);
      }
    }
    for (const [token, time] of this.CSRF_TOKENS) {
      if (now - time > 3600000) this.CSRF_TOKENS.delete(token);
    }
    for (const jti of this._tokenBlacklist) {
      if (jti.exp < now) this._tokenBlacklist.delete(jti);
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this.rateLimits.clear();
    this.blockedIPs.clear();
    this.CSRF_TOKENS.clear();
    this._tokenBlacklist.clear();
  }

  // ─── PASSWORD ───────────────────────────────────────────────

  hashPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { salt, hash, iterations: 100000 };
  }

  verifyPassword(password, stored) {
    if (!password || !stored || !stored.salt || !stored.hash) return false;
    const iterations = stored.iterations || 100000;
    const hash = crypto.pbkdf2Sync(password, stored.salt, iterations, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(stored.hash));
    } catch {
      return false;
    }
  }

  // Backward compat: old format stored hash as separate field, salt as separate field
  verifyPasswordCompat(password, hashField, saltField) {
    if (!password) return false;
    if (saltField && typeof hashField === 'string') {
      return this.verifyPassword(password, { salt: saltField, hash: hashField, iterations: 10000 });
    }
    if (typeof hashField === 'string' && hashField.includes(':')) {
      const [s, h] = hashField.split(':');
      return this.verifyPassword(password, { salt: s, hash: h, iterations: 10000 });
    }
    if (typeof hashField === 'object' && hashField !== null) {
      return this.verifyPassword(password, hashField);
    }
    return false;
  }

  hashPasswordCompat(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash: salt + ':' + hash, salt };
  }

  // ─── JWT ────────────────────────────────────────────────────

  generateToken(payload, expiresIn = 3600) {
    const jwtSecret = config.JWT_SECRET;
    const jti = crypto.randomBytes(16).toString('hex');
    const now = Math.floor(Date.now() / 1000);
    const body = Buffer.from(JSON.stringify({
      ...payload,
      jti,
      iat: now,
      exp: now + expiresIn
    })).toString('base64url');
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
    return { token: `${header}.${body}.${signature}`, jti, exp: now + expiresIn };
  }

  verifyToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [header, body, signature] = parts;
      const jwtSecret = config.JWT_SECRET;
      const expected = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
      if (signature !== expected) return null;
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
      if (payload.jti && this._tokenBlacklist.has(payload.jti)) return null;
      return payload;
    } catch {
      return null;
    }
  }

  revokeToken(token) {
    const payload = this.verifyToken(token);
    if (payload && payload.jti && payload.exp) {
      this._tokenBlacklist.add({ jti: payload.jti, exp: payload.exp * 1000 });
    }
  }

  generateTokens(userId) {
    const access = this.generateToken({ userId, type: 'access' }, 3600);
    const refresh = this.generateToken({ userId, type: 'refresh' }, 30 * 86400);
    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresIn: 3600,
      accessJti: access.jti,
      refreshJti: refresh.jti
    };
  }

  // ─── RATE LIMIT ─────────────────────────────────────────────

  checkRateLimit(key, windowMs, max) {
    if (this.isBlocked(key)) return false;
    const now = Date.now();
    if (!this.rateLimits.has(key)) this.rateLimits.set(key, []);
    const hits = this.rateLimits.get(key).filter(t => t > now - windowMs);
    this.rateLimits.set(key, hits);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
  }

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

  // ─── CSRF ──────────────────────────────────────────────────

  generateCSRF() {
    const token = crypto.randomBytes(32).toString('hex');
    this.CSRF_TOKENS.set(token, Date.now());
    return token;
  }

  validateCSRF(token) {
    if (!token || !this.CSRF_TOKENS.has(token)) return false;
    const time = this.CSRF_TOKENS.get(token);
    this.CSRF_TOKENS.delete(token);
    return Date.now() - time < 3600000;
  }

  csrfMiddleware(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const token = req.headers['x-csrf-token'] || req.body?._csrf;
    if (!this.validateCSRF(token)) {
      return res.status(403).json({ error: 'CSRF token invalide ou expire', code: 'CSRF_INVALID' });
    }
    next();
  }

  // ─── INPUT VALIDATION ──────────────────────────────────────

  validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePassword(password) {
    const errors = [];
    if (!password || password.length < 8) errors.push('8 caracteres minimum');
    if (password && !/[A-Z]/.test(password)) errors.push('1 majuscule minimum');
    if (password && !/[0-9]/.test(password)) errors.push('1 chiffre minimum');
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
      .substring(0, 10000);
  }

  sanitizeObj(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') out[k] = this.sanitize(v);
      else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = this.sanitizeObj(v);
      else if (Array.isArray(v)) out[k] = v.map(i => typeof i === 'string' ? this.sanitize(i) : i);
      else out[k] = v;
    }
    return out;
  }

  bodyValidator(schema) {
    return (req, res, next) => {
      const errors = [];
      for (const [field, rules] of Object.entries(schema)) {
        const value = req.body[field];
        if (rules.required && (value === undefined || value === null || value === '')) {
          errors.push(`${field} requis`);
          continue;
        }
        if (value !== undefined && value !== null) {
          if (rules.minLength && String(value).length < rules.minLength) errors.push(`${field}: ${rules.minLength} car. min`);
          if (rules.maxLength && String(value).length > rules.maxLength) errors.push(`${field}: ${rules.maxLength} car. max`);
          if (rules.pattern && !rules.pattern.test(String(value))) errors.push(`${field}: format invalide`);
          if (rules.type === 'email' && !this.validateEmail(value)) errors.push(`${field}: email invalide`);
        }
      }
      if (errors.length > 0) return res.status(400).json({ error: 'Validation echouee', details: errors });
      req.body = this.sanitizeObj(req.body);
      next();
    };
  }

  // ─── SECURITY HEADERS ──────────────────────────────────────

  setHeaders(res, isAPI = false) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
    res.setHeader('X-Powered-By', 'Flay');
    if (isAPI) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
  }

  // ─── IP ─────────────────────────────────────────────────────

  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || 'unknown';
  }

  // ─── AUDIT LOG ──────────────────────────────────────────────

  logRequest(req, res, startTime) {
    const duration = Date.now() - startTime;
    console.log(`[${res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO'}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  }

  // ─── AUTH MIDDLEWARE ────────────────────────────────────────

  authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant', code: 'NO_TOKEN' });
    const payload = this.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide ou expire', code: 'INVALID_TOKEN' });
    const db = require('./db');
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur introuvable', code: 'USER_NOT_FOUND' });
    if (user.plan !== 'free' && user.planExpiry && new Date(user.planExpiry) < new Date()) {
      return res.status(403).json({ error: 'Abonnement expire', code: 'PLAN_EXPIRED' });
    }
    req.user = user;
    req.userId = payload.userId;
    req.token = token;
    next();
  }

  optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const payload = this.verifyToken(token);
      if (payload) {
        const db = require('./db');
        const user = db.get('users', payload.userId);
        if (user) {
          req.user = user;
          req.userId = payload.userId;
          req.token = token;
        }
      }
    }
    next();
  }

  requirePlan(minPlan) {
    const planOrder = { free: 0, pro: 1, premium: 2, doree: 3 };
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ error: 'Authentification requise', code: 'NO_AUTH' });
      const level = planOrder[req.user.plan] ?? 0;
      const required = planOrder[minPlan] ?? 0;
      if (level < required) {
        return res.status(403).json({
          error: `Plan ${minPlan} requis`, code: 'PLAN_REQUIRED',
          currentPlan: req.user.plan, requiredPlan: minPlan
        });
      }
      next();
    };
  }

  adminOnly(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Acces admin requis', code: 'ADMIN_REQUIRED' });
    }
    next();
  }

  rateLimitMiddleware(windowMs, max) {
    return (req, res, next) => {
      const ip = this.getClientIP(req);
      if (this.isBlocked(ip)) {
        return res.status(429).json({ error: 'IP bloquee pour cause d\'activite suspecte', code: 'IP_BLOCKED' });
      }
      const key = `${req.path}:${ip}`;
      if (!this.checkRateLimit(key, windowMs, max)) {
        return res.status(429).json({ error: 'Trop de requetes', retryAfter: Math.ceil(windowMs / 1000), code: 'RATE_LIMITED' });
      }
      next();
    };
  }

  // ─── UTILITIES ──────────────────────────────────────────────

  genId() { return crypto.randomUUID(); }
  generateQRCode(text) { return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`; }
  generateShareLink(username, baseUrl) { return `${baseUrl}/p/${username}`; }
  generateInvoiceId() { return `FLY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`; }
  slugify(text) {
    return String(text).toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = new Security();
