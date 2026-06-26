const express = require('express');
const { authenticate } = require('../lib/auth');
const aiAgent = require('../ai-agent');
const db = require('../db');
const router = express.Router();

router.post('/generate-bio', authenticate, (req, res) => {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const bio = aiAgent.generateBio(req.user.name, profile?.services || [], req.body.location, req.body.industry);
    res.json({ bio });
});

router.post('/suggest-services', authenticate, (req, res) => {
    const suggestions = aiAgent.suggestServices(req.body.industry || 'default');
    res.json({ suggestions });
});

router.post('/optimize', authenticate, (req, res) => {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const suggestions = aiAgent.suggestOptimizations(profile);
    res.json({ suggestions });
});

router.post('/response', authenticate, (req, res) => {
    const response = aiAgent.generateResponse(req.body);
    res.json({ response });
});

router.post('/seo', authenticate, (req, res) => {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const seo = aiAgent.generateSEO(req.body.title || req.user.name, profile?.bio || '', profile?.location || '');
    res.json({ seo });
});

router.post('/theme-suggestion', authenticate, (req, res) => {
    const theme = aiAgent.suggestTheme(req.body.industry);
    res.json({ theme });
});

module.exports = router;
