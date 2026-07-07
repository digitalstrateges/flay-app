const security = require('../security');

module.exports = {
  authenticate: (req, res, next) => security.authenticate(req, res, next),
  optionalAuth: (req, res, next) => security.optionalAuth(req, res, next),
  requirePlan: (minPlan) => security.requirePlan(minPlan)
};
