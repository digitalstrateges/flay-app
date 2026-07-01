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

const https = require('https');
const httpLib = require('http');
const fs = require('fs');
const path = require('path');

router.post('/generate-image', authenticate, async (req, res) => {
    try {
        const { prompt, width = 512, height = 512, style = 'realistic' } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt requis' });
        const styleMap = { realistic: '', artistic: ',oil painting style', cartoon: ',cartoon style', anime: ',anime style', minimalist: ',minimalist flat design' };
        const fullPrompt = encodeURIComponent(prompt + (styleMap[style] || ''));
        const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=${width}&height=${height}&seed=${Date.now()}&nologo=true`;
        const filename = `ai_${req.user.id}_${Date.now()}.jpg`;
        const filepath = path.join(__dirname, '..', 'public', 'uploads', filename);
        const file = fs.createWriteStream(filepath);
        const protocol = url.startsWith('https') ? https : httpLib;
        await new Promise((resolve, reject) => {
            protocol.get(url, { timeout: 60000 }, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    const proto2 = redirectUrl.startsWith('https') ? https : httpLib;
                    proto2.get(redirectUrl, { timeout: 60000 }, (res2) => {
                        res2.pipe(file);
                        file.on('finish', () => { file.close(); resolve(); });
                    }).on('error', reject);
                } else {
                    response.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                }
            }).on('error', reject);
        });
        res.json({ url: '/uploads/' + filename, prompt, style, width, height });
    } catch (err) {
        console.error('AI image gen error:', err);
        res.status(500).json({ error: 'Erreur generation image' });
    }
});

router.post('/generate-gallery', authenticate, async (req, res) => {
    try {
        const { prompts = [], style = 'realistic' } = req.body;
        if (!prompts.length) return res.status(400).json({ error: 'Prompts requis' });
        const results = [];
        for (const prompt of prompts.slice(0, 4)) {
            const styleMap = { realistic: '', artistic: ',oil painting', cartoon: ',cartoon', anime: ',anime' };
            const fullPrompt = encodeURIComponent(prompt + (styleMap[style] || ''));
            const url = `https://image.pollinations.ai/prompt/${fullPrompt}?width=512&height=512&seed=${Date.now()}&nologo=true`;
            const filename = `gal_${req.user.id}_${Date.now()}_${results.length}.jpg`;
            const filepath = path.join(__dirname, '..', 'public', 'uploads', filename);
            const file = fs.createWriteStream(filepath);
            await new Promise((resolve, reject) => {
                https.get(url, { timeout: 60000 }, (response) => {
                    response.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                }).on('error', reject);
            });
            results.push({ url: '/uploads/' + filename, prompt });
        }
        res.json({ images: results });
    } catch (err) {
        console.error('AI gallery gen error:', err);
        res.status(500).json({ error: 'Erreur generation galerie' });
    }
});

module.exports = router;
