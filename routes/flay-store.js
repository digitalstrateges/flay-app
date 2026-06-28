/**
 * Flay Omni - Flay Store Routes
 * API pour la boutique interne
 */

const express = require('express');
const router = express.Router();
const flayStore = require('../flay-store');
const db = require('../database');
const { authenticate } = require('../middleware');

// Get all store items for current plan
router.get('/items', authenticate, (req, res) => {
    try {
        const userPlan = req.user.plan || 'free';
        const items = flayStore.getItems(userPlan);
        const categories = flayStore.getItemsByCategory(userPlan);
        res.json({ items, categories, plan: userPlan });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get single item
router.get('/item/:itemId', authenticate, (req, res) => {
    try {
        const item = flayStore.getItem(req.params.itemId);
        if (!item) return res.status(404).json({ error: 'Article introuvable' });
        res.json({ item });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Purchase an item
router.post('/purchase', authenticate, (req, res) => {
    try {
        const { itemId, paymentMethod } = req.body;
        const userPlan = req.user.plan || 'free';

        if (userPlan === 'free') {
            return res.status(403).json({ error: 'La Flay Store est reservee aux abonnes payants' });
        }

        const result = flayStore.purchase(req.user.id, userPlan, itemId, paymentMethod || 'wave');
        if (!result.success) return res.status(400).json({ error: result.error });

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Payment callback (Wave/CinetPay)
router.get('/pay/:purchaseId', async (req, res) => {
    try {
        const result = await flayStore.confirmPayment(req.params.purchaseId);
        if (!result.success) return res.status(400).send('Paiement echoue');

        const purchase = result.purchase;
        const item = flayStore.getItem(purchase.itemId);

        // Apply effect to user's plan limits
        if (item && item.effect) {
            const userId = purchase.userId;
            const user = db.query('users', { id: userId })[0] || 
                         require('../db').get('users', userId);
            
            if (user) {
                const currentLimits = JSON.parse(user.planLimits || '{}');
                const effect = item.effect;

                if (effect.field === 'products' || effect.field === 'services' || 
                    effect.field === 'contacts' || effect.field === 'reservations' ||
                    effect.field === 'gallery' || effect.field === 'users' || 
                    effect.field === 'sms' || effect.field === 'emails' || 
                    effect.field === 'aiQueries') {
                    const current = currentLimits[effect.field] || 0;
                    currentLimits[effect.field] = current + effect.added;
                } else if (typeof effect.added === 'string') {
                    currentLimits[effect.field] = effect.added;
                } else if (typeof effect.added === 'boolean') {
                    currentLimits[effect.field] = effect.added;
                }

                // Update in DB
                if (db.db) {
                    db.update('users', userId, { planLimits: JSON.stringify(currentLimits) });
                } else {
                    require('../db').update('users', userId, { planLimits: JSON.stringify(currentLimits) });
                }
            }
        }

        // Redirect to dashboard with success
        res.redirect(`/dashboard.html?purchase=success&item=${encodeURIComponent(purchase.itemName)}`);
    } catch (e) {
        res.status(500).send('Erreur: ' + e.message);
    }
});

// Get user's purchase history
router.get('/purchases', authenticate, (req, res) => {
    try {
        const purchases = flayStore.getUserPurchases(req.user.id);
        res.json({ purchases });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get active boosts
router.get('/boosts', authenticate, (req, res) => {
    try {
        const boosts = flayStore.getActiveBoosts(req.user.id);
        res.json({ boosts, active: boosts.length > 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin: Get store stats
router.get('/admin/stats', authenticate, (req, res) => {
    try {
        // Only admin can access
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Acces refuse' });
        }
        const stats = flayStore.getStats();
        res.json(stats);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
