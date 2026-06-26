const express = require('express');
const config = require('../config');
const authUtils = require('../auth-utils');
const db = require('../db');
const { rateLimit } = require('../lib/rate-limit');
const seo = require('../seo');
const router = express.Router();

const pkg = require('../package.json');
router.get('/health', (req, res) => {
    res.json({ status: 'ok', version: pkg.version || '10.0.0', uptime: process.uptime(), features: config.FEATURES, timestamp: new Date().toISOString() });
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
    res.json({ themes: ['dark', 'light', 'midnight', 'emerald', 'ocean', 'sunset', 'electric', 'rose', 'forest', 'gold', 'aurora'] });
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
        { id: 'dark', name: 'Dark', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#12121f', primary: '#818cf8' } },
        { id: 'light', name: 'Light', colors: { bg: '#f8f9fa', text: '#111111', card: '#ffffff', primary: '#6366f1' } },
        { id: 'midnight', name: 'Midnight', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#111122', primary: '#60a5fa' } },
        { id: 'ocean', name: 'Ocean', colors: { bg: '#0a1628', text: '#e2e8f0', card: '#0f2035', primary: '#06b6d4' } },
        { id: 'emerald', name: 'Emerald', colors: { bg: '#0a1a1a', text: '#e2e8f0', card: '#0f2525', primary: '#10b981' } },
        { id: 'sunset', name: 'Sunset', colors: { bg: '#1a0a0a', text: '#e2e8f0', card: '#251212', primary: '#f59e0b' } },
        { id: 'electric', name: 'Electric', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#1a1a2e', primary: '#a855f7' } },
        { id: 'rose', name: 'Rose', colors: { bg: '#1a0a1a', text: '#e2e8f0', card: '#251025', primary: '#ec4899' } },
        { id: 'forest', name: 'Forest', colors: { bg: '#0a1a0a', text: '#e2e8f0', card: '#0f250f', primary: '#22c55e' } },
        { id: 'gold', name: 'Gold', colors: { bg: '#1a1a0a', text: '#e2e8f0', card: '#252510', primary: '#eab308' } },
        { id: 'aurora', name: 'Aurora', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#15152a', primary: '#8b5cf6' } }
    ];
    res.json({ themes });
});

module.exports = router;
