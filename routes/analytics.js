/**
 * Flay Omni - Analytics Tracking Routes
 * Server-side event tracking
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate } = require('../lib/auth');

// Get analytics for current user (dashboard root route)
router.get('/', authenticate, (req, res) => {
    try {
        const period = req.query.period || '30d';
        const days = parseInt(period) || 30;
        const analytics = db.getAnalytics(req.userId, days);
        res.json(analytics);
    } catch (e) {
        res.json({ stats: { totalViews: 0, totalClicks: 0, totalReservations: 0, totalShares: 0 }, daily: [], topPages: [], referrers: [] });
    }
});

// Track event (beacon from client)
router.post('/track', (req, res) => {
    try {
        const data = req.body;
        if (!data.event_type) return res.status(400).json({ error: 'event_type required' });

        db.trackEvent(data.user_id || 'anonymous', data.event_type, {
            page: data.page || '',
            referrer: data.referrer || '',
            device: data.device || '',
            browser: data.browser || '',
            os: data.os || '',
            session_id: data.session_id || ''
        });

        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Track custom event (API)
router.post('/event', (req, res) => {
    try {
        const { user_id, event_type, event_data } = req.body;
        if (!user_id || !event_type) return res.status(400).json({ error: 'user_id and event_type required' });

        db.trackEvent(user_id, event_type, event_data || {});
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get analytics summary
router.get('/summary/:userId', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const analytics = db.getAnalytics(req.params.userId, days);
        res.json(analytics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get page views (for chart)
router.get('/pageviews/:userId', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const events = db.query('analytics_events', { user_id: req.params.userId }, 50000);
        const pageViews = events.filter(e => e.event_type === 'page_view' && e.created_at >= since);

        // Group by day
        const byDay = {};
        pageViews.forEach(e => {
            const day = e.created_at.substring(0, 10);
            if (!byDay[day]) byDay[day] = 0;
            byDay[day]++;
        });

        // Fill missing days
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000).toISOString().substring(0, 10);
            result.push({ date: d, views: byDay[d] || 0 });
        }

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get top pages
router.get('/top-pages/:userId', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const events = db.query('analytics_events', { user_id: req.params.userId }, 50000);
        const pageViews = events.filter(e => e.event_type === 'page_view' && e.created_at >= since);

        const pages = {};
        pageViews.forEach(e => {
            const page = e.page || '/';
            if (!pages[page]) pages[page] = { views: 0, unique: new Set() };
            pages[page].views++;
            if (e.session_id) pages[page].unique.add(e.session_id);
        });

        const result = Object.entries(pages)
            .map(([page, data]) => ({ page, views: data.views, unique: data.unique.size }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 20);

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get referrers
router.get('/referrers/:userId', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const events = db.query('analytics_events', { user_id: req.params.userId }, 50000);
        const filtered = events.filter(e => e.created_at >= since && e.referrer);

        const refs = {};
        filtered.forEach(e => {
            const ref = e.referrer || 'direct';
            if (!refs[ref]) refs[ref] = 0;
            refs[ref]++;
        });

        const result = Object.entries(refs)
            .map(([referrer, count]) => ({ referrer, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Get devices/browsers
router.get('/devices/:userId', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const since = new Date(Date.now() - days * 86400000).toISOString();
        const events = db.query('analytics_events', { user_id: req.params.userId }, 50000);
        const filtered = events.filter(e => e.created_at >= since);

        const devices = {}, browsers = {}, osList = {};
        filtered.forEach(e => {
            if (e.device) { if (!devices[e.device]) devices[e.device] = 0; devices[e.device]++; }
            if (e.browser) { if (!browsers[e.browser]) browsers[e.browser] = 0; browsers[e.browser]++; }
            if (e.os) { if (!osList[e.os]) osList[e.os] = 0; osList[e.os]++; }
        });

        res.json({ devices, browsers, operatingSystems: osList });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
