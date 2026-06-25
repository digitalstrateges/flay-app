const { verifyToken } = require('../auth-utils');
const User = require('../models/User');
const config = require('../config');

// Simple in-memory rate limiter
const rateLimitStore = new Map();

function rateLimit(windowMs, max) {
    return (req, res, next) => {
        const key = req.ip + req.path;
        const now = Date.now();
        const windowStart = now - windowMs;

        if (!rateLimitStore.has(key)) rateLimitStore.set(key, []);
        const hits = rateLimitStore.get(key).filter(t => t > windowStart);
        rateLimitStore.set(key, hits);

        if (hits.length >= max) {
            return res.status(429).json({
                message: 'Trop de requetes. Reessayez plus tard.',
                retryAfter: Math.ceil((hits[0] + windowMs - now) / 1000)
            });
        }

        hits.push(now);
        next();
    };
}

function auth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Token manquant.', code: 'NO_TOKEN' });

    const decoded = verifyToken(token, config.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: 'Token invalide ou expire.', code: 'INVALID_TOKEN' });

    req.user = decoded;
    next();
}

function optionalAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
        const decoded = verifyToken(token, config.JWT_SECRET);
        if (decoded) req.user = decoded;
    }
    next();
}

function requirePlan(minPlan) {
    const planOrder = { free: 0, pro: 1, premium: 2 };
    return (req, res, next) => {
        const user = User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur non trouve.' });

        const userPlanLevel = planOrder[user.plan] || 0;
        const requiredLevel = planOrder[minPlan] || 0;

        if (userPlanLevel < requiredLevel) {
            return res.status(403).json({
                message: `Plan ${minPlan} requis.`,
                code: 'PLAN_REQUIRED',
                currentPlan: user.plan,
                requiredPlan: minPlan,
                upgradeUrl: '/pay'
            });
        }

        if (user.plan !== 'free' && user.planExpiry && new Date(user.planExpiry) < new Date()) {
            return res.status(403).json({
                message: 'Plan expire. Renouvelez votre abonnement.',
                code: 'PLAN_EXPIRED',
                upgradeUrl: '/pay'
            });
        }

        next();
    };
}

function validateBody(schema) {
    return (req, res, next) => {
        const errors = [];
        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} est requis`);
                continue;
            }
            if (value !== undefined && value !== null) {
                if (rules.min && value.length < rules.min) errors.push(`${field}: ${rules.min} caracteres minimum`);
                if (rules.max && value.length > rules.max) errors.push(`${field}: ${rules.max} caracteres maximum`);
                if (rules.pattern && !rules.pattern.test(value)) errors.push(`${field}: format invalide`);
            }
        }
        if (errors.length > 0) return res.status(400).json({ message: 'Erreur de validation', errors });
        next();
    };
}

function adminOnly(req, res, next) {
    const user = User.findById(req.user.id);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Acces admin requis.' });
    }
    next();
}

function auditLog(action) {
    return (req, res, next) => {
        const originalSend = res.json.bind(res);
        res.json = (data) => {
            const log = {
                timestamp: new Date().toISOString(),
                action,
                userId: req.user?.id || 'anonymous',
                ip: req.ip,
                method: req.method,
                path: req.path,
                status: res.statusCode,
                success: res.statusCode < 400
            };
            console.log(`[AUDIT] ${log.action} - ${log.userId} - ${log.method} ${log.path} - ${log.status}`);
            return originalSend(data);
        };
        next();
    };
}

module.exports = {
    auth,
    optionalAuth,
    requirePlan,
    adminOnly,
    rateLimit,
    validateBody,
    auditLog
};
