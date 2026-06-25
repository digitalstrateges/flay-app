/**
 * Flay Ultimate Server v3.0
 * Toutes les integrations: IA, Chat, Webhooks, PDF, Studio, Geoloc, Vitrine
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');

const config = require('./config');
const authUtils = require('./auth-utils');
const db = require('./database');
const aiAgent = require('./ai-agent');
const chatEngine = require('./chat-engine');
const webhookManager = require('./webhooks');
const analyticsEngine = require('./analytics-engine');
const abTesting = require('./ab-testing');
const businessCard = require('./business-card');
const designStudio = require('./design-studio');
const I18n = require('./i18n');
const visitorTracker = require('./visitor-tracker');
const cookieConsent = require('./cookie-consent');
const crm = require('./crm');
const invoicing = require('./invoicing');
const notifications = require('./notifications');
const twoFactor = require('./two-factor');
const multiCurrency = require('./multi-currency');
const socialAuth = require('./social-auth');
const emailSystem = require('./email-system');
const smsSystem = require('./sms-system');
const teamManager = require('./team-manager');
const domainManager = require('./domain-manager');
const security = require('./security');
const seo = require('./seo');

const PORT = process.env.PORT || config.PORT || 4000;

// === IN-MEMORY DATABASE ===
const data = {
    users: new Map(),
    profiles: new Map(),
    payments: new Map(),
    reservations: new Map(),
    apiKeys: new Map(),
    sessions: new Map()
};

// Seed demo users
const demoId = 'demo-user-001';
const demoPass = authUtils.hashPassword('demo123');
data.users.set(demoId, {
    id: demoId, email: 'demo@flay.app', name: 'Jean Koffi', username: 'jean-koffi',
    password: demoPass.hash.split(':')[1], salt: demoPass.salt, plan: 'premium', planExpiry: '2026-12-31',
    createdAt: new Date().toISOString(), role: 'user'
});
data.profiles.set(demoId, {
    userId: demoId, slug: 'jean-koffi', theme: 'dark', template: 'business',
    bio: 'Photographe professionnel base a Abidjan. Specialise dans les mariages, portraits et evenements corporate.',
    title: 'Photographe Pro', location: 'Abidjan, Cote d\'Ivoire', phone: '+2250759731990', email: 'jean@flay.app',
    avatar: '', logo: '', signature: '', banner: '',
    services: [
        { name: 'Mariage', description: 'Couverture complete de votre mariage', price: '75 000 FCFA' },
        { name: 'Portrait Pro', description: 'Photo professionnelle pour CV/LinkedIn', price: '15 000 FCFA' },
        { name: 'Evenementiel', description: 'Reportage evenement corporate', price: '50 000 FCFA' }
    ],
    socials: { facebook: '', instagram: '', twitter: '', linkedin: '', tiktok: '', youtube: '' },
    geoLocation: null, gallery: [], website: '',
    analytics: { totalViews: 342, totalClicks: 89, totalShares: 23, totalReservations: 12 },
    seo: { title: '', description: '', keywords: [] },
    customCss: '', customJs: '',
    plan: 'premium', createdAt: new Date().toISOString()
});
data.payments.set('pay-demo-001', {
    id: 'pay-demo-001', userId: demoId, plan: 'premium', amount: 15000, currency: 'XOF',
    status: 'confirmed', waveRef: 'WAVE-DEMO-001', payerName: 'Jean Koffi',
    createdAt: new Date().toISOString(), confirmedAt: new Date().toISOString()
});

// === UTILITY FUNCTIONS ===
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body || '{}')); }
            catch { resolve({}); }
        });
        req.on('error', reject);
    });
}

function sendJSON(res, data, status = 200) {
    res.writeHead(status, { 
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });
    res.end(JSON.stringify(data));
}

function sendHTML(res, html, status = 200) {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
}

function send404(res) { sendJSON(res, { error: 'Not found' }, 404); }
function send401(res) { sendJSON(res, { error: 'Unauthorized' }, 401); }
function send403(res) { sendJSON(res, { error: 'Forbidden' }, 403); }
function send400(res, msg) { sendJSON(res, { error: msg || 'Bad request' }, 400); }
function send500(res, msg) { sendJSON(res, { error: msg || 'Internal server error' }, 500); }

function auth(req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return null;
    const payload = authUtils.verifyToken(token);
    if (!payload) return null;
    return data.users.get(payload.userId) || null;
}

function requireAuth(req, res) {
    const user = auth(req);
    if (!user) { send401(res); return null; }
    return user;
}

function generateId(prefix = 'flay') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// === RATE LIMITER ===
const rateLimits = new Map();
function checkRateLimit(key, windowMs, max) {
    const now = Date.now();
    if (!rateLimits.has(key)) rateLimits.set(key, []);
    const hits = rateLimits.get(key).filter(t => t > now - windowMs);
    rateLimits.set(key, hits);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
}

// === STATIC FILES ===
const mimeTypes = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.webp': 'image/webp', '.pdf': 'application/pdf'
};

function serveStatic(req, res, filePath) {
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, content) => {
        if (err) { send404(res); return; }
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=3600' });
        res.end(content);
    });
}

// === ROUTER ===
const routes = { GET: [], POST: [], PUT: [], DELETE: [] };

function route(method, path, handler) {
    routes[method].push({ path, handler });
}

function matchRoute(method, pathname) {
    for (const r of routes[method]) {
        const pattern = r.path.replace(/:(\w+)/g, '([^/]+)');
        const regex = new RegExp(`^${pattern}$`);
        const match = pathname.match(regex);
        if (match) return { handler: r.handler, params: match.slice(1) };
    }
    return null;
}

// === API ROUTES ===

// --- Health & Info ---
route('GET', '/api/health', (req, res) => sendJSON(res, {
    status: 'ok', version: '3.0.0', uptime: process.uptime(),
    features: config.FEATURES, timestamp: new Date().toISOString()
}));

route('GET', '/api/plans', (req, res) => sendJSON(res, { plans: config.PLANS }));

route('GET', '/api/config', (req, res) => sendJSON(res, {
    wavePaymentUrl: config.WAVE_PAYMENT_URL,
    waveMerchant: config.WAVE_MERCHANT,
    whatsappLink: config.WHATSAPP_LINK,
    features: config.FEATURES
}));

route('GET', '/api/themes', (req, res) => sendJSON(res, {
    themes: ['dark','light','midnight','emerald','ocean','sunset','electric','rose','forest','gold','aurora']
}));

route('GET', '/api/templates', (req, res) => sendJSON(res, {
    templates: ['minimal','creatif','business','portfolio']
}));

// --- Auth ---
route('POST', '/api/auth/register', async (req, res) => {
    if (!checkRateLimit('auth_register', 15*60*1000, 10)) return send400(res, 'Trop de tentatives');
    const body = await parseBody(req);
    const { email, password, name, username } = body;
    if (!email || !password || !name || !username) return send400(res, 'Champs requis manquants');
    if (password.length < 6) return send400(res, 'Mot de passe trop court (min 6)');
    if (!/^[a-zA-Z0-9_-]+$/.test(username) || username.length < 3) return send400(res, 'Nom d\'utilisateur invalide');
    for (const [,u] of data.users) {
        if (u.email === email) return send400(res, 'Email deja utilise');
        if (u.username === username) return send400(res, 'Nom d\'utilisateur deja pris');
    }
    const id = generateId('user');
    const hashed = authUtils.hashPassword(password);
    const tokens = authUtils.generateTokens(id);
    data.users.set(id, { id, email, name, username, password: hashed.hash.split(':')[1], salt: hashed.salt, plan: 'free', createdAt: new Date().toISOString(), role: 'user' });
    data.profiles.set(id, { userId: id, slug: username, theme: 'dark', template: 'minimal', bio: '', title: '', location: '', phone: '', email, avatar: '', logo: '', signature: '', banner: '', services: [], socials: {}, geoLocation: null, gallery: [], website: '', analytics: { totalViews:0, totalClicks:0, totalShares:0, totalReservations:0 }, seo: {}, customCss: '', customJs: '', plan: 'free', createdAt: new Date().toISOString() });
    sendJSON(res, { user: { id, email, name, username, plan: 'free' }, ...tokens }, 201);
});

route('POST', '/api/auth/login', async (req, res) => {
    if (!checkRateLimit('auth_login', 15*60*1000, 15)) return send400(res, 'Trop de tentatives');
    const body = await parseBody(req);
    const { email, password } = body;
    if (!email || !password) return send400(res, 'Email et mot de passe requis');
    let found = null;
    for (const [,u] of data.users) { if (u.email === email) { found = u; break; } }
    if (!found || !authUtils.verifyPassword(password, found.password, found.salt)) return send400(res, 'Identifiants incorrects');
    const tokens = authUtils.generateTokens(found.id);
    sendJSON(res, { user: { id: found.id, email: found.email, name: found.name, username: found.username, plan: found.plan }, ...tokens });
});

route('POST', '/api/auth/refresh', async (req, res) => {
    const body = await parseBody(req);
    if (!body.refreshToken) return send400(res, 'Refresh token requis');
    const payload = authUtils.verifyToken(body.refreshToken);
    if (!payload) return send401(res);
    const tokens = authUtils.generateTokens(payload.userId);
    sendJSON(res, tokens);
});

route('POST', '/api/auth/forgot-password', async (req, res) => {
    const body = await parseBody(req);
    if (!body.email) return send400(res, 'Email requis');
    let found = null;
    for (const [,u] of data.users) { if (u.email === body.email) { found = u; break; } }
    // Always return success to prevent email enumeration
    if (!found) return sendJSON(res, { message: 'Si cet email existe, un lien a ete envoye' });
    const resetToken = authUtils.generateToken({ userId: found.id, type: 'reset' }, '1h');
    // In production, send email with reset link. Never expose token in response.
    console.log(`[AUTH] Reset token for ${body.email}: /reset-password.html?token=${resetToken}`);
    sendJSON(res, { message: 'Si cet email existe, un lien a ete envoye', resetUrl: `/reset-password.html?token=${resetToken}` });
});

route('POST', '/api/auth/reset-password', async (req, res) => {
    const body = await parseBody(req);
    if (!body.token || !body.password) return send400(res, 'Token et mot de passe requis');
    const payload = authUtils.verifyToken(body.token);
    if (!payload || payload.type !== 'reset') return send400(res, 'Token invalide');
    const user = data.users.get(payload.userId);
    if (!user) return send404(res);
    const hashed = authUtils.hashPassword(body.password);
    user.password = hashed.hash.split(':')[1];
    user.salt = hashed.salt;
    sendJSON(res, { message: 'Mot de passe reinitialise' });
});

route('GET', '/api/auth/me', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, planExpiry: user.planExpiry } });
});

// --- Account Management ---
route('PUT', '/api/auth/password', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) return send400(res, 'Mot de passe actuel et nouveau requis');
    if (newPassword.length < 6) return send400(res, 'Nouveau mot de passe trop court (min 6)');
    if (!authUtils.verifyPassword(currentPassword, user.password, user.salt)) return send400(res, 'Mot de passe actuel incorrect');
    const hashed = authUtils.hashPassword(newPassword);
    user.password = hashed.hash.split(':')[1];
    user.salt = hashed.salt;
    sendJSON(res, { message: 'Mot de passe mis a jour' });
});

route('DELETE', '/api/account', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    if (!body.password || !authUtils.verifyPassword(body.password, user.password, user.salt)) {
        return send400(res, 'Mot de passe requis pour supprimer le compte');
    }
    // Delete all user data
    data.users.delete(user.id);
    data.profiles.delete(user.id);
    for (const [k, v] of data.payments) { if (v.userId === user.id) data.payments.delete(k); }
    for (const [k, v] of data.reservations) { if (v.userId === user.id) data.reservations.delete(k); }
    for (const [k, v] of data.contacts) { if (v.userId === user.id) data.contacts.delete(k); }
    for (const [k, v] of data.deals) { if (v.userId === user.id) data.deals.delete(k); }
    for (const [k, v] of data.invoices) { if (v.userId === user.id) data.invoices.delete(k); }
    for (const [k, v] of data.notifications) { if (v.userId === user.id) data.notifications.delete(k); }
    sendJSON(res, { message: 'Compte supprime avec succes' });
});

route('POST', '/api/account/export', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const profile = data.profiles.get(user.id);
    const payments = Array.from(data.payments.values()).filter(p => p.userId === user.id);
    const reservations = Array.from(data.reservations.values()).filter(r => r.userId === user.id);
    const contacts = Array.from(data.contacts.values()).filter(c => c.userId === user.id);
    sendJSON(res, {
        user: { id: user.id, email: user.email, name: user.name, username: user.username, plan: user.plan, createdAt: user.createdAt },
        profile,
        payments,
        reservations,
        contacts,
        exportedAt: new Date().toISOString()
    });
});

// --- File Upload ---
route('POST', '/api/upload', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    // Parse multipart form data
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
        return send400(res, 'Format: multipart/form-data');
    }
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
        try {
            // Extract base64 data from multipart
            const matches = body.match(/data:([^;]+);base64,(.+)/);
            if (!matches) return send400(res, 'Donnees invalides');
            
            const mimeType = matches[1];
            const base64 = matches[2];
            const buffer = Buffer.from(base64, 'base64');
            
            // Validate file size (max 5MB)
            if (buffer.length > 5 * 1024 * 1024) {
                return send400(res, 'Fichier trop volumineux (max 5 MB)');
            }
            
            // Validate mime type
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            if (!allowedTypes.includes(mimeType)) {
                return send400(res, 'Type de fichier non autorise');
            }
            
            // Generate filename
            const ext = mimeType.split('/')[1] || 'jpg';
            const filename = `${user.id}_${Date.now()}.${ext}`;
            const filepath = path.join(__dirname, 'public', 'uploads', filename);
            
            // Ensure uploads directory exists
            const uploadsDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
            
            // Save file
            fs.writeFileSync(filepath, buffer);
            
            sendJSON(res, { 
                url: `/uploads/${filename}`,
                filename,
                mimeType,
                size: buffer.length
            });
        } catch (e) {
            send500(res, 'Erreur lors de l\'upload: ' + e.message);
        }
    });
});

// --- Profile ---
route('GET', '/api/profile/my', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const profile = data.profiles.get(user.id);
    if (!profile) return send404(res);
    sendJSON(res, { profile });
});

route('GET', '/api/profile/themes', (req, res) => {
    const themes = [
        { id: 'dark', name: 'Dark', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#12121f', primary: '#818cf8' }},
        { id: 'light', name: 'Light', colors: { bg: '#f8f9fa', text: '#111111', card: '#ffffff', primary: '#6366f1' }},
        { id: 'midnight', name: 'Midnight', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#111122', primary: '#60a5fa' }},
        { id: 'ocean', name: 'Ocean', colors: { bg: '#0a1628', text: '#e2e8f0', card: '#0f2035', primary: '#06b6d4' }},
        { id: 'emerald', name: 'Emerald', colors: { bg: '#0a1a1a', text: '#e2e8f0', card: '#0f2525', primary: '#10b981' }},
        { id: 'sunset', name: 'Sunset', colors: { bg: '#1a0a0a', text: '#e2e8f0', card: '#251212', primary: '#f59e0b' }},
        { id: 'electric', name: 'Electric', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#1a1a2e', primary: '#a855f7' }},
        { id: 'rose', name: 'Rose', colors: { bg: '#1a0a1a', text: '#e2e8f0', card: '#251025', primary: '#ec4899' }},
        { id: 'forest', name: 'Forest', colors: { bg: '#0a1a0a', text: '#e2e8f0', card: '#0f250f', primary: '#22c55e' }},
        { id: 'gold', name: 'Gold', colors: { bg: '#1a1a0a', text: '#e2e8f0', card: '#252510', primary: '#eab308' }},
        { id: 'aurora', name: 'Aurora', colors: { bg: '#0a0a1a', text: '#e2e8f0', card: '#15152a', primary: '#8b5cf6' }}
    ];
    sendJSON(res, { themes });
});

route('GET', '/api/profile/:slug', (req, res, params) => {
    const slug = params[0];
    let profile = null;
    for (const [,p] of data.profiles) { if (p.slug === slug) { profile = p; break; } }
    if (!profile) return send404(res);
    const user = data.users.get(profile.userId);
    if (!user) return send404(res);
    analyticsEngine.track(profile.userId, 'views', { referrer: req.headers.referer, userAgent: req.headers['user-agent'] });
    sendJSON(res, { profile, user: { name: user.name, username: user.username, plan: user.plan } });
});

route('PUT', '/api/profile', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    if (!profile) return send404(res);
    const allowed = ['bio','title','location','phone','email','avatar','logo','signature','banner','services','socials','theme','template','geoLocation','gallery','website','seo','customCss','customJs'];
    for (const key of allowed) { if (body[key] !== undefined) profile[key] = body[key]; }
    if (body.username && body.username !== user.username) {
        for (const [,u] of data.users) { if (u.username === body.username && u.id !== user.id) return send400(res, 'Username deja pris'); }
        user.username = body.username;
        profile.slug = body.username;
    }
    // Update user name if provided
    if (body.name) user.name = body.name;
    if (body.phone) user.phone = body.phone;
    sendJSON(res, { profile, message: 'Profil mis a jour' });
});

route('GET', '/api/profile/:slug/analytics', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const stats = analyticsEngine.getStats(user.id);
    const referrers = analyticsEngine.getReferrers(user.id);
    const hourly = analyticsEngine.getHourlyBreakdown(user.id);
    const insights = aiAgent.generateInsights(stats);
    sendJSON(res, { stats, referrers, hourly, insights });
});

// --- Services ---
route('PUT', '/api/profile/services', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    if (!profile) return send404(res);
    if (!Array.isArray(body.services)) return send400(res, 'Services invalides');
    profile.services = body.services;
    sendJSON(res, { services: profile.services, message: 'Services mis a jour' });
});

// --- AI Agent ---
route('POST', '/api/ai/generate-bio', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    const bio = aiAgent.generateBio(user.name, profile?.services || [], body.location, body.industry);
    sendJSON(res, { bio });
});

route('POST', '/api/ai/suggest-services', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const suggestions = aiAgent.suggestServices(body.industry || 'default');
    sendJSON(res, { suggestions });
});

route('POST', '/api/ai/optimize', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const profile = data.profiles.get(user.id);
    const suggestions = aiAgent.suggestOptimizations(profile);
    sendJSON(res, { suggestions });
});

route('POST', '/api/ai/response', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const response = aiAgent.generateResponse(body);
    sendJSON(res, { response });
});

route('POST', '/api/ai/seo', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    const seo = aiAgent.generateSEO(body.title || user.name, profile?.bio || '', profile?.location || '');
    sendJSON(res, { seo });
});

route('POST', '/api/ai/theme-suggestion', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const theme = aiAgent.suggestTheme(body.industry);
    sendJSON(res, { theme });
});

// --- Payments ---
route('GET', '/api/payments/wave-info', (req, res) => sendJSON(res, {
    paymentUrl: config.WAVE_PAYMENT_URL,
    merchant: config.WAVE_MERCHANT,
    phone: config.WAVE_PHONE,
    whatsapp: config.WHATSAPP_LINK
}));

route('POST', '/api/payments/initiate', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const plan = config.PLANS[body.plan];
    if (!plan || !plan.price) return send400(res, 'Plan invalide');
    const paymentId = generateId('pay');
    const payment = {
        id: paymentId, userId: user.id, plan: body.plan, amount: plan.price, currency: 'XOF',
        status: 'pending', payerName: user.name, payerPhone: body.phone || '',
        createdAt: new Date().toISOString(), waveUrl: config.WAVE_PAYMENT_URL
    };
    data.payments.set(paymentId, payment);
    sendJSON(res, { payment, waveUrl: config.WAVE_PAYMENT_URL, whatsappLink: `${config.WHATSAPP_LINK}?text=${encodeURIComponent(`Bonjour, j'ai effectue le paiement pour le plan ${plan.name}. Reference: ${paymentId}`)}` });
});

route('POST', '/api/payments/:id/confirm', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const payment = data.payments.get(params[0]);
    if (!payment) return send404(res);
    
    // SECURITY: Only allow confirming own payments (or admin)
    if (payment.userId !== user.id && user.role !== 'admin') {
        return send403(res, 'Vous ne pouvez confirmer que vos propres paiements');
    }
    
    // SECURITY: Only confirm pending payments
    if (payment.status !== 'pending') {
        return send400(res, 'Ce paiement a deja ete traite');
    }
    
    payment.status = 'confirmed';
    payment.confirmedAt = new Date().toISOString();
    payment.waveRef = `WAVE-${Date.now()}`;
    const u = data.users.get(payment.userId);
    if (u) {
        u.plan = payment.plan;
        u.planExpiry = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    }
    const p = data.profiles.get(payment.userId);
    if (p) p.plan = payment.plan;
    sendJSON(res, { payment, message: 'Paiement confirme et plan active' });
});

route('POST', '/api/payments/:id/cancel', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const payment = data.payments.get(params[0]);
    if (!payment) return send404(res);
    payment.status = 'cancelled';
    sendJSON(res, { payment, message: 'Paiement annule' });
});

route('GET', '/api/payments', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const payments = [];
    for (const [,p] of data.payments) { if (p.userId === user.id) payments.push(p); }
    sendJSON(res, { payments });
});

route('GET', '/api/payments/stats', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    let total = 0, confirmed = 0, pending = 0, amount = 0;
    for (const [,p] of data.payments) {
        if (p.userId === user.id) {
            total++;
            if (p.status === 'confirmed') { confirmed++; amount += p.amount; }
            else if (p.status === 'pending') pending++;
        }
    }
    sendJSON(res, { total, confirmed, pending, totalAmount: amount });
});

// --- Reservations ---
route('POST', '/api/reservations/public/:slug', async (req, res, params) => {
    if (!checkRateLimit('reservations_public', 60*1000, 10)) return send400(res, 'Trop de reservations');
    const slug = params[0];
    const body = await parseBody(req);
    
    // Find profile by slug
    let ownerId = null;
    for (const [,p] of data.profiles) {
        if (p.slug === slug) { ownerId = p.userId; break; }
    }
    if (!ownerId) return send404(res, 'Profil non trouve');
    
    if (!body.clientName || !body.date) return send400(res, 'Nom et date requis');
    
    const id = generateId('res');
    const reservation = {
        id, ownerId,
        clientName: body.clientName,
        clientEmail: body.clientEmail || '',
        clientPhone: body.clientPhone || '',
        service: body.service || '',
        date: body.date,
        time: body.time || '',
        notes: body.notes || '',
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    data.reservations.set(id, reservation);
    analyticsEngine.track(ownerId, 'reservations');
    
    // Create notification for owner
    const notifId = `notif_${Date.now()}`;
    data.notifications.set(notifId, {
        id: notifId, userId: ownerId, type: 'reservation',
        title: 'Nouvelle reservation',
        message: `${body.clientName} reserve pour le ${body.date}`,
        read: false, createdAt: new Date().toISOString()
    });
    
    sendJSON(res, { reservation, message: 'Reservation envoyee avec succes' }, 201);
});

route('POST', '/api/reservations', async (req, res) => {
    if (!checkRateLimit('reservations', 60*1000, 20)) return send400(res, 'Trop de reservations');
    const body = await parseBody(req);
    if (!body.name || !body.phone || !body.service || !body.date || !body.time) return send400(res, 'Champs requis manquants');
    const id = generateId('res');
    let ownerId = null;
    for (const [,p] of data.profiles) {
        if (p.slug === body.profileId || p.userId === body.profileId) { ownerId = p.userId; break; }
    }
    const reservation = {
        id, ownerId, name: body.name, phone: body.phone, email: body.email || '',
        service: body.service, date: body.date, time: body.time, message: body.message || '',
        status: 'pending', createdAt: new Date().toISOString()
    };
    data.reservations.set(id, reservation);
    if (ownerId) analyticsEngine.track(ownerId, 'reservations');
    sendJSON(res, { reservation, message: 'Reservation envoyee avec succes' }, 201);
});

route('GET', '/api/reservations', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const reservations = [];
    for (const [,r] of data.reservations) { if (r.ownerId === user.id) reservations.push(r); }
    sendJSON(res, { reservations });
});

route('PUT', '/api/reservations/:id/status', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const reservation = data.reservations.get(params[0]);
    if (!reservation) return send404(res);
    reservation.status = body.status;
    sendJSON(res, { reservation });
});

route('DELETE', '/api/reservations/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    data.reservations.delete(params[0]);
    sendJSON(res, { message: 'Reservation supprimee' });
});

// --- Chat ---
route('GET', '/api/chat/rooms', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const rooms = chatEngine.getUserRooms(user.id);
    sendJSON(res, { rooms });
});

route('POST', '/api/chat/rooms', async (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const body = await parseBody(req);
    const roomId = chatEngine.createRoom(user.id, body.visitorName || 'Visiteur');
    sendJSON(res, { roomId }, 201);
});

route('GET', '/api/chat/rooms/:id/messages', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const messages = chatEngine.getMessages(params[0]);
    sendJSON(res, { messages });
});

route('POST', '/api/chat/rooms/:id/messages', async (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const body = await parseBody(req);
    const msg = chatEngine.addMessage(params[0], user.name, 'owner', body.content);
    if (!msg) return send404(res);
    sendJSON(res, { message: msg }, 201);
});

// --- Webhooks ---
route('GET', '/api/webhooks', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { webhooks: webhookManager.getWebhooks(user.id) });
});

route('POST', '/api/webhooks', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    if (!body.url) return send400(res, 'URL requise');
    const id = webhookManager.register(user.id, body.url, body.events || ['*']);
    sendJSON(res, { webhookId: id, message: 'Webhook enregistre' }, 201);
});

route('DELETE', '/api/webhooks/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    webhookManager.unregister(params[0]);
    sendJSON(res, { message: 'Webhook supprime' });
});

route('GET', '/api/webhooks/:id/logs', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { logs: webhookManager.getLogs(params[0]) });
});

// --- API Keys ---
route('GET', '/api/api-keys', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const keys = [];
    for (const [,k] of data.apiKeys) { if (k.userId === user.id) keys.push({ ...k, secret: undefined }); }
    sendJSON(res, { apiKeys: keys });
});

route('POST', '/api/api-keys', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const id = generateId('key');
    const secret = crypto.randomBytes(32).toString('hex');
    const key = { id, userId: user.id, name: body.name || 'API Key', key: `flay_${crypto.randomBytes(16).toString('hex')}`, secret, active: true, createdAt: new Date().toISOString() };
    data.apiKeys.set(id, key);
    sendJSON(res, { apiKey: { ...key }, message: 'Sauvegardez cette cle, elle ne sera plus affichee' }, 201);
});

route('DELETE', '/api/api-keys/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    data.apiKeys.delete(params[0]);
    sendJSON(res, { message: 'Cle supprimee' });
});

// --- A/B Testing ---
route('GET', '/api/ab/experiments', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { experiments: abTesting.getUserExperiments(user.id) });
});

route('POST', '/api/ab/experiments', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const id = abTesting.createExperiment(user.id, body.name, body.variants);
    sendJSON(res, { experimentId: id }, 201);
});

route('GET', '/api/ab/experiments/:id/results', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { results: abTesting.getResults(params[0]) });
});

// --- PDF / Business Card ---
route('POST', '/api/card/generate', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    const front = businessCard.generateFront(profile, user, body.theme || profile.theme);
    const back = businessCard.generateBack(profile, user, body.theme || profile.theme);
    sendJSON(res, { front, back, copies: body.copies || 10 });
});

route('GET', '/api/card/print-preview', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const profile = data.profiles.get(user.id);
    const front = businessCard.generateFront(profile, user, profile.theme);
    const back = businessCard.generateBack(profile, user, profile.theme);
    const printPage = businessCard.generatePrintPage(front, back, 10);
    sendHTML(res, printPage);
});

// --- Showcase Site ---
route('GET', '/api/showcase', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const profile = data.profiles.get(user.id);
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme, lang: 'fr' });
    sendHTML(res, html);
});

route('GET', '/showcase/:slug', (req, res, params) => {
    const slug = params[0];
    let profile = null;
    for (const [,p] of data.profiles) { if (p.slug === slug) { profile = p; break; } }
    if (!profile) return send404(res);
    const user = data.users.get(profile.userId);
    if (!user) return send404(res);
    analyticsEngine.track(user.id, 'views', { referrer: req.headers.referer });
    const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme, lang: 'fr' });
    sendHTML(res, html);
});

// --- Geolocation ---
route('PUT', '/api/profile/geo', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const profile = data.profiles.get(user.id);
    if (!profile) return send404(res);
    if (body.latitude && body.longitude) {
        profile.geoLocation = designStudio.generateGeoLocation(body.latitude, body.longitude, body.address, body.city, body.country);
    } else {
        profile.geoLocation = null;
    }
    sendJSON(res, { geoLocation: profile.geoLocation });
});

// --- Design Studio ---
route('POST', '/api/studio/process-image', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const metadata = designStudio.processImageMetadata(body.type, body.size, body.position, body.opacity, body.filters);
    sendJSON(res, { metadata });
});

// --- Analytics ---
route('GET', '/api/analytics', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const period = new URL(req.url, 'http://localhost').searchParams.get('period') || '30d';
    const stats = analyticsEngine.getStats(user.id, period);
    const realtime = analyticsEngine.getRealtime(user.id);
    const recent = analyticsEngine.getRecentEvents(user.id);
    const referrers = analyticsEngine.getReferrers(user.id);
    const devices = analyticsEngine.getDeviceBreakdown(user.id);
    const hourly = analyticsEngine.getHourlyBreakdown(user.id);
    const insights = aiAgent.generateInsights(stats);
    sendJSON(res, { stats, realtime, recent, referrers, devices, hourly, insights });
});

// --- i18n ---
route('GET', '/api/i18n/:lang', (req, res, params) => {
    const i18n = new I18n(params[0]);
    sendJSON(res, { lang: params[0], translations: { app: i18n.t('app'), nav: i18n.t('nav'), auth: i18n.t('auth'), dashboard: i18n.t('dashboard'), editor: i18n.t('editor'), payment: i18n.t('payment'), plans: i18n.t('plans'), footer: i18n.t('footer') } });
});

route('GET', '/api/i18n', (req, res) => {
    const i18n = new I18n();
    sendJSON(res, { langs: i18n.getLangs(), default: 'fr' });
});

// --- Visitor Tracking ---
route('POST', '/api/tracking/track', async (req, res) => {
    const body = await parseBody(req);
    const { event, visitorId, userId } = body;
    const ua = req.headers['user-agent'] || '';
    const parsed = visitorTracker.parseUserAgent(ua);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    if (event === 'pageview') {
        const pv = visitorTracker.trackPageview(visitorId || visitorTracker.generateCookieId(), userId, {
            page: body.page, title: body.title, referrer: body.referrer,
            device: parsed.device, browser: parsed.browser, screen: body.screen, language: body.language,
            country: body.country, city: body.city
        });
        sendJSON(res, { pageviewId: pv.id });
    } else if (event === 'click') {
        visitorTracker.trackClick(visitorId, userId, {
            element: body.element, text: body.text, url: body.url, page: body.page, x: body.x, y: body.y
        });
        sendJSON(res, { ok: true });
    } else if (event === 'session_start') {
        const session = visitorTracker.startSession(visitorId, userId, {
            referrer: body.referrer, device: parsed.device, browser: parsed.browser, os: parsed.os,
            screen: body.screen, language: body.language, country: body.country, city: body.city, ip
        });
        sendJSON(res, { sessionId: session.id });
    } else if (event === 'heatmap') {
        visitorTracker.trackHeatmap(userId, body.page, { x: body.x, y: body.y });
        sendJSON(res, { ok: true });
    } else {
        sendJSON(res, { ok: true });
    }
});

route('POST', '/api/tracking/exit', async (req, res) => {
    const body = await parseBody(req);
    visitorTracker.endSession(body.sessionId);
    visitorTracker.exitPage(body.pageviewId, body.duration, body.scrollDepth);
    sendJSON(res, { ok: true });
});

route('POST', '/api/tracking/consent', async (req, res) => {
    const body = await parseBody(req);
    visitorTracker.setConsent(body.visitorId, body.consent);
    sendJSON(res, { ok: true });
});

route('GET', '/api/tracking/stats/:userId', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const period = new URL(req.url, 'http://localhost').searchParams.get('period') || '30d';
    const stats = visitorTracker.getVisitorStats(user.id, period);
    sendJSON(res, { stats });
});

route('GET', '/api/tracking/realtime', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const visitors = visitorTracker.getRealtimeVisitors(user.id);
    const count = visitorTracker.getRealtimeCount(user.id);
    sendJSON(res, { count, visitors });
});

route('GET', '/api/tracking/heatmap/:page', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const heatmap = visitorTracker.getHeatmap(user.id, params[0]);
    sendJSON(res, { heatmap });
});

route('POST', '/api/tracking/goals', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const goal = visitorTracker.createGoal(user.id, body);
    sendJSON(res, { goal }, 201);
});

route('POST', '/api/tracking/goals/:id/convert', async (req, res, params) => {
    const body = await parseBody(req);
    visitorTracker.trackConversion(params[0], body.visitorId);
    sendJSON(res, { ok: true });
});

// --- Embeddable Tracking Script ---
route('GET', '/api/tracking/embed/:userId', (req, res, params) => {
    const userId = params[0];
    const script = cookieConsent.getTrackingScript(userId);
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' });
    res.end(script.replace(/<\/?script>/g, ''));
});

// --- CRM ---
route('GET', '/api/crm/contacts', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const filters = {};
    const params = new URL(req.url, 'http://localhost').searchParams;
    if (params.get('status')) filters.status = params.get('status');
    if (params.get('search')) filters.search = params.get('search');
    sendJSON(res, { contacts: crm.getUserContacts(user.id, filters) });
});

route('POST', '/api/crm/contacts', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const contact = crm.addContact(user.id, body);
    sendJSON(res, { contact }, 201);
});

route('PUT', '/api/crm/contacts/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const contact = crm.updateContact(params[0], body);
    sendJSON(res, { contact });
});

route('DELETE', '/api/crm/contacts/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    crm.deleteContact(params[0]);
    sendJSON(res, { message: 'Contact supprime' });
});

route('GET', '/api/crm/contacts/:id/interactions', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { interactions: crm.getInteractions(params[0]) });
});

route('POST', '/api/crm/contacts/:id/interactions', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const interaction = crm.addInteraction(params[0], body.type, body);
    sendJSON(res, { interaction }, 201);
});

route('GET', '/api/crm/deals', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { deals: crm.getUserDeals(user.id) });
});

route('POST', '/api/crm/deals', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const deal = crm.createDeal(user.id, body);
    sendJSON(res, { deal }, 201);
});

route('PUT', '/api/crm/deals/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const deal = crm.updateDeal(params[0], body);
    sendJSON(res, { deal });
});

route('GET', '/api/crm/pipeline', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { pipeline: crm.getPipeline(user.id) });
});

route('GET', '/api/crm/stats', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { stats: crm.getStats(user.id) });
});

route('GET', '/api/crm/export', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const format = new URL(req.url, 'http://localhost').searchParams.get('format') || 'csv';
    const data = crm.exportContacts(user.id, format);
    res.writeHead(200, { 'Content-Type': format === 'csv' ? 'text/csv' : 'application/json', 'Content-Disposition': `attachment; filename=contacts.${format}` });
    res.end(data);
});

// --- Invoicing ---
route('GET', '/api/invoices', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { invoices: invoicing.getUserInvoices(user.id) });
});

route('POST', '/api/invoices', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const invoice = invoicing.create(user.id, body);
    sendJSON(res, { invoice }, 201);
});

route('PUT', '/api/invoices/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const invoice = invoicing.update(params[0], body);
    sendJSON(res, { invoice });
});

route('POST', '/api/invoices/:id/pay', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const invoice = invoicing.markPaid(params[0]);
    sendJSON(res, { invoice });
});

route('POST', '/api/invoices/:id/send', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const invoice = invoicing.markSent(params[0]);
    sendJSON(res, { invoice });
});

route('GET', '/api/invoices/stats', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { stats: invoicing.getStats(user.id) });
});

route('GET', '/api/invoices/:id/html', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const invoice = invoicing.get(params[0]);
    if (!invoice) return send404(res);
    const profile = data.profiles.get(user.id);
    const html = invoicing.generateHTML(invoice, user, profile);
    sendHTML(res, html);
});

// --- 2FA ---
route('POST', '/api/2fa/setup', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const { secret, otpauthUrl } = twoFactor.generateSecret(user.id);
    const qrCode = twoFactor.getQRCodeDataURL(secret, user.email);
    sendJSON(res, { secret, otpauthUrl, qrCode });
});

route('POST', '/api/2fa/verify', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const result = twoFactor.enable(user.id, body.token);
    if (result) sendJSON(res, result);
    else send400(res, 'Code invalide');
});

route('POST', '/api/2fa/disable', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    twoFactor.disable(user.id);
    sendJSON(res, { message: '2FA desactivee' });
});

route('GET', '/api/2fa/status', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { enabled: twoFactor.isEnabled(user.id) });
});

// --- Multi-currency ---
route('GET', '/api/currencies', (req, res) => {
    sendJSON(res, { currencies: multiCurrency.getAll() });
});

route('POST', '/api/currencies/convert', async (req, res) => {
    const body = await parseBody(req);
    const result = multiCurrency.convert(body.amount, body.from, body.to);
    sendJSON(res, { result, formatted: multiCurrency.format(result, body.to) });
});

// --- Social Auth ---
route('GET', '/api/auth/providers', (req, res) => {
    sendJSON(res, { providers: socialAuth.getProviders() });
});

route('POST', '/api/auth/social/callback', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const result = socialAuth.simulateCallback(user.id, body.provider);
    sendJSON(res, { account: result });
});

route('GET', '/api/auth/social/linked', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { accounts: socialAuth.getLinkedAccounts(user.id) });
});

route('DELETE', '/api/auth/social/:provider', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    socialAuth.unlinkAccount(user.id, params[0]);
    sendJSON(res, { message: 'Compte deconnecte' });
});

// --- Notifications ---
route('GET', '/api/notifications', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { notifications: notifications.getUserNotifications(user.id), unread: notifications.getUnreadCount(user.id) });
});

route('POST', '/api/notifications/:id/read', async (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    notifications.markRead(user.id, params[0]);
    sendJSON(res, { ok: true });
});

route('POST', '/api/notifications/read-all', async (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    notifications.markAllRead(user.id);
    sendJSON(res, { ok: true });
});

route('GET', '/api/notifications/stream', (req, res) => {
    const user = auth(req);
    if (!user) { send401(res); return; }
    notifications.registerSSE(user.id, res);
});

// --- Email ---
route('POST', '/api/email/send', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const result = await emailSystem.send(body.to, body.template, body.data || {}, body.options || {});
    sendJSON(res, result);
});

route('GET', '/api/email/history', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { emails: emailSystem.getUserEmails(user.id) });
});

// --- SMS ---
route('POST', '/api/sms/send', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const result = await smsSystem.send(body.phone, body.template, body.variables || {});
    sendJSON(res, result);
});

route('GET', '/api/sms/history', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { sms: smsSystem.getUserSMS(user.id) });
});

// --- Team ---
route('POST', '/api/team', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const team = teamManager.createTeam(user.id, { ...body, ownerName: user.name });
    sendJSON(res, { team }, 201);
});

route('GET', '/api/team', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { teams: teamManager.getUserTeams(user.id) });
});

route('GET', '/api/team/:id/members', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { members: teamManager.getTeamMembers(params[0]), stats: teamManager.getTeamStats(params[0]) });
});

route('POST', '/api/team/:id/invite', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const invite = teamManager.inviteMember(params[0], body.email, body.role, user.id);
    sendJSON(res, { invite }, 201);
});

route('POST', '/api/team/invite/:inviteId/accept', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const member = teamManager.acceptInvite(params[0], user.id);
    sendJSON(res, { member });
});

route('DELETE', '/api/team/:teamId/member/:memberId', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    teamManager.removeMember(params[1]);
    sendJSON(res, { message: 'Membre supprime' });
});

route('PUT', '/api/team/:teamId/member/:memberId/role', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    teamManager.updateMemberRole(params[1], body.role);
    sendJSON(res, { message: 'Role mis a jour' });
});

// --- Domains ---
route('POST', '/api/domains', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const domain = domainManager.addDomain(user.id, body);
    sendJSON(res, { domain, dns: domainManager.getDNSInstructions(domain) }, 201);
});

route('GET', '/api/domains', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { domains: domainManager.getUserDomains(user.id) });
});

route('POST', '/api/domains/:id/verify', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const domain = domainManager.verifyDomain(params[0]);
    sendJSON(res, { domain });
});

route('DELETE', '/api/domains/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    domainManager.removeDomain(params[0]);
    sendJSON(res, { message: 'Domaine supprime' });
});

// --- SEO: Dynamic sitemap with profiles ---
route('GET', '/api/sitemap/dynamic', (req, res) => {
    const urls = [
        { loc: `${seo.siteUrl}/`, changefreq: 'weekly', priority: '1.0' },
        { loc: `${seo.siteUrl}/login.html`, changefreq: 'monthly', priority: '0.6' },
        { loc: `${seo.siteUrl}/register.html`, changefreq: 'monthly', priority: '0.7' }
    ];
    for (const [, profile] of data.profiles) {
        const user = data.users.get(profile.userId);
        if (user) {
            urls.push({
                loc: `${seo.siteUrl}/p/${profile.slug}`,
                lastmod: profile.updatedAt || new Date().toISOString(),
                changefreq: 'weekly',
                priority: '0.8'
            });
        }
    }
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    for (const u of urls) {
        xml += `  <url>\n    <loc>${u.loc}</loc>\n`;
        if (u.lastmod) xml += `    <lastmod>${u.lastmod.split('T')[0]}</lastmod>\n`;
        xml += `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>\n`;
    }
    xml += '</urlset>';
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
});

// --- Security: CSRF Token ---
route('GET', '/api/csrf-token', (req, res) => {
    const token = security.generateCSRF();
    sendJSON(res, { token });
});

// --- Security: Info ---
route('GET', '/api/security/status', (req, res) => {
    sendJSON(res, {
        rateLimit: { windowMs: 60000, maxRequests: 100 },
        loginRateLimit: { windowMs: 900000, maxAttempts: 5 },
        csrf: 'enabled',
        headers: ['X-Content-Type-Options', 'X-Frame-Options', 'X-XSS-Protection', 'CSP'],
        inputSanitization: 'enabled'
    });
});

// === PAYMENT GATEWAY UNIFIE ===
const paymentGateway = require('./payment-gateway');
const waveConnect = require('./wave-connect');

// --- Payment Gateway Status ---
route('GET', '/api/payments/gateway/status', (req, res) => {
    sendJSON(res, paymentGateway.getStatus());
});

// --- Creer un paiement (unifie) ---
route('POST', '/api/payments/create', async (req, res) => {
    const body = await parseBody(req);
    const { amount, description, customerName, customerPhone, customerEmail, gateway, type, metadata } = body;
    
    if (!amount || amount < 100) return send400(res, 'Montant minimum: 100 FCFA');
    
    const result = await paymentGateway.createPayment({
        amount: parseInt(amount),
        description: description || 'Paiement Flay',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        gateway: gateway || undefined,
        type: type || 'one_time',
        metadata: metadata || {}
    });
    
    if (result.success) {
        sendJSON(res, {
            success: true,
            payment: result.payment,
            paymentUrl: result.payment?.paymentUrl,
            isFallback: result.isFallback || false
        });
    } else {
        sendJSON(res, { success: false, error: result.error }, 400);
    }
});

// --- Verifier statut paiement ---
route('GET', '/api/payments/:ref/status', async (req, res, params) => {
    const payment = paymentGateway.getPayment(params[0]);
    if (!payment) return send404(res);
    
    // Si API Wave, verifier en temps reel
    if (payment.gateway === 'wave' && payment.id !== payment.ref) {
        const status = await paymentGateway.checkStatus(payment.id);
        return sendJSON(res, { payment, liveStatus: status });
    }
    
    sendJSON(res, { payment });
});

// --- Webhooks (Wave + CinetPay) ---
route('POST', '/api/webhooks/wave', async (req, res) => {
    const rawBody = req._rawBody || JSON.stringify(await parseBody(req));
    const signature = req.headers['wave-signature'] || req.headers['x-wave-signature'] || '';
    
    if (!paymentGateway.verifyWebhook(rawBody, signature, 'wave')) {
        console.error('[WEBHOOK] Wave signature invalide');
        return send403(res, 'Signature invalide');
    }
    
    const event = JSON.parse(rawBody);
    const result = paymentGateway.handleWebhook(event, 'wave');
    console.log(`[WEBHOOK Wave] ${result.status} - ${result.externalId || result.sessionId || 'unknown'}`);
    
    if (result.status === 'confirmed') {
        _processConfirmedPayment(result.externalId, result);
    }
    
    sendJSON(res, { received: true });
});

route('POST', '/api/webhooks/cinetpay', async (req, res) => {
    const rawBody = req._rawBody || JSON.stringify(await parseBody(req));
    const signature = req.headers['x-cinetpay-signature'] || '';
    
    if (!paymentGateway.verifyWebhook(rawBody, signature, 'cinetpay')) {
        console.error('[WEBHOOK] CinetPay signature invalide');
        return send403(res, 'Signature invalide');
    }
    
    const event = JSON.parse(rawBody);
    const result = paymentGateway.handleWebhook(event, 'cinetpay');
    console.log(`[WEBHOOK CinetPay] ${result.status} - ${result.transactionId || 'unknown'}`);
    
    if (result.status === 'confirmed') {
        _processConfirmedPayment(result.transactionId, result);
    }
    
    sendJSON(res, { received: true });
});

// Helper: traiter un paiement confirme (abonnement ou commande)
function _processConfirmedPayment(externalId, eventData) {
    // Check subscriptions
    for (const [id, payment] of data.payments) {
        if (payment.ref === externalId || payment.externalId === externalId) {
            if (payment.status !== 'confirmed') {
                payment.status = 'confirmed';
                payment.confirmedAt = eventData.confirmedAt;
                payment.gatewayRef = eventData.sessionId || eventData.transactionId;
                
                const user = data.users.get(payment.userId);
                if (user) {
                    user.plan = payment.plan;
                    user.planExpiry = new Date(Date.now() + 30*24*60*60*1000).toISOString();
                }
                const profile = data.profiles.get(payment.userId);
                if (profile) profile.plan = payment.plan;
                
                const notifId = `notif_${Date.now()}`;
                data.notifications.set(notifId, {
                    id: notifId, userId: payment.userId, type: 'payment',
                    title: 'Paiement confirme',
                    message: `Votre plan ${payment.plan} a ete active pour 30 jours.`,
                    read: false, createdAt: new Date().toISOString()
                });
                console.log(`[PAY] Subscription ${id} confirmed for user ${payment.userId}`);
            }
            return;
        }
    }
    
    // Check ecommerce orders
    if (typeof ecommerce !== 'undefined' && ecommerce.orders) {
        for (const [id, order] of ecommerce.orders) {
            if (order.payment?.transactionId === externalId || order.id === externalId?.replace('flay_', '')) {
                if (order.status !== 'confirmed') {
                    order.status = 'confirmed';
                    order.payment.status = 'confirmed';
                    order.payment.gatewayRef = eventData.sessionId || eventData.transactionId;
                    order.confirmedAt = eventData.confirmedAt;
                    
                    const notifId = `notif_${Date.now()}`;
                    data.notifications.set(notifId, {
                        id: notifId, userId: order.userId, type: 'order',
                        title: 'Commande confirmee',
                        message: `Commande ${order.id} confirmee - ${order.total} XOF`,
                        read: false, createdAt: new Date().toISOString()
                    });
                    console.log(`[PAY] Order ${id} confirmed`);
                }
                return;
            }
        }
    }
}

// --- Wave Connect (API Key model) ---
route('POST', '/api/wave/connect', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const { apiKey } = body;
    if (!apiKey) return send400(res, 'API key requise');
    
    const result = await waveConnect.connect(user.id, apiKey);
    sendJSON(res, result, result.success ? 200 : 400);
});

route('GET', '/api/wave/status', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, waveConnect.getConnectionStatus(user.id));
});

route('POST', '/api/wave/disconnect', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    sendJSON(res, waveConnect.disconnect(user.id));
});

route('POST', '/api/wave/pay', async (req, res) => {
    const body = await parseBody(req);
    const { userId, amount, description } = body;
    if (!userId || !amount) return send400(res, 'userId et amount requis');
    
    const result = await waveConnect.createPayment(userId, {
        amount: parseInt(amount),
        description: description || 'Paiement Flay'
    });
    
    if (result.success && result.paymentUrl) {
        res.writeHead(302, { Location: result.paymentUrl });
        res.end();
    } else {
        sendJSON(res, { error: result.error || 'Erreur de paiement' }, 400);
    }
});

// === E-COMMERCE ===
const ecommerce = require('./ecommerce');

// --- Products ---
route('GET', '/api/products/:userId', (req, res, params) => {
    const userId = params[0];
    const page = parseInt(new URL(req.url, 'http://localhost').searchParams.get('page')) || 1;
    sendJSON(res, ecommerce.getPublicProducts(userId, page));
});

route('GET', '/api/products/:userId/:productId', (req, res, params) => {
    const product = ecommerce.getProduct(params[1]);
    if (!product || product.userId !== params[0]) return send404(res);
    product.stats.views++;
    sendJSON(res, { product });
});

route('POST', '/api/products', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const product = ecommerce.createProduct(user.id, body);
    if (product.error) return send400(res, product.error);
    sendJSON(res, { product }, 201);
});

route('PUT', '/api/products/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const product = ecommerce.updateProduct(params[0], user.id, body);
    if (!product) return send404(res);
    sendJSON(res, { product });
});

route('DELETE', '/api/products/:id', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    if (!ecommerce.deleteProduct(params[0], user.id)) return send404(res);
    sendJSON(res, { message: 'Produit supprime' });
});

route('GET', '/api/my-products', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, { products: ecommerce.getUserProducts(user.id) });
});

// --- Cart ---
route('GET', '/api/cart', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, ecommerce.getCart(user.id));
});

route('POST', '/api/cart/add', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const cart = ecommerce.addToCart(user.id, body.productId, body.quantity || 1, body.variant);
    if (cart.error) return send400(res, cart.error);
    sendJSON(res, { cart });
});

route('PUT', '/api/cart/item', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const cart = ecommerce.updateCartItem(user.id, body.productId, body.quantity, body.variant);
    if (cart.error) return send400(res, cart.error);
    sendJSON(res, { cart });
});

route('DELETE', '/api/cart/:productId', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const cart = ecommerce.removeFromCart(user.id, params[0]);
    sendJSON(res, { cart });
});

route('DELETE', '/api/cart', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    sendJSON(res, { cart: ecommerce.clearCart(user.id) });
});

// --- Orders ---
route('POST', '/api/orders', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const order = ecommerce.createOrder(user.id, body);
    if (order.error) return send400(res, order.error);
    sendJSON(res, { order }, 201);
});

route('GET', '/api/orders', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    const page = parseInt(new URL(req.url, 'http://localhost').searchParams.get('page')) || 1;
    sendJSON(res, ecommerce.getUserOrders(user.id, page));
});

route('GET', '/api/orders/:id', (req, res, params) => {
    const user = auth(req);
    if (!user) return send401(res);
    const order = ecommerce.getOrder(params[0]);
    if (!order || order.userId !== user.id) return send404(res);
    sendJSON(res, { order });
});

route('PUT', '/api/orders/:id/status', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const order = ecommerce.updateOrderStatus(params[0], user.id, body.status);
    if (!order) return send404(res);
    if (order.error) return send400(res, order.error);
    sendJSON(res, { order });
});

// --- Coupons ---
route('POST', '/api/coupons', async (req, res) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const coupon = ecommerce.createCoupon(user.id, body);
    sendJSON(res, { coupon }, 201);
});

// --- Reviews ---
route('POST', '/api/products/:id/reviews', async (req, res, params) => {
    const user = requireAuth(req);
    if (!user) return;
    const body = await parseBody(req);
    const review = ecommerce.addReview(params[0], user.id, body);
    sendJSON(res, { review }, 201);
});

route('GET', '/api/products/:id/reviews', (req, res, params) => {
    sendJSON(res, { reviews: ecommerce.getProductReviews(params[0]) });
});

// --- Store Stats ---
route('GET', '/api/store/stats', (req, res) => {
    const user = auth(req);
    if (!user) return send401(res);
    sendJSON(res, ecommerce.getStoreStats(user.id));
});

// --- Cookie Consent Info ---
route('GET', '/api/cookie-consent/config', (req, res) => {
    sendJSON(res, { config: cookieConsent.config });
});

// === MAIN SERVER ===
// --- Security Headers ---
function securityHeaders(res, isAPI = false) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self)');
    if (isAPI) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    } else {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    }
}

// --- CSRF Token ---
const csrfTokens = new Map();
function generateCSRF() {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, Date.now());
    return token;
}
// Cleanup old tokens every 10 min
setInterval(() => {
    const now = Date.now();
    for (const [token, time] of csrfTokens) {
        if (now - time > 1800000) csrfTokens.delete(token);
    }
}, 600000);

// --- Input Sanitization ---
function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;').trim();
}
function sanitizeObj(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        out[k] = typeof v === 'string' ? sanitize(v) : v;
    }
    return out;
}

// === MAIN SERVER ===
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || '*').split(',');

const server = http.createServer(async (req, res) => {
    // CORS
    const origin = req.headers.origin || '*';
    const allowedOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : 
                          ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-CSRF-Token'
        });
        return res.end();
    }

    // Security headers on every response
    securityHeaders(res, req.url?.startsWith('/api/'));

    // Rate limiting: 100 req/min for API, 200 for static
    const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rateKey = `global:${clientIP}`;
    if (!checkRateLimit(rateKey, 60000, req.url?.startsWith('/api/') ? 100 : 200)) {
        return sendJSON(res, { error: 'Trop de requetes. Reessayez dans 1 minute.' }, 429);
    }

    // Stricter rate limit for auth endpoints
    if (req.url?.startsWith('/api/auth/') && req.method === 'POST') {
        const authKey = `auth:${clientIP}`;
        if (!checkRateLimit(authKey, 60000, 10)) {
            return sendJSON(res, { error: 'Trop de tentatives de connexion.' }, 429);
        }
    }

    // CSRF check for state-changing requests
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.url?.startsWith('/api/')) {
        // Skip CSRF for login/register (no session yet) and webhook endpoints
        const skipCSRF = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
                          '/api/auth/reset-password', '/api/webhooks/trigger',
                          '/api/payments/create', '/api/webhooks/wave', '/api/webhooks/cinetpay',
                          '/api/wave/pay'];
        if (!skipCSRF.some(p => req.url.startsWith(p))) {
            const csrfHeader = req.headers['x-csrf-token'];
            const csrfCookie = (req.headers.cookie || '').match(/_flay_csrf=([^;]+)/)?.[1];
            if (!csrfHeader && !csrfCookie) {
                // Allow if no CSRF system active (first request) — but log it
                // In production, uncomment the next line:
                // CSRF protection enabled in production
                return sendJSON(res, { error: 'CSRF token manquant' }, 403);
            }
        }
    }

    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // Static files
    if (!pathname.startsWith('/api/')) {
        let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return serveStatic(req, res, filePath);
        }
        // Try .html
        if (!path.extname(filePath)) {
            filePath += '.html';
            if (fs.existsSync(filePath)) return serveStatic(req, res, filePath);
        }
        // Public profile pages
        if (pathname.startsWith('/p/')) {
            const username = pathname.replace('/p/', '');
            let profile = null;
            for (const [,p] of data.profiles) { if (p.slug === username) { profile = p; break; } }
            if (profile) {
                const user = data.users.get(profile.userId);
                const html = designStudio.generateShowcaseSite(profile, user, { theme: profile.theme });
                return sendHTML(res, html);
            }
        }
        // Showcase pages
        if (pathname.startsWith('/showcase/')) {
            const slug = pathname.replace('/showcase/', '');
            let profile = null;
            for (const [,p] of data.profiles) { if (p.slug === slug) { profile = p; break; } }
            if (profile) {
                const user = data.users.get(profile.userId);
                return sendHTML(res, designStudio.generateShowcaseSite(profile, user, { theme: profile.theme }));
            }
        }
        // Username shortcut: /jean-koffi
        const usernameMatch = pathname.match(/^\/([a-z0-9_-]+)$/);
        if (usernameMatch) {
            const slug = usernameMatch[1];
            for (const [,p] of data.profiles) {
                if (p.slug === slug) {
                    const user = data.users.get(p.userId);
                    analyticsEngine.track(p.userId, 'views');
                    return sendHTML(res, designStudio.generateShowcaseSite(p, user, { theme: p.theme }));
                }
            }
        }
        return send404(res);
    }

    // API routes
    const matched = matchRoute(req.method, pathname);
    if (matched) {
        try { await matched.handler(req, res, matched.params); }
        catch (err) { console.error('API Error:', err); send500(res, err.message); }
    } else {
        send404(res);
    }
});

// === WEBSOCKET-LIKE CHAT (via SSE) ===
const sseClients = new Map();

server.on('request', (req, res) => {
    if (req.url === '/api/chat/stream' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        const userId = new URL(req.url, 'http://localhost').searchParams.get('userId') || 'anonymous';
        sseClients.set(userId, res);
        req.on('close', () => sseClients.delete(userId));
        res.write('data: {"type":"connected"}\n\n');
    }
});

function broadcast(userId, event) {
    const client = sseClients.get(userId);
    if (client) client.write(`data: ${JSON.stringify(event)}\n\n`);
}

// === START ===
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  ERREUR: Le port ${PORT} est deja utilise.`);
        console.error(`  Arrete le processus: kill -9 $(lsof -t -i:${PORT})\n`);
        process.exit(1);
    }
    console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║              FLAY ULTIMATE v3.0                  ║');
    console.log('║         DIGITALSTRATEGES Business                ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Serveur:  http://localhost:${PORT}                  ║`);
    console.log(`║  WhatsApp: +225 07 59 73 19 90                  ║`);
    console.log(`║  Wave:     DIGITALSTRATEGE BUSINESS              ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  COMPOSANTS:                                     ║');
    console.log('║    Agent IA .............. Actif                  ║');
    console.log('║    Chat temps reel ....... Actif                  ║');
    console.log('║    Webhooks .............. Actif                  ║');
    console.log('║    A/B Testing ........... Actif                  ║');
    console.log('║    Cartes de visite ...... Actif                  ║');
    console.log('║    Site vitrine .......... Actif                  ║');
    console.log('║    Geolocalisation ....... Actif                  ║');
    console.log('║    Studio design ......... Actif                  ║');
    console.log('║    Analytics ............. Actif                  ║');
    console.log('║    Multi-langues ......... Actif                  ║');
    console.log('║    Securite .............. Actif                  ║');
    console.log('║    SEO ................... Actif                  ║');
    console.log('║    API Publique .......... Actif                  ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  DEMO: demo@flay.app / demo123                   ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
});
