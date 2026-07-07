/**
 * Flay Omni - Bidirectional Routes
 * API pour support RTL/LTR
 */

const express = require('express');
const router = express.Router();
const bidirectional = require('../bidirectional');

// Check if language is RTL
router.get('/check/:langCode', (req, res) => {
    const isRTL = bidirectional.isRTL(req.params.langCode);
    res.json({ 
        langCode: req.params.langCode, 
        isRTL, 
        direction: bidirectional.getDirection(req.params.langCode) 
    });
});

// Get CSS variables for RTL/LTR
router.get('/css-vars/:langCode', (req, res) => {
    const vars = bidirectional.getCSSVariables(req.params.langCode);
    res.json({ variables: vars });
});

// Get RTL override CSS
router.get('/rtl-css/:langCode', (req, res) => {
    const baseCSS = ''; // Would be the base CSS
    const rtlCSS = bidirectional.generateRTLCSS(baseCSS, req.params.langCode);
    res.setHeader('Content-Type', 'text/css');
    res.send(rtlCSS);
});

// Get HTML attributes
router.get('/html-attrs/:langCode', (req, res) => {
    const attrs = bidirectional.getHTMLAttributes(req.params.langCode);
    res.json({ attributes: attrs });
});

// Get all RTL languages
router.get('/rtl-languages', (req, res) => {
    res.json({ rtlLanguages: bidirectional.rtlLanguages });
});

module.exports = router;