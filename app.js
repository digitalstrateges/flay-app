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

// Trust proxy for correct IP behind reverse proxy
app.set('trust proxy', 1);

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

// === PWA ===
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
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
        // Long cache for hashed assets, short for HTML
        if (ext === '.html') res.setHeader('Cache-Control', 'no-cache');
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

// === I18N MIDDLEWARE ===
const I18n = require('./i18n');
app.use((req, res, next) => {
    req.lang = I18n.detect(req);
    next();
});

// Language switcher
app.get('/lang/:lang', (req, res) => {
    const lang = ['fr', 'en'].includes(req.params.lang) ? req.params.lang : 'fr';
    res.setHeader('Set-Cookie', `lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`);
    res.redirect(req.query.redirect || '/');
});

// === E-COMMERCE PUBLIC PAGES ===
const ecommerce = require('./ecommerce');
const ecommerceDB = require('./db');

app.get('/store/:userId', (req, res) => {
    const user = ecommerceDB.get('users', req.params.userId);
    if (!user) return res.status(404).send('Boutique non trouvee');
    const page = parseInt(req.query.page) || 1;
    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    const products = ecommerce.getPublicProducts(req.params.userId, page, 20, filters);
    const categories = ecommerce.getActiveCategories(req.params.userId);
    const storeInfo = { storeName: user.name, storeDescription: '' };
    const profile = ecommerceDB.findBy('profiles', 'userId', req.params.userId);
    if (profile) { storeInfo.storeDescription = profile.bio; storeInfo.profileSlug = profile.slug; }
    const html = ecommerce.generateStorePage(req.params.userId, products, categories, storeInfo);
    res.send(html);
});

app.get('/product/:id', (req, res) => {
    const product = ecommerce.getProduct(req.params.id);
    if (!product) return res.status(404).send('Produit non trouve');
    const user = ecommerceDB.get('users', product.userId);
    const storeInfo = { storeName: user?.name || 'Boutique' };
    const stats = typeof product.stats === 'string' ? JSON.parse(product.stats) : (product.stats || {});
    stats.views = (stats.views || 0) + 1;
    ecommerceDB.update('products', product.id, { stats: JSON.stringify(stats) });
    const html = ecommerce.generateProductPage(product, storeInfo);
    res.send(html);
});

app.get('/cart', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.redirect('/login.html?redirect=/checkout.html');
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.redirect('/login.html?redirect=/checkout.html');
    const html = ecommerce.generateCartPage(payload.userId);
    res.send(html);
});

