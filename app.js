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
const security = require('./security');

// === MIDDLEWARE ===
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static compression for large responses via zlib (no npm dep needed)
// For full dynamic compression, install: npm install compression

// Trust proxy for correct IP behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https: https://*.tile.openstreetmap.org; font-src 'self' data: https:; connect-src 'self' https: https://nominatim.openstreetmap.org; frame-src 'none'; object-src 'none'");
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const allowedOrigins = [config.SITE_URL, process.env.CORS_ORIGIN].filter(Boolean);
    const origin = req.headers.origin;
    if (origin && allowedOrigins.some(a => origin.startsWith(a))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (origin) {
        res.setHeader('Access-Control-Allow-Origin', config.SITE_URL || '');
    } else {
        res.setHeader('Access-Control-Allow-Origin', config.SITE_URL || '');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
});

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => security.logRequest(req, res, start));
    next();
});

// Global rate limit: 100 req/min API, 200 static
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        const key = `global:${req.ip}`;
        const now = Date.now();
        if (!global._rateLimits) global._rateLimits = new Map();
        if (!global._rateLimits.has(key)) {
            if (global._rateLimits.size >= 10000) {
                const oldest = global._rateLimits.keys().next().value;
                global._rateLimits.delete(oldest);
            }
            global._rateLimits.set(key, []);
        }
        const hits = global._rateLimits.get(key).filter(t => t > now - 60000);
        if (hits.length === 0) global._rateLimits.delete(key);
        else global._rateLimits.set(key, hits);
        if (hits.length >= 100) return res.status(429).json({ error: 'Trop de requetes. Reessayez dans 1 minute.' });
        hits.push(now);
    }
    next();
});

// Cleanup rate limits every 5 min
const rateLimitInterval = setInterval(() => {
    if (global._rateLimits) {
        const now = Date.now();
        for (const [key, hits] of global._rateLimits) {
            const valid = hits.filter(t => t > now - 60000);
            if (valid.length === 0) global._rateLimits.delete(key);
            else global._rateLimits.set(key, valid);
        }
    }
}, 300000);

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

// Cleanup auth rate limits every 5 min
const authRateLimitInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, hits] of authRateLimits) {
        const valid = hits.filter(t => t > now - 60000);
        if (valid.length === 0) authRateLimits.delete(key);
        else authRateLimits.set(key, valid);
    }
}, 300000);

