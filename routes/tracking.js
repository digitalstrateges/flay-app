const express = require('express');
const { authenticate } = require('../lib/auth');
const visitorTracker = require('../visitor-tracker');
const cookieConsent = require('../cookie-consent');
const router = express.Router();

router.post('/track', (req, res) => {
    const { event, visitorId, userId } = req.body;
    const ua = req.headers['user-agent'] || '';
    const parsed = visitorTracker.parseUserAgent(ua);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    if (event === 'pageview') {
        const pv = visitorTracker.trackPageview(visitorId || visitorTracker.generateCookieId(), userId, {
            page: req.body.page, title: req.body.title, referrer: req.body.referrer,
            device: parsed.device, browser: parsed.browser, screen: req.body.screen,
            language: req.body.language, country: req.body.country, city: req.body.city
        });
        return res.json({ pageviewId: pv.id });
    } else if (event === 'click') {
        visitorTracker.trackClick(visitorId, userId, {
            element: req.body.element, text: req.body.text, url: req.body.url,
            page: req.body.page, x: req.body.x, y: req.body.y
        });
        return res.json({ ok: true });
    } else if (event === 'session_start') {
        const session = visitorTracker.startSession(visitorId, userId, {
            referrer: req.body.referrer, device: parsed.device, browser: parsed.browser,
            os: parsed.os, screen: req.body.screen, language: req.body.language,
            country: req.body.country, city: req.body.city, ip
        });
        return res.json({ sessionId: session.id });
    } else if (event === 'heatmap') {
        visitorTracker.trackHeatmap(userId, req.body.page, { x: req.body.x, y: req.body.y });
        return res.json({ ok: true });
    }
    res.json({ ok: true });
});

router.post('/exit', (req, res) => {
    visitorTracker.endSession(req.body.sessionId);
    visitorTracker.exitPage(req.body.pageviewId, req.body.duration, req.body.scrollDepth);
    res.json({ ok: true });
});

router.post('/consent', (req, res) => {
    visitorTracker.setConsent(req.body.visitorId, req.body.consent);
    res.json({ ok: true });
});

router.get('/stats/:userId', authenticate, (req, res) => {
    const period = req.query.period || '30d';
    const stats = visitorTracker.getVisitorStats(req.user.id, period);
    res.json({ stats });
});

router.get('/realtime', authenticate, (req, res) => {
    const visitors = visitorTracker.getRealtimeVisitors(req.user.id);
    const count = visitorTracker.getRealtimeCount(req.user.id);
    res.json({ count, visitors });
});

router.get('/heatmap/:page', authenticate, (req, res) => {
    const heatmap = visitorTracker.getHeatmap(req.user.id, req.params.page);
    res.json({ heatmap });
});

router.post('/goals', authenticate, (req, res) => {
    const goal = visitorTracker.createGoal(req.user.id, req.body);
    res.status(201).json({ goal });
});

router.post('/goals/:id/convert', (req, res) => {
    visitorTracker.trackConversion(req.params.id, req.body.visitorId);
    res.json({ ok: true });
});

router.get('/embed/:userId', (req, res) => {
    const script = cookieConsent.getTrackingScript(req.params.userId);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(script.replace(/<\/?script>/g, ''));
});

module.exports = router;