// --- Public tracking page ---
app.get('/track/:trackingNumber', (req, res) => {
    const parcel = ecommerce.getParcelByTracking(req.params.trackingNumber);
    if (!parcel) return res.status(404).send(`
        <!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Colis non trouve | Flay</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a1a;color:#e2e8f0}
        .card{background:#12121f;padding:3rem;border-radius:16px;text-align:center;max-width:480px;width:90%}
        h1{color:#f87171;margin-bottom:1rem}.btn{display:inline-block;margin-top:1.5rem;padding:.75rem 2rem;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none}
        </style></head><body><div class="card"><h1>Colis non trouve</h1>
        <p>Verifiez votre numero de suivi et reessayez.</p><a href="/" class="btn">Retour a l'accueil</a></div></body></html>
    `);
    const order = ecommerceDB.get('orders', parcel.orderId);
    const statusLabels = { preparation: 'Preparation', shipped: 'Expedie', in_transit: 'En transit', delivered: 'Livree', cancelled: 'Annule' };
    const statusIcons = { preparation: '📦', shipped: '🚚', in_transit: '✈️', delivered: '✅', cancelled: '❌' };
    const history = typeof parcel.history === 'string' ? JSON.parse(parcel.history) : (parcel.history || []);
    const qrUrl = require('./auth-utils').generateQRCode(`${config.SITE_URL || ''}/track/${parcel.trackingNumber}`);
    const address = typeof parcel.destination === 'string' ? (() => { try { return JSON.parse(parcel.destination); } catch { return { address: parcel.destination }; } })() : (parcel.destination || {});
    const addrStr = [address.address, address.city, address.zone].filter(Boolean).join(', ') || 'Non renseignee';
    const timeline = history.map(h => `<div class="tl-item ${h.status === parcel.status ? 'active' : ''}">
        <div class="tl-dot ${h.status === parcel.status ? 'current' : ''}"></div>
        <div class="tl-content"><strong>${statusLabels[h.status] || h.status}</strong>
        <span class="tl-date">${new Date(h.timestamp).toLocaleDateString('fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}</span>
        ${h.note ? '<p>' + h.note + '</p>' : ''}</div></div>`).join('');
    const whatsappLink = config.WHATSAPP_LINK ? `${config.WHATSAPP_LINK}?text=${encodeURIComponent('Suivi colis ' + parcel.trackingNumber)}` : '#';
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
        <title>Suivi colis ${parcel.trackingNumber} | Flay</title>
        <style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;background:#0a0a1a;color:#e2e8f0;padding:2rem 1rem}
        .container{max-width:720px;margin:0 auto}.card{background:#12121f;border-radius:16px;padding:2rem;margin-bottom:1.5rem}
        .header{text-align:center;margin-bottom:2rem}.header h1{font-size:1.5rem;color:#f1f5f9;margin:0 0 .5rem}
        .tracking-number{font-size:1.25rem;color:#818cf8;font-weight:700;letter-spacing:2px}
        .status-badge{display:inline-block;padding:.5rem 1.5rem;border-radius:999px;font-weight:600;font-size:.9rem;
        ${parcel.status === 'delivered' ? 'background:#065f46;color:#6ee7b7' : parcel.status === 'cancelled' ? 'background:#7f1d1d;color:#fca5a5' : 'background:#1e1b4b;color:#a5b4fc'}}
        .qr-section{display:flex;justify-content:center;margin:1.5rem 0}
        .qr-section img{width:160px;height:160px;border-radius:12px;background:#fff;padding:8px}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .info-label{color:#94a3b8;font-size:.85rem}.info-value{color:#f1f5f9;font-weight:500;margin-top:.25rem}
        .timeline{position:relative;padding-left:2rem}.timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:#1e293b}
        .tl-item{position:relative;padding-bottom:1.5rem}.tl-item:last-child{padding-bottom:0}
        .tl-dot{position:absolute;left:-1.5rem;top:4px;width:16px;height:16px;border-radius:50%;background:#1e293b;border:2px solid #334155}
        .tl-dot.current{background:#818cf8;border-color:#6366f1;box-shadow:0 0 12px rgba(99,102,241,.5)}
        .tl-content strong{display:block;color:#f1f5f9}.tl-date{font-size:.8rem;color:#64748b;display:block;margin:.25rem 0}
        .tl-content p{color:#94a3b8;margin:.25rem 0 0;font-size:.9rem}
        .actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.5rem}
        .btn{display:inline-flex;align-items:center;gap:.5rem;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:500;transition:opacity .2s}
        .btn:hover{opacity:.9}.btn-primary{background:#6366f1;color:#fff}.btn-success{background:#059669;color:#fff}
        @media(max-width:480px){.info-grid{grid-template-columns:1fr}}
        </style></head><body><div class="container">
        <div class="card header"><p class="tracking-number">${parcel.trackingNumber}</p>
        <h1>Suivi de colis</h1><span class="status-badge">${statusIcons[parcel.status] || '📦'} ${statusLabels[parcel.status] || parcel.status}</span>
        <div class="qr-section"><img src="${qrUrl}" alt="QR Code suivi"></div></div>
        <div class="card"><h2 style="margin:0 0 1rem;font-size:1.1rem;color:#f1f5f9">Informations</h2>
        <div class="info-grid"><div><div class="info-label">Commande</div><div class="info-value">#${order ? order.id.substring(0,16) : 'N/A'}</div></div>
        <div><div class="info-label">Destination</div><div class="info-value">${addrStr}</div></div>
        ${parcel.estimatedDelivery ? '<div><div class="info-label">Livraison estimee</div><div class="info-value">' + new Date(parcel.estimatedDelivery).toLocaleDateString('fr-FR') + '</div></div>' : ''}
        <div><div class="info-label">Derniere mise a jour</div><div class="info-value">${new Date(parcel.updatedAt || parcel.createdAt).toLocaleDateString('fr-FR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}</div></div></div></div>
        <div class="card"><h2 style="margin:0 0 1rem;font-size:1.1rem;color:#f1f5f9">Chronologie</h2>
        <div class="timeline">${timeline}</div></div>
        <div class="actions"><a href="${whatsappLink}" target="_blank" class="btn btn-success">💬 Contacter sur WhatsApp</a></div>
        </div></body></html>`);
});

// === SITE UNIFIE (V10) ===

function _buildEcomOptions(userId) {
    const userProducts = ecommerce.getPublicProducts(userId, 1, 6, {});
    const items = (userProducts.items || []).map(p => ({ id: p.id, name: p.name, price: p.price, shortDescription: p.shortDescription, image: Array.isArray(p.images) ? p.images[0] : (p.thumbnail || '') }));
    return items.length > 0 || ecommerce.getUserProducts(userId, {}).products?.length > 0 ? { hasStore: true, storeUrl: `/store/${userId}`, products: items } : { hasStore: false };
}

function _renderUnifiedSite(req, res, user, profile, options = {}) {
    const ecomOpts = _buildEcomOptions(user.id);
    const html = designStudio.generateShowcaseSite(profile, user, { ...options, ecommerce: ecomOpts });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

// Unified profile + store page
app.get('/u/:slug', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    _renderUnifiedSite(req, res, user, profile, { theme: profile.theme });
});

// Showcase site (API)
app.get('/api/showcase', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Token invalide' });
    const user = db.get('users', payload.userId);
    const profile = db.get('profiles', payload.userId);
    if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
    _renderUnifiedSite(req, res, user, profile, { theme: profile.theme, lang: 'fr' });
});

app.get('/showcase/:slug', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    if (typeof analyticsEngine.track === 'function') analyticsEngine.track(user.id, 'views', { referrer: req.headers.referer });
    _renderUnifiedSite(req, res, user, profile, { theme: profile.theme, lang: 'fr' });
});

// Public profile pages
app.get('/p/:username', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.username);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    _renderUnifiedSite(req, res, user, profile, { theme: profile.theme });
});

// === SELLER DASHBOARD ===
const dashboard = require('./seller-dashboard');

function dashboardAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        const auth = req.headers.cookie?.match(/token=([^;]+)/);
        if (!auth) return res.redirect('/login.html?redirect=' + req.path);
        req._token = auth[1];
    } else { req._token = token; }
    const authUtils = require('./auth-utils');
    const payload = authUtils.verifyToken(req._token);
    if (!payload) return res.redirect('/login.html?redirect=' + req.path);
    const user = db.get('users', payload.userId);
    if (!user) return res.redirect('/login.html?redirect=' + req.path);
    req._user = user;
    next();
}

function _dashPage(req, res, page) {
    const langSwitcher = '<div class="lang-switch" style="padding:.75rem 1.25rem;border-top:1px solid var(--border);margin-top:auto">' + I18n.selector(req.lang, req.path) + '</div>';
    const body = (page.body || '').replace('</nav>', '</nav>' + langSwitcher);
    res.send(html(page.title, body, page.script, req.lang));
}

app.get('/dashboard', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.overview(req._user.id)));
app.get('/dashboard/products', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.products(req._user.id)));
app.get('/dashboard/orders', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.orders(req._user.id)));
app.get('/dashboard/parcels', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.parcels(req._user.id)));
app.get('/dashboard/categories', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.categories(req._user.id)));
app.get('/dashboard/coupons', dashboardAuth, (req, res) => _dashPage(req, res, dashboard.coupons(req._user.id)));

function html(title, body, script, lang) {
    const currentLang = lang || 'fr';
    return '<!DOCTYPE html><html lang="' + currentLang + '"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no">' +
        '<title>' + title + ' | Flay</title>' +
        '<link rel="manifest" href="/manifest.json">' +
        '<meta name="theme-color" content="#818cf8">' +
        '<meta name="apple-mobile-web-app-capable" content="yes">' +
        '<style>' + (require('./seller-dashboard').CSS || '') + I18n.selectorCSS() + '</style></head>' +
        '<body class="loading">' + (body || '') +
        '<script>if(\'serviceWorker\' in navigator){window.addEventListener(\'load\',()=>{navigator.serviceWorker.register(\'/sw.js\')})}' +
        'const TOKEN=localStorage.getItem(\'flay_token\');' +
        'if(!TOKEN){window.location=\'/login.html?redirect=/dashboard\'}' +
        'async function api(m,p,b){const r=await fetch(\'/api\'+p,{method:m||\'GET\',headers:{\'Content-Type\':\'application/json\',Authorization:\'Bearer \'+TOKEN},body:b?JSON.stringify(b):undefined});const d=await r.text();try{return JSON.parse(d)}catch{return{error:d}}}' +
        'function toast(m,t){const d=document.createElement(\'div\');d.className=\'toast toast-\'+(t||\'success\');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3000)}' +
        'function closeModal(id){document.getElementById(id).classList.remove(\'active\')}' +
        'document.body.classList.remove(\'loading\');' +
        (script || '') +
        '</script></body></html>';
}

// Username shortcut (now shows unified site)
app.get('/:username', (req, res) => {
    const username = req.params.username;
    if (username.includes('.') || username.includes('/') || username === 'api' || username === 'showcase' || username === 'p' || username === 'u' || username === 'store' || username === 'product' || username === 'track' || username === 'cart' || username === 'dashboard') return res.status(404).send('Not found');
    const profile = db.findBy('profiles', 'slug', username);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    if (typeof analyticsEngine.track === 'function') analyticsEngine.track(profile.userId, 'views');
    _renderUnifiedSite(req, res, user, profile, { theme: profile.theme });
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

// === CUSTOM ERROR PAGES ===
app.use((req, res) => {
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        res.status(404).send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="manifest" href="/manifest.json"><title>Page non trouvee | Flay</title><style>
        *{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;color:#e2e8f0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
        .card{background:#12121f;border-radius:16px;padding:3rem;text-align:center;max-width:480px;width:100%;border:1px solid #1e293b}
        .code{font-size:5rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
        h1{font-size:1.25rem;margin:1rem 0 .5rem;color:#f1f5f9}p{color:#64748b;margin-bottom:1.5rem;font-size:.9rem}
        .btn{display:inline-block;padding:.75rem 2rem;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:500}
        .btn:hover{opacity:.9}</style></head><body><div class="card"><div class="code">404</div><h1>Page non trouvee</h1><p>La page que vous cherchez n\\'existe pas ou a ete deplacee.</p><a href="/" class="btn">Retour a l\\'accueil</a></div></body></html>`);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    if (req.accepts('html') && !req.path.startsWith('/api/')) {
        res.status(500).send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><link rel="manifest" href="/manifest.json"><title>Erreur | Flay</title><style>
        *{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;color:#e2e8f0;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
        .card{background:#12121f;border-radius:16px;padding:3rem;text-align:center;max-width:480px;width:100%;border:1px solid #1e293b}
        .code{font-size:5rem;font-weight:800;background:linear-gradient(135deg,#ef4444,#f87171);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
        h1{font-size:1.25rem;margin:1rem 0 .5rem;color:#f1f5f9}p{color:#64748b;margin-bottom:1.5rem;font-size:.9rem}
        .btn{display:inline-block;padding:.75rem 2rem;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:500}</style></head><body><div class="card"><div class="code">500</div><h1>Erreur serveur</h1><p>Une erreur s\\'est produite. Reessayez plus tard.</p><a href="/" class="btn">Retour a l\\'accueil</a></div></body></html>`);
    } else {
        res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
    }
});

module.exports = { app, broadcast };
