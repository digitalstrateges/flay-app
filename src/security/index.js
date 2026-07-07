class Security {
  constructor() {
    this.rateLimitStore = new Map();
  }

  rateLimit(windowMs = 60000, max = 100) {
    return (req, res, next) => {
      const key = `${req.ip}:${req.path}`;
      const now = Date.now();
      if (!this.rateLimitStore.has(key)) this.rateLimitStore.set(key, []);
      const hits = this.rateLimitStore.get(key).filter(t => t > now - windowMs);
      this.rateLimitStore.set(key, hits);
      if (hits.length >= max) {
        res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        return res.status(429).json({ error: 'Trop de requetes', retryAfter: Math.ceil(windowMs / 1000), code: 'RATE_LIMITED' });
      }
      hits.push(now);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - hits.length - 1);
      next();
    };
  }

  securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  }

  cors(options = {}) {
    const { origin = '*', methods = 'GET,POST,PUT,DELETE,PATCH,OPTIONS', headers = 'Content-Type,Authorization,X-CSRF-Token,X-Requested-With', credentials = false, maxAge = 86400 } = options;
    return (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', methods);
      res.setHeader('Access-Control-Allow-Headers', headers);
      if (credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', maxAge);
      if (req.method === 'OPTIONS') return res.status(204).end();
      next();
    };
  }

  csrfTokens = new Map();

  generateCSRF() {
    const token = require('crypto').randomBytes(32).toString('hex');
    this.csrfTokens.set(token, Date.now());
    return token;
  }

  validateCSRF(req, res, next) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const token = req.headers['x-csrf-token'];
      if (!token || !this.csrfTokens.has(token)) {
        return res.status(403).json({ error: 'CSRF token invalide', code: 'CSRF_INVALID' });
      }
      const time = this.csrfTokens.get(token);
      this.csrfTokens.delete(token);
      if (Date.now() - time > 3600000) {
        return res.status(403).json({ error: 'CSRF token expire', code: 'CSRF_EXPIRED' });
      }
    }
    next();
  }

  sanitize(obj) {
    if (typeof obj === 'string') return obj.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);
    if (Array.isArray(obj)) return obj.map(i => this.sanitize(i));
    if (obj && typeof obj === 'object') { const r = {}; for (const [k, v] of Object.entries(obj)) r[k] = this.sanitize(v); return r; }
    return obj;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, hits] of this.rateLimitStore) {
      const valid = hits.filter(t => t > now - 3600000);
      if (valid.length === 0) this.rateLimitStore.delete(key);
      else this.rateLimitStore.set(key, valid);
    }
  }
}

module.exports = new Security();
