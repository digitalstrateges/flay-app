const express = require('express');
const { authenticate } = require('../lib/auth');
const db = require('../db');
const analyticsEngine = require('../analytics-engine');
const router = express.Router();

router.get('/my', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    res.json({ profile });
});

router.get('/:slug', (req, res) => {
    const slug = req.params.slug;
    const profile = db.findBy('profiles', 'slug', slug);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).json({ error: 'Profil non trouve' });
    analyticsEngine.track(profile.userId, 'views', { referrer: req.headers.referer, userAgent: req.headers['user-agent'] });
    res.json({ profile, user: { name: user.name, username: user.username, plan: user.plan } });
});

router.put('/', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });

    const profile = db.findBy('profiles', 'userId', user.id);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });

    const allowed = ['bio', 'title', 'location', 'phone', 'email', 'avatar', 'logo', 'signature', 'banner', 'services', 'socials', 'theme', 'template', 'geoLocation', 'gallery', 'website', 'seo', 'customCss', 'customJs'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.username && req.body.username !== user.username) {
        const existing = db.findBy('users', 'username', req.body.username);
        if (existing && existing.id !== user.id) return res.status(400).json({ error: 'Username deja pris' });
        updates.slug = req.body.username;
        db.update('users', user.id, { username: req.body.username });
    }
    if (req.body.name) db.update('users', user.id, { name: req.body.name });
    if (req.body.phone) db.update('users', user.id, { phone: req.body.phone });

    const updated = db.update('profiles', user.id, updates);
    res.json({ profile: updated, message: 'Profil mis a jour' });
});

router.put('/services', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });

    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    if (!Array.isArray(req.body.services)) return res.status(400).json({ error: 'Services invalides' });
    db.update('profiles', payload.userId, { services: JSON.stringify(req.body.services) });
    res.json({ services: req.body.services, message: 'Services mis a jour' });
});

router.put('/geo', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('../auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });

    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });

    const designStudio = require('../design-studio');
    let geoLocation = null;
    if (req.body.latitude && req.body.longitude) {
        geoLocation = designStudio.generateGeoLocation(req.body.latitude, req.body.longitude, req.body.address, req.body.city, req.body.country);
    }
    db.update('profiles', payload.userId, { geoLocation: geoLocation ? JSON.stringify(geoLocation) : null });
    res.json({ geoLocation });
});

module.exports = router;