// === PWA ===
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});
app.get('/favicon.ico', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(__dirname, 'public', 'favicon.svg'));
});
app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
app.get('/pwa.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'pwa.js'));
});
app.get('/digitalstrateges', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'digitalstrateges.html'));
});
app.get('/agency', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', 'digitalstrateges.html'));
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
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/export', require('./routes/export'));
app.use('/api/push', require('./routes/push'));
app.use('/api/flay-store', require('./routes/flay-store'));
app.use('/api/africa', require('./routes/africa-world'));
app.use('/api/local-languages', require('./routes/local-languages'));
app.use('/api/bidirectional', require('./routes/bidirectional'));
app.use('/api/design-studio', require('./routes/enhanced-design-studio'));
app.use('/api/social', require('./routes/social'));
app.use('/api/followers', require('./routes/followers'));
app.use('/api/card', require('./routes/card'));
app.use('/api/flay-pay', require('./routes/flay-pay'));

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

// === SITE UNIFIE (FLAYER) ===
const flayer = require('./flayer');

function _buildEcomOptions(userId) {
    const userProducts = ecommerce.getPublicProducts(userId, 1, 6, {});
    const items = (userProducts.items || []).map(p => ({ id: p.id, name: p.name, price: p.price, shortDescription: p.shortDescription, image: Array.isArray(p.images) ? p.images[0] : (p.thumbnail || '') }));
    return items.length > 0 || ecommerce.getUserProducts(userId, {}).products?.length > 0 ? { hasStore: true, storeUrl: `/store/${userId}`, products: items } : { hasStore: false };
}

function _renderUnifiedSite(req, res, user, profile, options = {}) {
    const ecomOpts = _buildEcomOptions(user.id);
    let html = flayer.generate(profile, user, { ...options, ecommerce: ecomOpts });
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

// === MARKETPLACE PAGE ===
const marketplace = require('./marketplace');
app.get('/vendors', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const vendors = marketplace.getVendors(page);
    res.send(marketplace.generateVendorsPage(vendors));
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
        '<meta name="mobile-web-app-capable" content="yes">' +
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
    if (username.includes('.') || username.includes('/') || username === 'api' || username === 'showcase' || username === 'p' || username === 'u' || username === 'store' || username === 'product' || username === 'track' || username === 'cart' || username === 'dashboard' || username === 'vendors' || username === 'lang') return res.status(404).send('Not found');
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

// === CATALOG PRO ===
app.get('/catalog/:slug', (req, res) => {
    const profile = db.findBy('profiles', 'slug', req.params.slug);
    if (!profile) return res.status(404).send('Profil non trouve');
    const user = db.get('users', profile.userId);
    if (!user) return res.status(404).send('Profil non trouve');
    const products = ecommerce.getPublicProducts(user.id, 1, 50, {});
    const categories = ecommerce.getActiveCategories(user.id);
    const items = products.items || [];
    const siteUrl = config.SITE_URL || '';
    res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Catalogue ${user.name} | Flay</title><meta name="theme-color" content="#f77f00"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><style>
        :root{--bg:#0f0a05;--card:#1a1208;--card2:#241b0e;--border:#3a2812;--accent:#f77f00;--text:#f0e6d0;--text2:#b8a880;--muted:#8a7a60;--gradient:linear-gradient(135deg,#f77f00,#ff9f30)}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
        .header{background:var(--card);border-bottom:1px solid var(--border);padding:16px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
        .header-left{display:flex;align-items:center;gap:10px}
        .header-left svg{width:28px;height:28px}
        .header-left h1{font-size:16px;font-weight:700}
        .header-left span{font-size:12px;color:var(--muted)}
        .header-right{display:flex;gap:8px}
        .btn-header{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;transition:all .2s}
        .btn-header.primary{background:var(--gradient);color:#fff}
        .btn-header.outline{border:1px solid var(--border);color:var(--text2)}
        .btn-header.outline:hover{border-color:var(--accent);color:var(--accent)}
        .hero{text-align:center;padding:40px 24px 32px;max-width:800px;margin:0 auto}
        .hero h1{font-size:28px;font-weight:800;margin-bottom:6px}
        .hero p{font-size:14px;color:var(--text2)}
        .hero .count{display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(247,127,0,.1);color:var(--accent);font-size:12px;font-weight:600;margin-top:12px}
        .cat-scroll{display:flex;gap:8px;overflow-x:auto;padding:0 24px 16px;max-width:1200px;margin:0 auto;-webkit-overflow-scrolling:touch}
        .cat-scroll::-webkit-scrollbar{height:4px}
        .cat-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .cat-chip{flex-shrink:0;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer;border:1px solid var(--border);background:var(--card);color:var(--text2);transition:all .2s;white-space:nowrap}
        .cat-chip.active,.cat-chip:hover{border-color:var(--accent);color:var(--accent);background:rgba(247,127,0,.06)}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;padding:0 24px 60px;max-width:1200px;margin:0 auto}
        .card{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:all .25s;cursor:pointer;text-decoration:none;color:inherit;display:flex;flex-direction:column}
        .card:hover{transform:translateY(-3px);border-color:rgba(247,127,0,.3);box-shadow:0 8px 32px rgba(0,0,0,.3)}
        .card-img{width:100%;aspect-ratio:1;background:var(--card2);display:flex;align-items:center;justify-content:center;overflow:hidden}
        .card-img img{width:100%;height:100%;object-fit:cover}
        .card-img .placeholder{color:var(--muted);font-size:40px;opacity:.3}
        .card-body{padding:16px;flex:1;display:flex;flex-direction:column}
        .card-body h3{font-size:15px;font-weight:600;margin-bottom:4px;line-height:1.3}
        .card-body .desc{font-size:12px;color:var(--text2);margin-bottom:8px;line-height:1.4;flex:1}
        .card-body .price-row{display:flex;align-items:center;gap:8px}
        .card-body .price{font-size:18px;font-weight:700;color:var(--accent)}
        .card-body .compare{font-size:13px;color:var(--muted);text-decoration:line-through}
        .card-body .badge-stock{font-size:10px;padding:2px 8px;border-radius:999px;font-weight:600}
        .badge-instock{background:rgba(34,197,94,.12);color:#22c55e}
        .badge-low{background:rgba(247,127,0,.12);color:var(--accent)}
        .badge-out{background:rgba(239,68,68,.12);color:#ef4444}
        .footer{text-align:center;padding:24px;font-size:12px;color:var(--muted);border-top:1px solid var(--border)}
        .footer a{color:var(--accent);text-decoration:none}
        .empty{text-align:center;padding:60px 24px;color:var(--muted)}
        .empty svg{width:48px;height:48px;margin-bottom:16px;opacity:.4}
        @media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr);gap:12px;padding:0 16px 40px}.hero h1{font-size:22px}.header{padding:12px 16px}.card-body{padding:12px}.card-body .price{font-size:16px}}
        @media(max-width:400px){.grid{grid-template-columns:1fr;max-width:320px;margin:0 auto}}
    </style></head><body>
    <div class="header">
        <div class="header-left">
            <svg viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="12" fill="url(#lg)"/><path d="M14 24h20M28 18l6 6-6 6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="lg" x1="0" y1="0" x2="48" y2="48"><stop stop-color="#f77f00"/><stop offset="1" stop-color="#ff9f30"/></linearGradient></defs></svg>
            <div><h1>${user.name}</h1><span>${user.bio || 'Catalogue professionnel'}</span></div>
        </div>
        <div class="header-right">
            <a href="${siteUrl}/u/${profile.slug}" class="btn-header outline">Profil</a>
            <a href="${siteUrl}/store/${user.id}" class="btn-header primary">Boutique</a>
        </div>
    </div>
    <div class="hero"><h1>Notre catalogue</h1><p>Decouvrez tous nos produits et services</p><div class="count">${items.length} produit${items.length > 1 ? 's' : ''}</div></div>
    ${categories.length > 0 ? '<div class="cat-scroll">' + categories.map(c => '<div class="cat-chip" onclick="filterCategory(\'' + c.slug + '\',this)">' + c.name + '</div>').join('') + '<div class="cat-chip active" onclick="filterCategory(\'all\',this)">Tous</div></div>' : ''}
    <div class="grid" id="catalogGrid">
        ${items.length === 0 ? '<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><h3>Aucun produit</h3><p>Le catalogue est vide pour le moment</p></div>' : items.map(p => {
            const img = p.thumbnail || (Array.isArray(p.images) ? p.images[0] : '') || '';
            const stock = p.stock || p.quantity || 0;
            const stockCls = stock === 0 ? 'badge-out' : stock <= 5 ? 'badge-low' : 'badge-instock';
            const stockLabel = stock === 0 ? 'Rupture' : stock <= 5 ? 'Stock bas' : 'Disponible';
            return '<a href="' + siteUrl + '/product/' + p.id + '" class="card">' +
                '<div class="card-img">' + (img ? '<img src="' + img + '" alt="' + (p.name || '') + '" loading="lazy">' : '<span class="placeholder">📷</span>') + '</div>' +
                '<div class="card-body"><h3>' + (p.name || 'Produit') + '</h3>' +
                (p.shortDescription ? '<div class="desc">' + p.shortDescription.substring(0,100) + '</div>' : '') +
                '<div class="price-row"><span class="price">' + (p.price || 0).toLocaleString() + ' FCFA</span>' +
                (p.comparePrice > p.price ? '<span class="compare">' + p.comparePrice.toLocaleString() + ' FCFA</span>' : '') +
                '</div><span class="badge-stock ' + stockCls + '" style="margin-top:8px">' + stockLabel + '</span></div></a>';
        }).join('')}
    </div>
    <div class="footer"><p>Propulse par <a href="${siteUrl}">Flay</a> by <strong>DIGITALSTRATEGES</strong> &middot; Cote d'Ivoire 🇨🇮</p></div>
    <script>function filterCategory(slug, el){document.querySelectorAll('.cat-chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');document.querySelectorAll('#catalogGrid .card').forEach(card=>{card.style.display=(slug==='all'||card.dataset.cat===slug)?'':'none';});}</script>
    </body></html>`);
});

// === SSE STREAM for notifications ===
const sseClients = new Map();
app.get('/api/chat/stream', (req, res) => {
    const origin = req.headers.origin;
    const allowed = [config.SITE_URL, process.env.CORS_ORIGIN].filter(Boolean);
    const corsOrigin = origin && allowed.some(a => origin.startsWith(a)) ? origin : (config.SITE_URL || '');
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': corsOrigin
    });
    const userId = req.query.userId || 'anonymous';
    sseClients.set(userId, res);
    const heartbeat = setInterval(() => {
        try { res.write(':heartbeat\n\n'); } catch(e) { clearInterval(heartbeat); }
    }, 30000);
    req.on('close', () => { sseClients.delete(userId); clearInterval(heartbeat); });
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
    if (userId === 'system') {
        sseClients.forEach((client) => {
            try { client.write(`data: ${JSON.stringify(event)}\n\n`); } catch (e) { /* ignore */ }
        });
        return;
    }
    const client = sseClients.get(userId);
    if (client) {
        try { client.write(`data: ${JSON.stringify(event)}\n\n`); } catch (e) { sseClients.delete(userId); }
    }
}

function broadcastToAll(event) {
    sseClients.forEach((client, userId) => {
        try { client.write(`data: ${JSON.stringify(event)}\n\n`); } catch (e) { sseClients.delete(userId); }
    });
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
        res.status(err.status || 500).json({ error: err.status >= 500 ? 'Erreur serveur' : (err.message || 'Erreur serveur') });
    }
});

function shutdown() {
    clearInterval(rateLimitInterval);
    clearInterval(authRateLimitInterval);
    global._rateLimits = null;
}

module.exports = { app, broadcast, broadcastToAll, shutdown };
