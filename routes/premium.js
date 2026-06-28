/**
 * Flay Premium API Routes
 * Pro, Premium, Dorée features
 */

const express = require('express');
const router = express.Router();
const premiumFeatures = require('../premium-features');
const demoSetup = require('../demo-setup');
const db = require('../db');

// Auth middleware with demo bypass
function auth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    req.userId = payload.userId;
    req.user = db.get('users', payload.userId);
    req.isDemo = demoSetup.isDemo(payload.userId);
    next();
}

// Feature check middleware
function requireFeature(feature) {
    return (req, res, next) => {
        if (req.isDemo || premiumFeatures.hasFeature(req.userId, feature)) {
            return next();
        }
        res.status(403).json({ error: `Feature '${feature}' requires a paid plan` });
    };
}

// === PLAN INFO ===

router.get('/plan', auth, (req, res) => {
    const plan = req.user?.plan || 'free';
    const features = premiumFeatures.getPlanFeatures(plan);
    res.json({
        plan,
        features,
        isDemo: req.isDemo,
        limits: {
            themes: features.themes,
            services: features.services,
            reservations: features.reservations,
            contacts: features.contacts,
            products: features.products,
            storage: features.storage,
            aiCredits: features.aiCredits
        }
    });
});

// === PRO: ADVANCED ANALYTICS ===

router.get('/analytics/advanced', auth, requireFeature('analytics'), (req, res) => {
    const { period } = req.query;
    const analytics = premiumFeatures.getAdvancedAnalytics(req.userId, period || '30d');
    res.json(analytics);
});

router.get('/analytics/hourly', auth, requireFeature('analytics'), (req, res) => {
    const analytics = premiumFeatures.getAdvancedAnalytics(req.userId, '7d');
    res.json({ hourly: analytics.byHour });
});

router.get('/analytics/referrers', auth, requireFeature('analytics'), (req, res) => {
    const analytics = premiumFeatures.getAdvancedAnalytics(req.userId, '30d');
    res.json({ referrers: analytics.topReferrers });
});

router.get('/analytics/devices', auth, requireFeature('analytics'), (req, res) => {
    const analytics = premiumFeatures.getAdvancedAnalytics(req.userId, '30d');
    res.json({ devices: analytics.devices });
});

// === PREMIUM: LOYALTY ===

router.get('/loyalty', auth, requireFeature('loyalty'), (req, res) => {
    const loyalty = premiumFeatures.getLoyaltyPoints(req.userId);
    res.json(loyalty);
});

// === PREMIUM: SEO ===

router.get('/seo/analyze', auth, requireFeature('seo'), (req, res) => {
    const analysis = premiumFeatures.analyzeSEO(req.userId);
    res.json(analysis);
});

// === PREMIUM: ABANDONED CARTS ===

router.get('/carts/abandoned', auth, requireFeature('abandonedCart'), (req, res) => {
    const carts = premiumFeatures.getAbandonedCarts(req.userId);
    res.json({ carts, count: carts.length });
});

router.post('/carts/:cartId/recover', auth, requireFeature('abandonedCart'), (req, res) => {
    const result = premiumFeatures.sendCartRecoveryEmail(req.userId, req.params.cartId);
    res.json(result);
});

// === DOREE: TEAM MANAGEMENT ===

router.get('/team', auth, requireFeature('multiUser'), (req, res) => {
    const team = premiumFeatures.getTeamMembers(req.userId);
    res.json(team);
});

router.post('/team/invite', auth, requireFeature('multiUser'), (req, res) => {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    
    const team = premiumFeatures.getTeamMembers(req.userId);
    if (team.error) return res.status(403).json({ error: team.error });
    
    if (team.members.length >= team.maxMembers) {
        return res.status(400).json({ error: `Maximum ${team.maxMembers} team members` });
    }
    
    const member = {
        id: 'team_' + Date.now(),
        ownerId: req.userId,
        email,
        role: role || 'viewer',
        status: 'pending',
        invitedAt: new Date().toISOString()
    };
    
    db.insert('team_members', member);
    res.json(member);
});

// === DOREE: WHITE LABEL ===

router.post('/white-label/report', auth, requireFeature('whiteLabel'), (req, res) => {
    const report = premiumFeatures.generateWhiteLabelReport(req.userId, req.body);
    res.json(report);
});

// === COUPONS ===

router.post('/coupons', auth, requireFeature('coupons'), (req, res) => {
    try {
        const coupon = premiumFeatures.createAdvancedCoupon(req.userId, req.body);
        res.json(coupon);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/coupons', auth, requireFeature('coupons'), (req, res) => {
    const coupons = db.findBy('coupons', 'userId', req.userId) || [];
    res.json(coupons);
});

router.post('/coupons/validate', auth, (req, res) => {
    const { code, cartTotal } = req.body;
    const coupons = db.findBy('coupons', 'userId', req.userId) || [];
    const coupon = coupons.find(c => c.code === code && c.active);
    
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    
    const now = new Date();
    if (coupon.validUntil && new Date(coupon.validUntil) < now) return res.status(400).json({ error: 'Coupon expired' });
    if (coupon.valid_from && new Date(coupon.valid_from) > now) return res.status(400).json({ error: 'Coupon not yet valid' });
    if (coupon.validFrom && new Date(coupon.validFrom) > now) return res.status(400).json({ error: 'Coupon not yet valid' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    if (cartTotal < coupon.minPurchase) {
        return res.status(400).json({ error: `Minimum purchase: ${coupon.minPurchase} FCFA` });
    }
    
    let discount = 0;
    if (coupon.type === 'percentage') discount = Math.round(cartTotal * coupon.value / 100);
    else if (coupon.type === 'fixed') discount = coupon.value;
    
    res.json({ valid: true, discount, coupon });
});

// === FEATURE GATING CHECK ===

router.get('/check/:feature', auth, (req, res) => {
    const hasAccess = req.isDemo || premiumFeatures.hasFeature(req.userId, req.params.feature);
    res.json({ feature: req.params.feature, hasAccess, isDemo: req.isDemo });
});

// === DASHBOARD STATS ===

router.get('/dashboard', auth, (req, res) => {
    const plan = req.user?.plan || 'free';
    const features = premiumFeatures.getPlanFeatures(plan);
    
    // Get real data
    const products = db.findBy('products', 'userId', req.userId) || [];
    const orders = db.findBy('orders', 'userId', req.userId) || [];
    const reservations = db.findBy('reservations', 'userId', req.userId) || [];
    const invoices = db.findBy('invoices', 'userId', req.userId) || [];
    const contacts = db.findBy('contacts', 'userId', req.userId) || [];
    
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.total || 0), 0);
    const pendingReservations = reservations.filter(r => r.status === 'pending').length;
    const lowStock = products.filter(p => (p.stock || 0) <= 5 && p.trackInventory).length;
    
    res.json({
        plan,
        features: Object.keys(features).filter(k => features[k] === true || features[k] > 0 || features[k] === -1),
        stats: {
            products: products.length,
            orders: orders.length,
            revenue: totalRevenue,
            reservations: reservations.length,
            pendingReservations,
            contacts: contacts.length,
            invoices: invoices.length,
            lowStock,
            currency: 'XOF'
        }
    });
});

module.exports = router;
