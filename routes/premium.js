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

router.post('/loyalty/redeem', auth, requireFeature('loyalty'), (req, res) => {
    const { rewardId, points } = req.body;
    const loyalty = premiumFeatures.getLoyaltyPoints(req.userId);
    if (loyalty.error) return res.status(403).json({ error: loyalty.error });
    const reward = loyalty.rewards?.find(r => r.points === parseInt(points));
    if (!reward) return res.status(400).json({ error: 'Reward not found' });
    if (loyalty.points < reward.cost) return res.status(400).json({ error: 'Not enough points', current: loyalty.points, required: reward.cost });
    const user = db.get('users', req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const loyaltyRecord = {
        id: 'loyalty_' + Date.now() + '_' + require('crypto').randomBytes(4).toString('hex'),
        userId: req.userId,
        type: 'redeem',
        points: -reward.cost,
        reward: reward.name,
        createdAt: new Date().toISOString()
    };
    db.insert('loyalty_history', loyaltyRecord);
    res.json({ success: true, redeemed: reward.name, pointsSpent: reward.cost, remaining: loyalty.points - reward.cost });
});

router.post('/loyalty/add', auth, requireFeature('loyalty'), (req, res) => {
    const { points, reason } = req.body;
    if (!points || points <= 0) return res.status(400).json({ error: 'Invalid points' });
    const loyaltyRecord = {
        id: 'loyalty_' + Date.now() + '_' + require('crypto').randomBytes(4).toString('hex'),
        userId: req.userId,
        type: 'earn',
        points: parseInt(points),
        reason: reason || 'bonus',
        createdAt: new Date().toISOString()
    };
    db.insert('loyalty_history', loyaltyRecord);
    res.json({ success: true, added: points });
});

// === PREMIUM: SEO ===

router.get('/seo/analyze', auth, requireFeature('seo'), (req, res) => {
    const analysis = premiumFeatures.analyzeSEO(req.userId);
    res.json(analysis);
});

router.get('/seo', auth, requireFeature('seo'), (req, res) => {
    const analysis = premiumFeatures.analyzeSEO(req.userId);
    res.json(analysis);
});

router.post('/seo/analyze', auth, requireFeature('seo'), (req, res) => {
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
    
    if (team.maxMembers !== -1 && team.members.length >= team.maxMembers) {
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

router.delete('/team/:id', auth, requireFeature('multiUser'), (req, res) => {
    const member = db.get('team_members', req.params.id);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.ownerId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    db.delete('team_members', req.params.id);
    res.json({ success: true, message: 'Member removed' });
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
    const coupons = db.findAll('coupons', 'userId', req.userId) || [];
    res.json(coupons);
});

router.post('/coupons/validate', auth, (req, res) => {
    const { code, cartTotal } = req.body;
    const coupons = db.findAll('coupons', 'userId', req.userId) || [];
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

// === USAGE STATS (for conversion prompts) ===

router.get('/usage', auth, (req, res) => {
    const plan = req.user?.plan || 'free';
    const features = premiumFeatures.getPlanFeatures(plan);
    const usage = {
        plan,
        features: {},
        limits: {}
    };

    const counts = {
        products: db.count('products', { userId: req.userId }),
        contacts: db.count('contacts', { userId: req.userId }),
        invoices: db.count('invoices', { userId: req.userId }),
        reservations: db.count('reservations', { userId: req.userId })
    };

    for (const [key, limit] of Object.entries(features)) {
        if (typeof limit === 'number' && limit !== -1 && limit !== true && limit !== false) {
            const current = counts[key] || 0;
            usage.features[key] = { current, limit, percentage: Math.round((current / limit) * 100), remaining: Math.max(0, limit - current) };
            usage.limits[key] = limit;
        }
    }

    usage.hasCustomDomain = !!features.customDomain;
    usage.hasWhiteLabel = !!features.whiteLabel;
    usage.hasAI = features.aiCredits !== 0;
    usage.hasLoyalty = !!features.loyalty;
    usage.hasExport = !!features.export;

    res.json(usage);
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
    const products = db.findAll('products', 'userId', req.userId) || [];
    const orders = db.findAll('orders', 'userId', req.userId) || [];
    const reservations = db.findAll('reservations', 'userId', req.userId) || [];
    const invoices = db.findAll('invoices', 'userId', req.userId) || [];
    const contacts = db.findAll('contacts', 'userId', req.userId) || [];
    
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
