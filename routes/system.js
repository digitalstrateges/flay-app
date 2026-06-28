const express = require('express');
const config = require('../config');
const authUtils = require('../auth-utils');
const db = require('../db');
const { rateLimit } = require('../lib/rate-limit');
const seo = require('../seo');
const router = express.Router();

const pkg = require('../package.json');
router.get('/health', (req, res) => {
    res.json({ status: 'ok', version: config.VERSION || pkg.version || '16.0.0', uptime: process.uptime(), features: config.FEATURES, timestamp: new Date().toISOString() });
});

router.get('/plans', (req, res) => {
    res.json({ plans: config.PLANS });
});

router.get('/config', (req, res) => {
    res.json({
        wavePaymentUrl: config.WAVE_PAYMENT_URL,
        waveMerchant: config.WAVE_MERCHANT,
        whatsappLink: config.WHATSAPP_LINK,
        features: config.FEATURES
    });
});

router.get('/themes', (req, res) => {
    res.json({ themes: [
        'dark', 'midnight', 'ocean', 'emerald', 'sunset', 'electric', 'rose', 'forest', 'gold', 'aurora', 'noir',
        'light', 'daylight', 'ivory', 'cloud', 'snow',
        'cotedivoire', 'france', 'senegal', 'cameroun', 'mali', 'burkina', 'ghana', 'nigeria', 'togo', 'benin', 'congo', 'gabon', 'guinea', 'niger',
        'afrique',
        'noel', 'halloween', 'love', 'royal', 'nature', 'cyber', 'pastel', 'mandy', 'ocean_light', 'sunset_light'
    ]});
});

router.get('/templates', (req, res) => {
    res.json({ templates: ['minimal', 'creatif', 'business', 'portfolio'] });
});

router.get('/csrf-token', (req, res) => {
    const security = require('../security');
    res.json({ token: security.generateCSRF() });
});

