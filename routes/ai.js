const express = require('express');
const { authenticate } = require('../lib/auth');
const gemini = require('../lib/gemini');
const aiAgent = require('../ai-agent');
const db = require('../db');
const https = require('https');
const httpLib = require('http');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// === STATUS ===
router.get('/status', authenticate, (req, res) => {
    res.json({
        gemini: gemini.getStats(),
        fallback: !gemini.isEnabled
    });
});

// === TEXTE GENERATION ===
router.post('/generate-bio', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        const result = await gemini.generateMarketingContent({
            name: req.user.name,
            services: profile?.services || [],
            location: profile?.location || '',
            industry: req.body.industry || ''
        }, 'bio');
        if (result.text) return res.json({ bio: result.text, source: 'gemini' });
    }
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const bio = aiAgent.generateBio(req.user.name, profile?.services || [], req.body.location, req.body.industry);
    res.json({ bio, source: 'fallback' });
});

router.post('/generate-services', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const result = await gemini.generateMarketingContent({
            name: req.user.name,
            industry: req.body.industry || req.user.business || '',
            location: req.body.location || ''
        }, 'all');
        if (result.text) return res.json({ services: result.text, source: 'gemini' });
    }
    const suggestions = aiAgent.suggestServices(req.body.industry || 'default');
    res.json({ services: suggestions, source: 'fallback' });
});

router.post('/marketing', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        const result = await gemini.generateMarketingContent({
            name: req.user.name,
            services: profile?.services || [],
            location: profile?.location || '',
            industry: req.body.industry || '',
            plan: req.user.plan || 'free'
        }, req.body.type || 'all');
        if (result.text) return res.json({ content: result.text, source: 'gemini' });
    }
    res.json({ content: 'Contenu marketing genere. Configurez GEMINI_API_KEY pour des resultats avances.', source: 'fallback' });
});

router.post('/seo', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        const result = await gemini.optimizeSEO(
            req.body.title || req.user.name,
            profile?.bio || '',
            profile?.location || ''
        );
        if (result.text) {
            try {
                return res.json({ seo: JSON.parse(result.text), source: 'gemini' });
            } catch (e) {
                return res.json({ seo: result.text, source: 'gemini' });
            }
        }
    }
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const seo = aiAgent.generateSEO(req.body.title || req.user.name, profile?.bio || '', profile?.location || '');
    res.json({ seo, source: 'fallback' });
});

router.post('/optimize', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        const result = await gemini.getSmartSuggestions({
            user: { name: req.user.name, plan: req.user.plan },
            profile: profile || {},
            services: profile?.services || []
        });
        if (result.text) {
            try {
                return res.json({ suggestions: JSON.parse(result.text), source: 'gemini' });
            } catch (e) {
                return res.json({ suggestions: result.text, source: 'gemini' });
            }
        }
    }
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const suggestions = aiAgent.suggestOptimizations(profile);
    res.json({ suggestions, source: 'fallback' });
});

router.post('/theme-suggestion', authenticate, async (req, res) => {
    if (gemini.isEnabled) {
        const result = await gemini.chat([{
            role: 'user',
            content: `Suggere un theme de couleur parfait pour un professionnel du domaine "${req.body.industry || 'general'}" en Afrique. Reponds en JSON: {theme: "nom du theme", reason: "raison"}. Themes disponibles: dark, midnight, ocean, emerald, sunset, electric, rose, forest, gold, aurora, noir, light, cotedivoire, france, senegal.`
        }], { systemPrompt: 'Tu es un expert design. Choisis le meilleur theme parmi la liste.', temperature: 0.5 });
        if (result.text) {
            try {
                return res.json({ theme: JSON.parse(result.text), source: 'gemini' });
            } catch (e) {}
        }
    }
    const theme = aiAgent.suggestTheme(req.body.industry);
    res.json({ theme, source: 'fallback' });
});

// === CHAT ASSISTANT ===
router.post('/chat', authenticate, async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });

    if (gemini.isEnabled) {
        const profile = db.findBy('profiles', 'userId', req.user.id);
        const result = await gemini.assistantChat(message, {
            user: { name: req.user.name, plan: req.user.plan },
            services: profile?.services || []
        });
        if (result.text) return res.json({ response: result.text, source: 'gemini' });
    }
    res.json({
        response: 'Je suis l\'assistant Flay. Pour des reponses intelligentes, configurez GEMINI_API_KEY. En attendant, je peux vous aider avec les fonctionnalites de base de la plateforme.',
        source: 'fallback'
    });
});

