const express = require('express');
const { authenticate } = require('../lib/auth');
const llm = require('../src/llm/engine');
const db = require('../db');
const https = require('https');
const httpLib = require('http');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/status', authenticate, (req, res) => {
  res.json({ llm: llm.getStats(), enabled: true });
});

router.post('/generate-bio', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await llm.generateBio(
      req.user.name,
      req.body.industry || profile?.services?.[0]?.name || 'Professionnel',
      req.body.location || profile?.location || 'Abidjan',
      req.body.style || 'professionnel'
    );
    res.json({ bio: result.text, source: result.source, time: result.time });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-services', authenticate, async (req, res) => {
  try {
    const result = await llm.generateServices(
      req.body.industry || req.user.name || 'Professionnel',
      req.body.context || ''
    );
    res.json({ services: result.text, source: result.source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/marketing', authenticate, async (req, res) => {
  try {
    const result = await llm.generateMarketingContent(
      req.user.name,
      req.body.industry || 'Professionnel',
      req.body.platform || 'web',
      req.body.offer || ''
    );
    res.json({ content: result.text, source: result.source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/seo', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await llm.optimizeSEO(
      req.body.title || req.user.name,
      profile?.bio || '',
      profile?.location || '',
      req.body.content || ''
    );
    try { return res.json({ seo: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ seo: result.text, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/optimize', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await llm.getSmartSuggestions(
      { user: { name: req.user.name, plan: req.user.plan }, profile: profile || {} },
      req.body.type || 'improvements'
    );
    try { return res.json({ suggestions: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ suggestions: result.text, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/theme-suggestion', authenticate, async (req, res) => {
  try {
    const result = await llm.generateFromTemplate('theme', {
      params: [{ industry: req.body.industry || 'general', region: 'africa' }, req.body.industry || 'Professionnel']
    });
    try { return res.json({ theme: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ theme: { theme: result.text }, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await llm.assistantChat(message, {
      user: { name: req.user.name, plan: req.user.plan },
      services: profile?.services || [],
      history
    });
    res.json({ response: result.text, source: result.source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-showcase', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const result = await llm.generateShowcaseContent(profile, req.body.products);
    try { return res.json({ content: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ content: result.text, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, width = 512, height = 512, style = 'realistic' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt requis' });
    const result = await llm.generateImage(prompt, { width, height, style });
    if (result.description) {
      return res.json({ description: result.description, prompt: result.prompt, source: result.source });
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

router.post('/personalize-experience', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const data = { user: { name: req.user.name, plan: req.user.plan }, profile: profile || {} };
    const result = await llm.generateFromTemplate('personalization', { params: [data, req.body.pageType || 'dashboard'] });
    try { return res.json({ personalization: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ personalization: result.text, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/analyze-performance', authenticate, async (req, res) => {
  try {
    const profile = db.findBy('profiles', 'userId', req.user.id);
    const analytics = db.findAll('analytics_events').filter(e => e.userId === req.user.id).slice(-50);
    const data = { profile: { name: req.user.name, plan: req.user.plan, services: profile?.services?.length || 0 }, events: analytics.length };
    const result = await llm.generateFromTemplate('analysis', { params: [data, 'performance'] });
    try { return res.json({ analysis: JSON.parse(result.text), source: result.source }); }
    catch { return res.json({ analysis: result.text, source: result.source }); }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/auto-content', authenticate, async (req, res) => {
  try {
    const result = await llm.generateMarketingContent(
      req.user.name,
      req.body.industry || 'Professionnel',
      req.body.platform || 'web',
      req.body.offer || ''
    );
    res.json({ content: result.text, source: result.source });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