router.get('/security/status', (req, res) => {
    res.json({ rateLimit: { windowMs: 60000, maxRequests: 100 }, loginRateLimit: { windowMs: 900000, maxAttempts: 5 }, csrf: 'enabled', headers: ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection', 'CSP'], inputSanitization: 'enabled' });
});

router.get('/currencies', (req, res) => {
    const multiCurrency = require('../multi-currency');
    res.json({ currencies: multiCurrency.getAll() });
});

router.post('/currencies/convert', (req, res) => {
    const multiCurrency = require('../multi-currency');
    const { amount, from, to } = req.body;
    const result = multiCurrency.convert(amount, from, to);
    res.json({ result, formatted: multiCurrency.format(result, to) });
});

router.get('/cookie-consent/config', (req, res) => {
    const cookieConsent = require('../cookie-consent');
    res.json({ config: cookieConsent.config });
});

router.get('/i18n/:lang', (req, res) => {
    const I18n = require('../i18n');
    const i18n = new I18n(req.params.lang);
    res.json({ lang: req.params.lang, translations: { app: i18n.t('app'), nav: i18n.t('nav'), auth: i18n.t('auth'), dashboard: i18n.t('dashboard'), editor: i18n.t('editor'), payment: i18n.t('payment'), plans: i18n.t('plans'), footer: i18n.t('footer') } });
});

router.get('/i18n', (req, res) => {
    const I18n = require('../i18n');
    const i18n = new I18n();
    res.json({ langs: i18n.getLangs(), default: 'fr' });
});

router.get('/sitemap/dynamic', (req, res) => {
    const profiles = db.getAll('profiles');
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const urls = [
        { loc: `${seo.siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
        { loc: `${seo.siteUrl}/login.html`, changefreq: 'monthly', priority: '0.6' },
        { loc: `${seo.siteUrl}/register.html`, changefreq: 'monthly', priority: '0.7' }
    ];
    for (const profile of profiles) {
        const user = db.get('users', profile.userId);
        if (user) {
            urls.push({ loc: `${seo.siteUrl}/p/${profile.slug}`, lastmod: profile.updatedAt || new Date().toISOString(), changefreq: 'weekly', priority: '0.8' });
        }
    }
    for (const u of urls) {
        xml += `  <url>\n    <loc>${u.loc}</loc>\n`;
        if (u.lastmod) xml += `    <lastmod>${u.lastmod.split('T')[0]}</lastmod>\n`;
        xml += `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    }
    xml += '</urlset>';
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(xml);
});

router.get('/profile/themes', (req, res) => {
    const themes = [
        // Dark modes
        { id: 'dark', name: 'Dark', colors: { bg: '#1a1a2e', text: '#fff', card: '#16213e', primary: '#667eea' } },
        { id: 'midnight', name: 'Midnight', colors: { bg: '#0a0a23', text: '#fff', card: '#111133', primary: '#4a90d9' } },
        { id: 'ocean', name: 'Ocean', colors: { bg: '#0a192f', text: '#fff', card: '#112240', primary: '#64ffda' } },
        { id: 'emerald', name: 'Emerald', colors: { bg: '#0d2818', text: '#fff', card: '#1a3a2a', primary: '#2ecc71' } },
        { id: 'sunset', name: 'Sunset', colors: { bg: '#1a0a0a', text: '#fff', card: '#2a1515', primary: '#ff6b6b' } },
        { id: 'electric', name: 'Electric', colors: { bg: '#0a0a1a', text: '#fff', card: '#15152a', primary: '#a855f7' } },
        { id: 'rose', name: 'Rose', colors: { bg: '#1a0a15', text: '#fff', card: '#2a1525', primary: '#f472b6' } },
        { id: 'forest', name: 'Forest', colors: { bg: '#0a1a0a', text: '#fff', card: '#152a15', primary: '#4ade80' } },
        { id: 'gold', name: 'Gold', colors: { bg: '#1a150a', text: '#fff', card: '#2a2515', primary: '#f5a623' } },
        { id: 'aurora', name: 'Aurora', colors: { bg: '#0a0a2a', text: '#fff', card: '#151540', primary: '#00d4ff' } },
        { id: 'noir', name: 'Noir', colors: { bg: '#0a0a0a', text: '#fff', card: '#141414', primary: '#e0e0e0' } },
        // Light modes
        { id: 'light', name: 'Light', colors: { bg: '#ffffff', text: '#1a1a2e', card: '#f8f9fa', primary: '#667eea' } },
        { id: 'daylight', name: 'Daylight', colors: { bg: '#fafbfc', text: '#1a1a2e', card: '#fff', primary: '#4a90d9' } },
        { id: 'ivory', name: 'Ivory', colors: { bg: '#fffff0', text: '#2d2d2d', card: '#fff', primary: '#8b7355' } },
        { id: 'cloud', name: 'Cloud', colors: { bg: '#f0f4f8', text: '#1a202c', card: '#fff', primary: '#3182ce' } },
        { id: 'snow', name: 'Snow', colors: { bg: '#f8fafc', text: '#1a202c', card: '#fff', primary: '#805ad5' } },
        // National
        { id: 'cotedivoire', name: "Cote d'Ivoire", colors: { bg: '#f8f400', text: '#1a1a2e', card: '#fff', primary: '#f77f00' } },
        { id: 'france', name: 'France', colors: { bg: '#002395', text: '#fff', card: '#001d6e', primary: '#ed2939' } },
        { id: 'senegal', name: 'Senegal', colors: { bg: '#00853f', text: '#fff', card: '#006b32', primary: '#fdef42' } },
        { id: 'cameroun', name: 'Cameroun', colors: { bg: '#007a5e', text: '#fff', card: '#00664d', primary: '#fcd116' } },
        { id: 'mali', name: 'Mali', colors: { bg: '#14b53a', text: '#fff', card: '#109930', primary: '#fcd116' } },
        { id: 'burkina', name: 'Burkina Faso', colors: { bg: '#ef2b2d', text: '#fff', card: '#d42527', primary: '#fcd116' } },
        { id: 'ghana', name: 'Ghana', colors: { bg: '#006b3f', text: '#fff', card: '#005532', primary: '#fcd116' } },
        { id: 'nigeria', name: 'Nigeria', colors: { bg: '#008751', text: '#fff', card: '#006d41', primary: '#fff' } },
        { id: 'togo', name: 'Togo', colors: { bg: '#006a1c', text: '#fff', card: '#005516', primary: '#fcd116' } },
        { id: 'afrique', name: 'Afrique', colors: { bg: '#000000', text: '#fff', card: '#1a1a1a', primary: '#f7941d' } },
        // Special
        { id: 'noel', name: 'Noel', colors: { bg: '#1a3a1a', text: '#fff', card: '#0d2818', primary: '#e74c3c' } },
        { id: 'halloween', name: 'Halloween', colors: { bg: '#1a0a00', text: '#fff', card: '#2a1500', primary: '#ff6600' } },
        { id: 'love', name: 'Love', colors: { bg: '#2a0a15', text: '#fff', card: '#3a1525', primary: '#ff1493' } },
        { id: 'royal', name: 'Royal', colors: { bg: '#1a0a2a', text: '#fff', card: '#2a1540', primary: '#9b59b6' } },
        { id: 'cyber', name: 'Cyber', colors: { bg: '#0a0a1a', text: '#00ff88', card: '#0f0f2a', primary: '#00ff88' } },
        { id: 'pastel', name: 'Pastel', colors: { bg: '#fdf2f8', text: '#831843', card: '#fff', primary: '#ec4899' } }
    ];
    res.json({ themes });
});

module.exports = router;
