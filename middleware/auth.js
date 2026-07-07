const security = require('../security');

module.exports = {
  auth: (req, res, next) => security.authenticate(req, res, next),
  optionalAuth: (req, res, next) => security.optionalAuth(req, res, next),
  adminOnly: (req, res, next) => security.adminOnly(req, res, next),
  requirePlan: (minPlan) => security.requirePlan(minPlan),
  rateLimit: (windowMs, max) => security.rateLimitMiddleware(windowMs, max),
  validateBody: (schema) => security.bodyValidator(schema),
  auditLog: (action) => (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = (...args) => {
      console.log(`[AUDIT] ${action} - ${req.userId || 'anonymous'} - ${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`);
      return originalEnd(...args);
    };
    next();
  }
};
