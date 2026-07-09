const express = require('express');
const db = require('../db');
const config = require('../config');
const router = express.Router();

router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const users = db.getAll('users') || [];
    const profiles = db.getAll('profiles') || [];

    const entries = users
        .filter(u => u.plan && u.plan !== 'free' && u.planExpiry && new Date(u.planExpiry) > new Date())
        .map(u => {
            const profile = profiles.find(p => p.userId === u.id);
            const payments = db.findAll('payments', 'userId', u.id) || [];
            const confirmed = payments.filter(p => p.status === 'confirmed');
            const totalRevenue = confirmed.reduce((s, p) => s + (p.amount || 0), 0);
            const products = db.findAll('products', 'userId', u.id) || [];
            const orders = db.findAll('orders', 'userId', u.id) || [];

            const orderAmounts = orders
                .filter(o => o.status === 'delivered' || o.status === 'confirmed')
                .reduce((s, o) => s + (o.total || 0), 0);

            const mrr = Math.round(Math.max(totalRevenue, orderAmounts) / 3);
            const momGrowth = 0;

            return {
                id: u.id,
                name: u.name || 'Anonyme',
                username: u.username || '',
                slug: profile?.slug || u.username || '',
                avatar: profile?.avatar || '',
                bio: profile?.bio || '',
                plan: u.plan,
                mrr,
                totalRevenue: Math.max(totalRevenue, orderAmounts),
                productsCount: products.length,
                ordersCount: orders.filter(o => o.status === 'delivered' || o.status === 'confirmed').length,
                momGrowth: momGrowth || 0,
                planLabel: config.PLANS[u.plan]?.name || u.plan
            };
        })
        .sort((a, b) => b.mrr - a.mrr);

    const total = entries.length;
    const paginated = entries.slice((page - 1) * limit, page * limit);

    res.json({
        leaderboard: paginated,
        total,
        page,
        pages: Math.ceil(total / limit),
        totalMRR: entries.reduce((s, e) => s + e.mrr, 0),
        totalRevenue: entries.reduce((s, e) => s + e.totalRevenue, 0),
        topPlans: Object.entries(
            entries.reduce((acc, e) => {
                acc[e.plan] = (acc[e.plan] || 0) + 1;
                return acc;
            }, {})
        ).sort((a, b) => b[1] - a[1])
    });
});

router.get('/stats', (req, res) => {
    const users = db.getAll('users') || [];
    const profiles = db.getAll('profiles') || [];
    const paid = users.filter(u => u.plan && u.plan !== 'free' && u.planExpiry && new Date(u.planExpiry) > new Date());
    const totalRevenue = (db.getAll('payments') || [])
        .filter(p => p.status === 'confirmed')
        .reduce((s, p) => s + (p.amount || 0), 0);

    res.json({
        totalUsers: users.length,
        paidUsers: paid.length,
        totalRevenue,
        conversionRate: users.length > 0 ? Math.round((paid.length / users.length) * 100) : 0,
        avgRevenue: paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0
    });
});

router.get('/:id', (req, res) => {
    const user = db.get('users', req.params.id);
    if (!user) return res.status(404).json({ error: 'Non trouve' });
    const profile = db.findBy('profiles', 'userId', user.id);
    const payments = db.findAll('payments', 'userId', user.id) || [];
    const confirmed = payments.filter(p => p.status === 'confirmed');
    const totalRevenue = confirmed.reduce((s, p) => s + (p.amount || 0), 0);
    const products = db.findAll('products', 'userId', user.id) || [];
    const orders = db.findAll('orders', 'userId', user.id) || [];
    const orderAmounts = orders.filter(o => o.status === 'delivered' || o.status === 'confirmed').reduce((s, o) => s + (o.total || 0), 0);
    const mrr = Math.round(Math.max(totalRevenue, orderAmounts) / 3);

    res.json({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: profile?.bio || '',
        avatar: profile?.avatar || '',
        slug: profile?.slug || '',
        plan: user.plan,
        planLabel: config.PLANS[user.plan]?.name || user.plan,
        planExpiry: user.planExpiry,
        mrr,
        totalRevenue: Math.max(totalRevenue, orderAmounts),
        productsCount: products.length,
        ordersCount: orders.filter(o => o.status === 'delivered' || o.status === 'confirmed').length,
        paymentHistory: confirmed.slice(0, 12).map(p => ({
            date: p.confirmedAt || p.createdAt,
            amount: p.amount,
            plan: p.plan
        }))
    });
});

module.exports = router;
