const express = require('express');
const { authenticate } = require('../lib/auth');
const analyticsEngine = require('../analytics-engine');
const aiAgent = require('../ai-agent');
const router = express.Router();

router.get('/', authenticate, (req, res) => {
    const period = req.query.period || '30d';
    const stats = analyticsEngine.getStats(req.user.id, period);
    const realtime = analyticsEngine.getRealtime(req.user.id);
    const recent = analyticsEngine.getRecentEvents(req.user.id);
    const referrers = analyticsEngine.getReferrers(req.user.id);
    const devices = analyticsEngine.getDeviceBreakdown(req.user.id);
    const hourly = analyticsEngine.getHourlyBreakdown(req.user.id);
    const insights = aiAgent.generateInsights(stats);
    res.json({ stats, realtime, recent, referrers, devices, hourly, insights });
});

router.get('/profile/:slug', (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const db = require('../db');
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const stats = analyticsEngine.getStats(user.id);
    const referrers = analyticsEngine.getReferrers(user.id);
    const hourly = analyticsEngine.getHourlyBreakdown(user.id);
    const insights = aiAgent.generateInsights(stats);
    res.json({ stats, referrers, hourly, insights });
});

module.exports = router;
