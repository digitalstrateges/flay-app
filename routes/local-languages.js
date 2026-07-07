/**
 * Flay Omni - Local Languages Routes
 * API pour les langues locales ivoiriennes
 */

const express = require('express');
const router = express.Router();
const localLanguages = require('../local-languages');

// Get all languages
router.get('/', (req, res) => {
    res.json({ languages: localLanguages.languages });
});

// Get single language
router.get('/:code', (req, res) => {
    const lang = localLanguages.languages[req.params.code.toLowerCase()];
    if (!lang) return res.status(404).json({ error: 'Langue non trouvee' });
    res.json({ language: lang });
});

// Get translations for a language
router.get('/:code/translations', (req, res) => {
    const translations = localLanguages.translations[req.params.code.toLowerCase()] || localLanguages.translations.fr;
    res.json({ translations });
});

// Get available languages for UI selector
router.get('/ui/selector', (req, res) => {
    const languages = Object.values(localLanguages.languages).map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        direction: lang.direction,
        rtl: lang.rtl,
        official: lang.official,
        region: lang.region
    }));
    res.json({ languages });
});

// Get Ivorian languages only
router.get('/region/ivory-coast', (req, res) => {
    const ivoirian = Object.values(localLanguages.languages).filter(lang => 
        lang.region && (lang.region.includes('CI') || lang.region.includes('Cote') || lang.region.includes('Ivoire') || lang.official === false)
    ).map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        flag: lang.flag,
        speakers: lang.speakers,
        region: lang.region,
        family: lang.family
    }));
    res.json({ languages: ivoirian });
});

// Get translation for specific key
router.post('/translate', (req, res) => {
    const { lang, key } = req.body;
    if (!lang || !key) return res.status(400).json({ error: 'lang et key requis' });
    
    const translations = localLanguages.translations[lang.toLowerCase()] || localLanguages.translations.fr;
    const translation = translations[key] || localLanguages.translations.fr[key] || key;
    
    res.json({ key, translation, lang });
});

// Bulk translate
router.post('/translate-bulk', (req, res) => {
    const { lang, keys } = req.body;
    if (!lang || !Array.isArray(keys)) return res.status(400).json({ error: 'lang et keys[] requis' });
    
    const translations = localLanguages.translations[lang.toLowerCase()] || localLanguages.translations.fr;
    const fallback = localLanguages.translations.fr;
    
    const results = keys.map(key => ({
        key,
        translation: translations[key] || fallback[key] || key
    }));
    
    res.json({ translations: results });
});

module.exports = router;