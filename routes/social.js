/**
 * Flay Omni - Social Media Routes
 * API pour les reseaux sociaux
 */

const express = require('express');
const router = express.Router();
const social = require('../social-integration');
const { authenticate } = require('../lib/auth');

// Get supported platforms
router.get('/platforms', (req, res) => {
    res.json({ platforms: social.getPlatformStats() });
});

// Generate share URL
router.post('/share-url', (req, res) => {
    const { platform, url, text, phone, hashtags, image } = req.body;
    if (!platform || !url) return res.status(400).json({ error: 'platform et url requis' });

    const shareUrl = social.generateShareUrl(platform, { url, text, phone, hashtags, image });
    if (!shareUrl) return res.status(404).json({ error: 'Plateforme non supportee' });

    res.json({ shareUrl, platform });
});

// Generate all share buttons
router.post('/share-buttons', (req, res) => {
    const { url, text, hashtags, image, phone, platforms } = req.body;
    if (!url) return res.status(400).json({ error: 'url requis' });

    const buttons = social.generateShareButtons(url, text, { hashtags, image, phone, platforms });
    res.json({ buttons });
});

// Generate share card HTML
router.post('/share-card', (req, res) => {
    const { title, description, url, image, theme } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title et url requis' });

    const html = social.generateShareCard({ title, description, url, image, theme });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Generate social meta tags
router.post('/meta-tags', (req, res) => {
    const { title, description, url, image, type, siteName } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'title et url requis' });

    const metaTags = social.generateMetaTags({ title, description, url, image, type, siteName });
    res.json({ metaTags });
});

// Generate QR code
router.post('/qr-code', (req, res) => {
    const { url, size } = req.body;
    if (!url) return res.status(400).json({ error: 'url requis' });

    const qrUrl = social.generateQRCode(url, size);
    res.json({ qrUrl });
});

// Generate UTM link
router.post('/utm', (req, res) => {
    const { url, source, medium, campaign, content, term } = req.body;
    if (!url) return res.status(400).json({ error: 'url requis' });

    const utmUrl = social.generateUTM(url, { source, medium, campaign, content, term });
    res.json({ url: utmUrl });
});

// Generate short link
router.post('/short-link', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'url requis' });

        const shortUrl = await social.generateShortLink(url);
        res.json({ shortUrl, original: url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Track share
router.post('/track/share', authenticate, (req, res) => {
    const { platform, url, metadata } = req.body;
    const share = social.trackShare(req.user.id, platform, url, metadata);
    res.json({ share });
});

// Track conversion
router.post('/track/conversion', (req, res) => {
    const { userId, platform, source, metadata } = req.body;
    const conversion = social.trackConversion(userId || 'anonymous', platform, source, metadata);
    res.json({ conversion });
});

// Create campaign
router.post('/campaigns', authenticate, (req, res) => {
    const campaign = social.createCampaign(req.user.id, req.body);
    res.json({ campaign });
});

// Get analytics
router.get('/analytics', authenticate, (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const analytics = social.getAnalytics(req.user.id, days);
    res.json(analytics);
});

module.exports = router;