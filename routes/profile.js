const express = require('express');
const db = require('../db');
const analyticsEngine = require('../analytics-engine');
const designStudio = require('../design-studio');
const authUtils = require('../auth-utils');
const router = express.Router();

function authenticate(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    return authUtils.verifyToken(token);
}

const VALID_THEMES = designStudio.getThemeIds();

router.get('/my', (req, res) => {
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });
    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    res.json({ profile });
});

router.get('/themes', (req, res) => {
    const themeIds = designStudio.getThemeIds();
    const themes = themeIds.map(id => {
        const colors = designStudio.getThemeColors(id);
        return { id, name: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '), bg: colors.bg, accent: colors.accent, text: colors.text };
    });
    res.json({ themes });
});

router.get('/theme', (req, res) => {
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });
    const profile = db.findBy('profiles', 'userId', payload.userId);
    const theme = (profile && profile.theme) ? profile.theme : 'dark';
    const themeColors = designStudio.getThemeColors(theme);
    res.json({ theme, themeColors });
});

router.get('/public/:slug', (req, res) => {
    const slug = req.params.slug;
    const profile = db.findBy('profiles', 'slug', slug);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).json({ error: 'Profil non trouve' });
    analyticsEngine.track(profile.userId, 'views', { referrer: req.headers.referer, userAgent: req.headers['user-agent'] });
    res.json({ profile, user: { name: user.name, username: user.username, plan: user.plan }, authorName: user.name });
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
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });
    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Non trouve' });

    const profile = db.findBy('profiles', 'userId', user.id);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });

    const allowed = ['bio', 'title', 'location', 'phone', 'email', 'avatar', 'logo', 'signature', 'banner', 'services', 'socials', 'theme', 'template', 'geoLocation', 'gallery', 'website', 'seo', 'customCss', 'customJs'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.theme && !VALID_THEMES.includes(updates.theme)) {
        return res.status(400).json({ error: 'Theme non supporte', validThemes: VALID_THEMES });
    }
    if (req.body.username && req.body.username !== user.username) {
        const existing = db.findBy('users', 'username', req.body.username);
        if (existing && existing.id !== user.id) return res.status(400).json({ error: 'Username deja pris' });
        updates.slug = req.body.username;
        db.update('users', user.id, { username: req.body.username });
    }
    if (req.body.name) db.update('users', user.id, { name: req.body.name });
    if (req.body.phone) db.update('users', user.id, { phone: req.body.phone });

    const updated = db.update('profiles', profile.id, updates);
    res.json({ profile: updated, message: 'Profil mis a jour' });
});

router.put('/theme', async (req, res) => {
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });

    const user = db.get('users', payload.userId);
    if (!user) return res.status(401).json({ error: 'Utilisateur non trouve' });

    if (!req.body.theme || typeof req.body.theme !== 'string') {
        return res.status(400).json({ error: 'Theme invalide' });
    }

    if (!VALID_THEMES.includes(req.body.theme)) {
        return res.status(400).json({ error: 'Theme non supporte', validThemes: VALID_THEMES });
    }

    const themeColors = designStudio.getThemeColors(req.body.theme);

    let profile = db.findBy('profiles', 'userId', user.id);
    if (!profile) {
        db.insert('profiles', {
            id: user.id, userId: user.id, slug: user.username,
            title: '', bio: '', avatar: '', phone: '', email: '', location: '', website: '',
            socials: JSON.stringify({ facebook: '', instagram: '', linkedin: '', whatsapp: '', twitter: '', tiktok: '', youtube: '' }),
            services: '[]', theme: req.body.theme, customColors: null,
            language: user.language || 'fr', views: 0, clicks: 0, shares: 0,
            qrCode: '', shareLink: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
    } else {
        db.update('profiles', profile.id, { theme: req.body.theme, customColors: null, updatedAt: new Date().toISOString() });
    }

    res.json({ theme: req.body.theme, themeColors, message: 'Theme mis a jour' });
});

router.put('/services', async (req, res) => {
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });

    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    if (!Array.isArray(req.body.services)) return res.status(400).json({ error: 'Services invalides' });
    db.update('profiles', profile.id, { services: JSON.stringify(req.body.services) });
    res.json({ services: req.body.services, message: 'Services mis a jour' });
});

router.put('/geo', async (req, res) => {
    const payload = authenticate(req);
    if (!payload) return res.status(401).json({ error: 'Token manquant ou invalide' });

    const profile = db.findBy('profiles', 'userId', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });

    let geoLocation = null;
    if (req.body.latitude && req.body.longitude) {
        geoLocation = designStudio.generateGeoLocation(req.body.latitude, req.body.longitude, req.body.address, req.body.city, req.body.country);
    }
    db.update('profiles', profile.id, { geoLocation: geoLocation ? JSON.stringify(geoLocation) : null });
    res.json({ geoLocation });
});

module.exports = router;
