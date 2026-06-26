const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');
const analyticsEngine = require('./analytics-engine');
const designStudio = require('./design-studio');
const db = require('./db');
const { rateLimit } = require('./lib/rate-limit');

const app = express();

// === MIDDLEWARE ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
});

// Global rate limit: 100 req/min API, 200 static
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        const key = `global:${req.ip}`;
        const now = Date.now();
        if (!global._rateLimits) global._rateLimits = new Map();
        if (!global._rateLimits.has(key)) global._rateLimits.set(key, []);
        const hits = global._rateLimits.get(key).filter(t => t > now - 60000);
        global._rateLimits.set(key, hits);
        if (hits.length >= 100) return res.status(429).json({ error: 'Trop de requetes. Reessayez dans 1 minute.' });
        hits.push(now);
    }
    next();
});

// Stricter rate limit for auth POST
const authRateLimits = new Map();
app.use('/api/auth', (req, res, next) => {
    if (req.method === 'POST') {
        const key = `auth:${req.ip}`;
        const now = Date.now();
        if (!authRateLimits.has(key)) authRateLimits.set(key, []);
        const hits = authRateLimits.get(key).filter(t => t > now - 60000);
        authRateLimits.set(key, hits);
        if (hits.length >= 10) return res.status(429).json({ error: 'Trop de tentatives de connexion.' });
        hits.push(now);
    }
    next();
});

// === STATIC FILES ===
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        const mime = {
            '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
            '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
            '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
            '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
            '.webp': 'image/webp', '.pdf': 'application/pdf'
        };
        if (mime[ext]) res.setHeader('Content-Type', mime[ext]);
    }
}));

// === API ROUTES ===
app.use('/api', require('./routes/system'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/reservations', require('./routes/reservation'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/crm', require('./routes/crm'));
app.use('/api', require('./routes/ecommerce'));
app.use('/api/invoices', require('./routes/invoicing'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/wave', require('./routes/wave'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api', require('./routes/settings'));

// === NON-API ROUTES ===

// Showcase site
app.get('/api/showcase', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    const profile = db.get('profiles', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme, lang: 'fr' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

app.get('/showcase/:slug', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    if (typeof analyticsEngine.track === 'function') analyticsEngine.track(user.id, 'views', { referrer: req.headers.referer });
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme, lang: 'fr' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Public profile pages
app.get('/p/:username', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.username);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Username shortcut
app.get('/:username', (req, res) => {
    const username = req.params.username;
    if (username.includes('.') || username.includes('/') || username === 'api' || username === 'showcase' || username === 'p') return res.status(404).send('Not found');
    const profile = db.findBy('profiles', 'slug', username);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    if (typeof analyticsEngine.track === 'function') analyticsEngine.track(profile.userId, 'views');
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
});

// Design Studio image processing
app.post('/api/studio/process-image', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const metadata = designStudio.processImageMetadata(req.body.type, req.body.size, req.body.position, req.body.opacity, req.body.filters);
    res.json({ metadata });
});

// === SSE STREAM for notifications ===
const sseClients = new Map();
app.get('/api/chat/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });
    const userId = req.query.userId || 'anonymous';
    sseClients.set(userId, res);
    req.on('close', () => sseClients.delete(userId));
    res.write('data: {"type":"connected"}\n\n');
});

app.get('/api/notifications/stream', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const notifications = require('./notifications');
    notifications.registerSSE(payload.userId, res);
});

// Broadcast helper
function broadcast(userId, event) {
    const client = sseClients.get(userId);
    if (client) client.write(`data: ${JSON.stringify(event)}\n\n`);
}

// === ERROR HANDLER ===
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

module.exports = { app, broadcast };
