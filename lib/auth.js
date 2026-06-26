const authUtils = require('../auth-utils');
const db = require('../db');

function authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide ou expire' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouve' });
    req.user = user;
    next();
}

function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const payload = authUtils.verifyToken(token);
        if (payload) {
            const user = db.get('users', payload.userId);
            if (user) req.user = user;
        }
    }
    next();
}

function requirePlan(minPlan) {
    const planOrder = { free: 0, pro: 1, premium: 2, doree: 3 };
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentification requise' });
        const level = planOrder[req.user.plan] || 0;
        if (level < planOrder[minPlan]) {
            return res.status(403).json({ error: `Plan ${minPlan} requis`, code: 'PLAN_REQUIRED', currentPlan: req.user.plan, requiredPlan: minPlan });
        }
        next();
    };
}

module.exports = { authenticate, optionalAuth, requirePlan };