// === SHOWCASE GENERATION ===
router.post('/generate-showcase', authenticate, async (req, res) => {
    if (!gemini.isEnabled) {
        return res.json({ content: null, source: 'fallback' });
    }
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await gemini.generateShowcaseContent({
        user: { name: req.user.name },
        profile: profile || {},
        request: req.body
    });
    if (result.text) {
        try {
            return res.json({ content: JSON.parse(result.text), source: 'gemini' });
        } catch (e) {
            return res.json({ content: result.text, source: 'gemini' });
        }
    }
    res.json({ content: null, source: 'fallback' });
});

// === IMAGE GENERATION ===
router.post('/generate-image', authenticate, async (req, res) => {
    try {
        const { prompt, width = 512, height = 512, style = 'realistic' } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt requis' });

        if (gemini.isEnabled) {
            const result = await gemini.generateImage(prompt, { width, height, style });
            if (result.description) {
                return res.json({ description: result.description, prompt: result.prompt, source: 'gemini', note: 'Gemini a genere la description. Pour l\'image reelle, utilisez le prompt avec un generateur d\'images.' });
            }
        }

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
                    const proto2 = (response.headers.location || '').startsWith('https') ? https : httpLib;
                    proto2.get(response.headers.location, { timeout: 60000 }, (res2) => {
                        res2.pipe(file);
                        file.on('finish', () => { file.close(); resolve(); });
                    }).on('error', reject);
                } else {
                    response.pipe(file);
                    file.on('finish', () => { file.close(); resolve(); });
                }
            }).on('error', reject);
        });
        res.json({ url: '/uploads/' + filename, prompt, style, width, height, source: 'pollinations' });
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

// === PERSONNALISATION ===
router.post('/personalize-experience', authenticate, async (req, res) => {
    if (!gemini.isEnabled) return res.json({ personalization: null, source: 'fallback' });

    const profile = db.findBy('profiles', 'userId', req.user.id);
    const visits = db.findAll('tracking_events').filter(e => e.userId === req.user.id).slice(-20);

    const result = await gemini.chat([{
        role: 'user',
        content: `Analyse cette activite et personnalise l'experience: Profil: ${JSON.stringify(profile || {})}, Visites recentes: ${JSON.stringify(visits.length)}, Plan: ${req.user.plan}. Recommande: theme optimal, sections a mettre en avant, ameliorations. JSON: {theme, highlightSections[], improvements[], nextActions[]}.`
    }], {
        systemPrompt: 'Tu es un expert UX/personalisation. Analyse les donnees et donne des recommandations concises.',
        temperature: 0.4
    });

    if (result.text) {
        try {
            return res.json({ personalization: JSON.parse(result.text), source: 'gemini' });
        } catch (e) {
            return res.json({ personalization: result.text, source: 'gemini' });
        }
    }
    res.json({ personalization: null, source: 'fallback' });
});

// === ANALYSE INTELLIGENTE ===
router.post('/analyze-performance', authenticate, async (req, res) => {
    if (!gemini.isEnabled) return res.json({ analysis: null, source: 'fallback' });

    const profile = db.findBy('profiles', 'userId', req.user.id);
    const analytics = db.findAll('analytics_events').filter(e => e.userId === req.user.id).slice(-50);

    const result = await gemini.chat([{
        role: 'user',
        content: `Analyse les performances de ce business: Profil: ${JSON.stringify({ name: req.user.name, plan: req.user.plan, services: profile?.services?.length || 0 })}, Events: ${analytics.length} recent. Identifie les tendances, forces, faiblesses. JSON: {score:0-100, strengths[], weaknesses[], recommendations[], growthPotential: "low/medium/high"}.`
    }], {
        systemPrompt: 'Tu es un analyste business. Sois precis et actionnable.',
        temperature: 0.3
    });

    if (result.text) {
        try {
            return res.json({ analysis: JSON.parse(result.text), source: 'gemini' });
        } catch (e) {
            return res.json({ analysis: result.text, source: 'gemini' });
        }
    }
    res.json({ analysis: null, source: 'fallback' });
});

// === AUTO-GENERATION CONTENU ===
router.post('/auto-content', authenticate, async (req, res) => {
    if (!gemini.isEnabled) return res.json({ content: null, source: 'fallback' });

    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await gemini.generateMarketingContent({
        name: req.user.name,
        services: profile?.services || [],
        location: profile?.location || '',
        industry: req.body.industry || '',
        plan: req.user.plan
    }, req.body.type || 'all');

    if (result.text) return res.json({ content: result.text, source: 'gemini' });
    res.json({ content: null, source: 'fallback' });
});

module.exports = router;
