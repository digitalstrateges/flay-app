/**
 * Flay Omni - Africa World Routes
 * API pour les fonctionnalites specifiques Afrique/Monde
 */

const express = require('express');
const router = express.Router();
const africaWorld = require('../africa-world');

// Get all supported countries
router.get('/countries', (req, res) => {
    res.json({ countries: africaWorld.supportedCountries });
});

// Get country details
router.get('/countries/:code', (req, res) => {
    const country = africaWorld.getCountry(req.params.code);
    if (!country) return res.status(404).json({ error: 'Pays non supporte' });
    res.json({ country });
});

// Get payment methods for country
router.get('/payment-methods/:countryCode', (req, res) => {
    const methods = africaWorld.getPaymentMethodsForCountry(req.params.countryCode);
    res.json({ methods });
});

// Get all languages
router.get('/languages', (req, res) => {
    res.json({ languages: africaWorld.languages });
});

// Get all currencies
router.get('/currencies', (req, res) => {
    res.json({ currencies: africaWorld.currencies });
});

// Convert currency
router.post('/convert', (req, res) => {
    const { amount, from, to } = req.body;
    const result = africaWorld.convertCurrency(amount, from, to);
    res.json({ result, formatted: africaWorld.formatCurrency(result, to) });
});

// Get timezone for country
router.get('/timezone/:countryCode', (req, res) => {
    const timezone = africaWorld.getTimezone(req.params.countryCode);
    res.json({ timezone });
});

// Get business hours for country
router.get('/business-hours/:countryCode', (req, res) => {
    const hours = africaWorld.getBusinessHours(req.params.countryCode);
    res.json({ hours });
});

// Get public holidays for country
router.get('/holidays/:countryCode', (req, res) => {
    const holidays = africaWorld.getPublicHolidays(req.params.countryCode);
    res.json({ holidays });
});

// Get SEO keywords for country
router.get('/seo-keywords/:countryCode', (req, res) => {
    const keywords = africaWorld.getSeoKeywords(req.params.countryCode);
    res.json({ keywords });
});

// Get social proof for country
router.get('/social-proof/:countryCode', (req, res) => {
    const proof = africaWorld.getSocialProof(req.params.countryCode);
    res.json(proof);
});

// Get localized pricing
router.get('/pricing/:countryCode/:plan', (req, res) => {
    const price = africaWorld.getLocalizedPricing(req.params.countryCode, req.params.plan);
    const currency = africaWorld.getCountry(req.params.countryCode)?.currency || 'XOF';
    res.json({ price, currency, formatted: africaWorld.formatCurrency(price, currency) });
});

// Get SMS templates for language
router.get('/sms-templates/:lang', (req, res) => {
    const templates = africaWorld.getSmsTemplates(req.params.lang);
    res.json({ templates });
});

// Detect user country from IP/header
router.get('/detect-country', (req, res) => {
    // Simple detection from headers
    const cfCountry = req.headers['cf-ipcountry'] || req.headers['x-country-code'];
    const country = cfCountry ? africaWorld.getCountry(cfCountry) : null;
    res.json({
        countryCode: cfCountry || 'CI',
        country: country || africaWorld.getCountry('CI'),
        paymentMethods: africaWorld.getPaymentMethodsForCountry(cfCountry || 'CI')
    });
});

module.exports = router;
