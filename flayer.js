const config = require('./config');
const designStudio = require('./design-studio');
const db = require('./db');
const ecommerce = require('./ecommerce');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function generateQRUrl(text, size) {
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(text)}&choe=UTF-8`;
}

function getThemeCSS(themeId) {
  const colors = designStudio.getThemeColors(themeId);
  return `
:root {
  --bg: ${colors.bg || '#0a0a1a'};
  --cardBg: ${colors.cardBg || '#12121f'};
  --text: ${colors.text || '#f1f5f9'};
  --textLight: ${colors.textLight || '#94a3b8'};
  --muted: ${colors.muted || '#64748b'};
  --accent: ${colors.accent || '#818cf8'};
  --border: ${colors.border || '#1e293b'};
  --positive: #10b981;
  --negative: #ef4444;
  --warning: #f59e0b;
  --radius: 12px;
}`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;min-height:100vh}
a{color:inherit;text-decoration:none}
img{max-width:100%;height:auto}

.loader{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:9999;transition:opacity .3s}
.loader.hidden{opacity:0;pointer-events:none}
.loader-spinner{width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

.nav{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1rem;background:rgba(0,0,0,.5);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);position:fixed;top:0;left:0;right:0;z-index:100;border-bottom:1px solid var(--border)}
.nav-brand{font-weight:700;font-size:1rem;color:var(--text)}
.nav-links{display:flex;gap:2px;align-items:center}
.nav-link{padding:.35rem .7rem;border-radius:8px;font-size:.8rem;color:var(--muted);transition:all .2s;white-space:nowrap}
.nav-link:hover,.nav-link.active{color:var(--text);background:rgba(255,255,255,.06)}
.nav-store{background:linear-gradient(135deg,var(--accent),#a855f7);color:#fff!important;font-weight:600;padding:.35rem 1rem!important}

.section{padding:3rem 1rem;max-width:640px;margin:0 auto}
.section-title{font-size:1.1rem;font-weight:700;margin-bottom:.25rem;color:var(--text)}
.section-sub{font-size:.85rem;color:var(--textLight);margin-bottom:1.25rem}

.hero{text-align:center;padding:5rem 1rem 2.5rem}
.hero-avatar{width:96px;height:96px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;display:block;border:3px solid var(--accent);padding:2px;background:var(--cardBg)}
.hero-avatar-placeholder{width:96px;height:96px;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent),#a855f7);font-size:2.5rem;font-weight:700;color:#fff}
.hero-name{font-size:1.5rem;font-weight:800;margin-bottom:.15rem;letter-spacing:-.5px}
.hero-title{color:var(--accent);font-weight:500;font-size:.95rem;margin-bottom:.5rem}
.hero-bio{color:var(--textLight);font-size:.88rem;max-width:480px;margin:.5rem auto 1rem;line-height:1.6}
.hero-info{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;font-size:.82rem;color:var(--muted);margin-bottom:1rem}
.hero-info span{display:inline-flex;align-items:center;gap:4px}
.hero-actions{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:1rem}
.hero-actions .btn{flex:1;min-width:140px}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;padding:.65rem 1.25rem;border-radius:10px;font-size:.88rem;font-weight:600;border:none;cursor:pointer;transition:all .2s}
.btn:hover{opacity:.9;transform:translateY(-1px)}
.btn-primary{background:var(--accent);color:#fff}
.btn-secondary{background:rgba(255,255,255,.08);color:var(--text);border:1px solid var(--border)}
.btn-success{background:var(--positive);color:#fff}
.btn-outline{background:transparent;border:1.5px solid var(--border);color:var(--text)}
.btn-sm{padding:.4rem .9rem;font-size:.8rem}
.btn-whatsapp{background:#25D366;color:#fff}
.btn-phone{background:rgba(255,255,255,.1);color:var(--text);border:1px solid var(--border)}

.social-row{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:1rem 0}
.social-link{display:inline-flex;align-items:center;gap:.35rem;padding:.35rem .85rem;border-radius:999px;font-size:.78rem;font-weight:500;transition:all .2s}
.social-link:hover{transform:translateY(-1px)}
.so-wp{background:rgba(37,211,102,.15);color:#25D366}
.so-ig{background:rgba(236,72,153,.15);color:#ec4899}
.so-fb{background:rgba(59,130,246,.15);color:#3b82f6}
.so-li{background:rgba(10,102,194,.15);color:#0a66c2}
.so-tw{background:rgba(255,255,255,.08);color:var(--text)}
.so-tk{background:rgba(255,255,255,.06);color:var(--text)}
.so-yt{background:rgba(255,0,0,.12);color:#ff0000}

.qr-box{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:1.5rem;background:var(--cardBg);border-radius:var(--radius);border:1px solid var(--border);margin:1rem 0}
.qr-box img{width:140px;height:140px;border-radius:10px;background:#fff;padding:6px}
.qr-label{font-size:.8rem;color:var(--muted);text-align:center}
.qr-actions{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center}
.qr-actions .btn{font-size:.78rem;padding:.4rem .85rem}

.booking-card{background:var(--cardBg);border-radius:var(--radius);border:1px solid var(--border);padding:1.25rem;margin-bottom:1rem}
.booking-card h3{font-size:.95rem;margin-bottom:.75rem;color:var(--text)}
.form-group{margin-bottom:.75rem}
.form-group label{display:block;font-size:.8rem;color:var(--muted);margin-bottom:.3rem;font-weight:500}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:.6rem .8rem;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.88rem;font-family:inherit;transition:border .2s}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--accent)}
.form-group textarea{resize:vertical;min-height:60px}
.form-group select option{background:var(--bg);color:var(--text)}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}

.slots-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:.4rem;margin:.5rem 0}
.slot-btn{padding:.35rem;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text);font-size:.78rem;cursor:pointer;text-align:center;transition:all .15s}
.slot-btn:hover{border-color:var(--accent)}
.slot-btn.selected{background:var(--accent);color:#fff;border-color:var(--accent)}
.slot-btn.booked{opacity:.3;pointer-events:none;text-decoration:line-through}

.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.75rem}
.product-card{background:var(--cardBg);border-radius:var(--radius);border:1px solid var(--border);overflow:hidden;transition:transform .2s,box-shadow .2s}
.product-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.product-img{width:100%;height:140px;object-fit:cover;background:#1e293b}
.product-img-placeholder{width:100%;height:140px;background:linear-gradient(135deg,var(--cardBg),#1e293b);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:.8rem}
.product-body{padding:.75rem}
.product-name{font-size:.85rem;font-weight:600;margin-bottom:.15rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.product-price{font-size:1rem;font-weight:700;color:var(--accent)}
.product-desc{font-size:.75rem;color:var(--textLight);margin-top:.15rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.product-footer{display:flex;gap:.35rem;margin-top:.5rem}
.product-footer .btn{flex:1;padding:.35rem .5rem;font-size:.72rem;border-radius:6px}

.about-text{color:var(--textLight);font-size:.88rem;line-height:1.7}
.about-stats{display:flex;gap:1.5rem;justify-content:center;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.about-stat{text-align:center}
.about-stat-val{font-size:1.25rem;font-weight:700;color:var(--accent)}
.about-stat-lbl{font-size:.72rem;color:var(--muted)}

.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem}
.gallery-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;transition:transform .2s}
.gallery-grid img:hover{transform:scale(1.03)}

.service-card{background:var(--cardBg);border-radius:var(--radius);border:1px solid var(--border);padding:1rem;margin-bottom:.75rem}
.service-card h3{font-size:.95rem;font-weight:600;color:var(--text)}
.service-price{font-size:1.1rem;font-weight:700;color:var(--accent);margin-top:.15rem}
.service-desc{font-size:.82rem;color:var(--textLight);margin:.35rem 0 .75rem}
.service-actions{display:flex;gap:.5rem}
.service-actions .btn{font-size:.78rem;padding:.35rem .85rem}

.services-tabs{display:flex;gap:2px;margin-bottom:1rem;background:var(--cardBg);border-radius:10px;padding:3px;border:1px solid var(--border)}
.services-tab{flex:1;text-align:center;padding:.4rem .3rem;border-radius:8px;font-size:.75rem;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;border:none;background:transparent}
.services-tab.active{background:var(--accent);color:#fff}
.services-tab:hover:not(.active){color:var(--text)}

.toast{position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;padding:.7rem 1.5rem;border-radius:10px;font-size:.85rem;font-weight:500;color:#fff;background:var(--cardBg);border:1px solid var(--border);backdrop-filter:blur(12px);animation:slideUp .3s ease}
.toast.success{background:var(--positive)}
.toast.error{background:var(--negative)}
@keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

@media(max-width:480px){
  .hero{padding-top:4.5rem}
  .form-row{grid-template-columns:1fr}
  .products-grid{grid-template-columns:repeat(2,1fr)}
  .gallery-grid{grid-template-columns:repeat(2,1fr)}
  .nav-links{gap:1px}
  .nav-link{font-size:.72rem;padding:.3rem .5rem}
}

@media print{.nav,.qr-actions,.service-actions,.hero-actions,.booking-card,.toast,.loader{display:none!important}.section{padding:1rem 0;break-inside:avoid}}`;

function generate(profile, user, options = {}) {
  const theme = options.theme || profile.theme || 'dark';
  const siteUrl = config.SITE_URL || 'https://flay.app';
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  const qrUrl = generateQRUrl(flayerUrl, 300);
  const qrUrlLarge = generateQRUrl(flayerUrl, 500);
  const lang = options.lang || 'fr';
  const colors = getThemeCSS(theme);

  const services = (() => {
    try { return Array.isArray(profile.services) ? profile.services : JSON.parse(profile.services || '[]'); }
    catch { return []; }
  })();

  const socials = (() => {
    try { return JSON.parse(profile.socials || '{}'); }
    catch { return {}; }
  })();

  const gallery = (() => {
    try { return Array.isArray(profile.gallery) ? profile.gallery : JSON.parse(profile.gallery || '[]'); }
    catch { return []; }
  })();

  const hasStore = options.ecommerce?.hasStore;
  const storeProducts = options.ecommerce?.products || [];

  const servicesHtml = services.map((s, i) => `
    <div class="service-card">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <h3>${esc(s.name)}</h3>
          ${s.price ? `<div class="service-price">${esc(s.price)}</div>` : ''}
        </div>
      </div>
      ${s.description ? `<div class="service-desc">${esc(s.description)}</div>` : ''}
      <div class="service-actions">
        <button class="btn btn-primary btn-sm" onclick="openBooking('${esc(s.name)}')">Reserver</button>
        <a href="${profile.phone ? 'https://wa.me/' + profile.phone.replace(/[^0-9]/g, '') + '?text=' + encodeURIComponent('Bonjour, je suis intéressé par: ' + s.name) : '#'}" class="btn btn-whatsapp btn-sm" target="_blank">WhatsApp</a>
      </div>
    </div>`).join('');

  const productsHtml = storeProducts.map(p => `
    <div class="product-card">
      ${p.image ? `<img class="product-img" src="${p.image}" alt="${esc(p.name)}" loading="lazy">` : `<div class="product-img-placeholder">${esc((p.name || '?')[0])}</div>`}
      <div class="product-body">
        <div class="product-name">${esc(p.name)}</div>
        <div class="product-price">${(p.price || 0).toLocaleString()} FCFA</div>
        ${p.shortDescription ? `<div class="product-desc">${esc(p.shortDescription)}</div>` : ''}
        <div class="product-footer">
          <a href="/product/${p.id}" class="btn btn-primary btn-sm">Voir</a>
          <button class="btn btn-outline btn-sm" onclick="addToCart('${p.id}','${esc(p.name)}',${p.price})">Ajouter</button>
        </div>
      </div>
    </div>`).join('');

  const socialHtml = [];
  if (socials.whatsapp) socialHtml.push(`<a href="${socials.whatsapp}" target="_blank" class="social-link so-wp"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> WhatsApp</a>`);
  if (socials.instagram) socialHtml.push(`<a href="${socials.instagram}" target="_blank" class="social-link so-ig">Instagram</a>`);
  if (socials.facebook) socialHtml.push(`<a href="${socials.facebook}" target="_blank" class="social-link so-fb">Facebook</a>`);
  if (socials.linkedin) socialHtml.push(`<a href="${socials.linkedin}" target="_blank" class="social-link so-li">LinkedIn</a>`);
  if (socials.twitter) socialHtml.push(`<a href="${socials.twitter}" target="_blank" class="social-link so-tw">X (Twitter)</a>`);
  if (socials.tiktok) socialHtml.push(`<a href="${socials.tiktok}" target="_blank" class="social-link so-tk">TikTok</a>`);
  if (socials.youtube) socialHtml.push(`<a href="${socials.youtube}" target="_blank" class="social-link so-yt">YouTube</a>`);

  const phone = profile.phone || user.phone || '';
  const email = profile.email || user.email || '';

  const navLinks = `<a href="#services" class="nav-link">Services</a>
            <a href="#catalog" class="nav-link">Catalogue</a>
            <a href="#booking" class="nav-link">Rendez-vous</a>
            <a href="#about" class="nav-link">Profil</a>${hasStore ? `<a href="${options.ecommerce.storeUrl}" class="nav-link nav-store">Boutique</a>` : ''}`;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=5,user-scalable=yes">
  <title>${esc(user.name)}${profile.title ? ' - ' + esc(profile.title) : ''} | Flay</title>
  <meta name="description" content="${esc((profile.bio || '').substring(0, 160))}">
  <link rel="canonical" href="${flayerUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:url" content="${flayerUrl}">
  <meta property="og:title" content="${esc(user.name)}">
  <meta property="og:description" content="${esc((profile.bio || '').substring(0, 200))}">
  ${profile.avatar ? `<meta property="og:image" content="${profile.avatar}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(user.name)}">
  <meta name="twitter:description" content="${esc((profile.bio || '').substring(0, 200))}">
  ${profile.avatar ? `<meta name="twitter:image" content="${profile.avatar}">` : ''}
  <meta name="theme-color" content="${colors.match(/--accent:\s*([^;]+)/)?.[1] || '#818cf8'}">
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" href="/favicon.svg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "${esc(user.name)}",
    "url": "${flayerUrl}",
    ${profile.avatar ? `"image": "${profile.avatar}",` : ''}
    ${profile.title ? `"jobTitle": "${esc(profile.title)}",` : ''}
    ${profile.location ? `"address": { "@type": "PostalAddress", "addressLocality": "${esc(profile.location)}" },` : ''}
    ${phone ? `"telephone": "${esc(phone)}",` : ''}
    "description": "${esc((profile.bio || '').substring(0, 300))}"
    ${socials.whatsapp || socials.instagram || socials.facebook || socials.linkedin || socials.twitter || socials.tiktok || socials.youtube ? `,
    "sameAs": [${[
      socials.whatsapp, socials.instagram, socials.facebook,
      socials.linkedin, socials.twitter, socials.tiktok, socials.youtube
    ].filter(Boolean).map(u => `"${esc(u)}"`).join(',')}]` : ''}
  }
  </script>
  <style>${CSS}${colors}</style>
</head>
<body>
<div class="loader" id="loader"><div class="loader-spinner"></div></div>

<nav class="nav">
  <a href="/" class="nav-brand">${esc(user.name)}</a>
  <div class="nav-links">${navLinks}</div>
</nav>

<header class="hero">
  ${profile.avatar ? `<img class="hero-avatar" src="${profile.avatar}" alt="${esc(user.name)}">` : `<div class="hero-avatar-placeholder">${(user.name || '?')[0]}</div>`}
  <h1 class="hero-name">${esc(user.name)}</h1>
  ${profile.title ? `<div class="hero-title">${esc(profile.title)}</div>` : ''}
  ${profile.bio ? `<div class="hero-bio">${esc(profile.bio)}</div>` : ''}
  <div class="hero-info">
    ${profile.location ? `<span>&#128205; ${esc(profile.location)}</span>` : ''}
    ${phone ? `<span>&#128222; ${esc(phone)}</span>` : ''}
    ${email ? `<span>&#9993; ${esc(email)}</span>` : ''}
  </div>
  <div class="hero-actions">
    ${phone ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" class="btn btn-whatsapp" target="_blank">WhatsApp</a>` : ''}
    ${phone ? `<a href="tel:${phone}" class="btn btn-phone">Appeler</a>` : ''}
    <a href="/api/card/vcard/${profile.slug}" class="btn btn-secondary btn-sm">vCard</a>
    <button class="btn btn-secondary btn-sm" onclick="window.open('/api/card/print/${profile.slug}','_blank')">Carte</button>
  </div>
  ${socialHtml.length ? `<div class="social-row">${socialHtml.join('')}</div>` : ''}

  <div class="qr-box">
    <img src="${qrUrl}" alt="QR Code ${esc(user.name)}" loading="lazy">
    <div class="qr-label">Scannez pour voir ma carte et mes services</div>
    <div class="qr-actions">
      <a href="${qrUrlLarge}" download="qr-${profile.slug}.png" class="btn btn-secondary btn-sm">Telecharger QR</a>
      <button class="btn btn-secondary btn-sm" onclick="navigator.clipboard?.writeText('${flayerUrl}');toast('Lien copie!','success')">Copier le lien</button>
    </div>
  </div>
</header>

<section class="section" id="services">
  <h2 class="section-title">Services</h2>
  <p class="section-sub">Decouvrez mes prestations</p>
  ${servicesHtml || '<p style="color:var(--muted);font-size:.88rem">Aucun service pour le moment</p>'}
</section>

${productsHtml ? `
<section class="section" id="catalog" style="background:rgba(0,0,0,.08)">
  <div class="container" style="max-width:640px;margin:0 auto">
    <h2 class="section-title">Catalogue</h2>
    <p class="section-sub">Mes produits a la une</p>
    <div class="products-grid">${productsHtml}</div>
    ${hasStore ? `<div style="text-align:center;margin-top:1rem"><a href="${options.ecommerce.storeUrl}" class="btn btn-primary">Voir tout le catalogue</a></div>` : ''}
  </div>
</section>` : ''}

<section class="section" id="booking">
  <h2 class="section-title">Prendre rendez-vous</h2>
  <p class="section-sub">Choisissez le type de rendez-vous</p>
  <div class="booking-card">
    <div class="services-tabs" id="bookingTabs">
      <button class="services-tab active" data-type="service" onclick="switchBookingType('service')">Service</button>
      <button class="services-tab" data-type="business_meeting" onclick="switchBookingType('business_meeting')">Affaires</button>
      <button class="services-tab" data-type="maintenance" onclick="switchBookingType('maintenance')">Entretien</button>
      <button class="services-tab" data-type="visit" onclick="switchBookingType('visit')">Visite</button>
    </div>
    <div id="bookingForm">
      <div class="form-group">
        <label>Nom complet</label>
        <input id="bkName" placeholder="Votre nom">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Telephone</label>
          <input id="bkPhone" type="tel" placeholder="+225 0102030405">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input id="bkEmail" type="email" placeholder="email@exemple.com">
        </div>
      </div>
      <div class="form-group">
        <label>Service souhaite</label>
        <select id="bkService">${services.map(s => `<option value="${esc(s.name)}">${esc(s.name)}${s.price ? ' - ' + esc(s.price) : ''}</option>`).join('')}${services.length === 0 ? '<option value="">Selectionnez un service</option>' : ''}</select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date</label>
          <input id="bkDate" type="date">
        </div>
        <div class="form-group">
          <label>Duree (min)</label>
          <select id="bkDuration">
            <option value="30">30 min</option>
            <option value="60" selected>1 heure</option>
            <option value="90">1h30</option>
            <option value="120">2 heures</option>
            <option value="180">3 heures</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Creneau horaire</label>
        <div id="slotsContainer" style="font-size:.82rem;color:var(--muted)">Choisissez d'abord une date</div>
      </div>
      <div class="form-group">
        <label>Message (optionnel)</label>
        <textarea id="bkMessage" placeholder="Details ou questions..."></textarea>
      </div>
      <button class="btn btn-primary" style="width:100%" onclick="submitBooking()">Envoyer la demande</button>
    </div>
    <div id="bookingSuccess" style="display:none;text-align:center;padding:2rem">
      <div style="font-size:3rem;margin-bottom:.5rem">&#10003;</div>
      <h3 style="color:var(--positive)">Demande envoyee!</h3>
      <p style="color:var(--muted);font-size:.88rem">Vous recevrez une confirmation sous peu.</p>
      <button class="btn btn-secondary" style="margin-top:1rem" onclick="resetBooking()">Nouvelle reservation</button>
    </div>
  </div>
</section>

<section class="section" id="about">
  <h2 class="section-title">A propos</h2>
  <p class="section-sub">En savoir plus</p>
  <div class="about-text">
    <p>${esc(profile.bio || 'Professionnel passionne, dedie a la satisfaction de ses clients.')}</p>
    ${profile.location ? `<p style="margin-top:.75rem">&#128205; Base a ${esc(profile.location)}</p>` : ''}
  </div>
  <div class="about-stats">
    <div class="about-stat"><div class="about-stat-val">${services.length}</div><div class="about-stat-lbl">Services</div></div>
    <div class="about-stat"><div class="about-stat-val">${storeProducts.length}</div><div class="about-stat-lbl">Produits</div></div>
  </div>
</section>

${gallery.length ? `
<section class="section" id="gallery" style="background:rgba(0,0,0,.08)">
  <h2 class="section-title">Galerie</h2>
  <p class="section-sub">Apercu de mon travail</p>
  <div class="gallery-grid">${gallery.map(img => `<img src="${img}" alt="Galerie" loading="lazy" onclick="window.open(this.src)">`).join('')}</div>
</section>` : ''}

<script>
const SLUG = '${profile.slug}';
let bookingType = 'service';
let selectedSlot = '';
let selectedDate = '';

document.getElementById('bkDate').valueAsDate = new Date();

document.getElementById('bkDate').addEventListener('change', function() {
  selectedDate = this.value;
  if (selectedDate) loadSlots(selectedDate);
});

function loadSlots(date) {
  const container = document.getElementById('slotsContainer');
  container.innerHTML = '<span style="color:var(--muted)">Chargement...</span>';
  fetch('/api/reservations/available/' + SLUG + '?date=' + date)
    .then(r => r.json())
    .then(data => {
      if (!data.availableSlots || data.availableSlots.length === 0) {
        container.innerHTML = '<span style="color:var(--negative)">Aucun creneau disponible cette journee</span>';
        return;
      }
      let html = '<div class="slots-grid">';
      data.availableSlots.forEach(slot => {
        html += '<div class="slot-btn' + (selectedSlot === slot ? ' selected' : '') + '" onclick="selectSlot(this,\\'' + slot + '\\')">' + slot + '</div>';
      });
      html += '</div>';
      container.innerHTML = html;
    })
    .catch(() => {
      container.innerHTML = '<span style="color:var(--negative)">Erreur de chargement</span>';
    });
}

function selectSlot(el, slot) {
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedSlot = slot;
}

function switchBookingType(type) {
  bookingType = type;
  document.querySelectorAll('#bookingTabs .services-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.type === type);
  });
}

function openBooking(service) {
  document.getElementById('bkService').value = service;
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

function submitBooking() {
  const name = document.getElementById('bkName').value.trim();
  const phone = document.getElementById('bkPhone').value.trim();
  const email = document.getElementById('bkEmail').value.trim();
  const service = document.getElementById('bkService').value;
  const date = document.getElementById('bkDate').value;
  const duration = document.getElementById('bkDuration').value;
  const message = document.getElementById('bkMessage').value.trim();

  if (!name || !phone || !date) {
    toast('Veuillez remplir les champs obligatoires', 'error');
    return;
  }
  if (!selectedSlot) {
    toast('Veuillez choisir un creneau horaire', 'error');
    return;
  }

  const body = { clientName: name, clientPhone: phone, clientEmail: email, service, type: bookingType, date, time: selectedSlot, duration, notes: message };

  fetch('/api/reservations/public/' + SLUG, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { toast(data.error, 'error'); return; }
    document.getElementById('bookingForm').style.display = 'none';
    document.getElementById('bookingSuccess').style.display = 'block';
    toast('Reservation envoyee avec succes!', 'success');
  })
  .catch(() => toast('Erreur de connexion', 'error'));
}

function resetBooking() {
  document.getElementById('bookingForm').style.display = 'block';
  document.getElementById('bookingSuccess').style.display = 'none';
  document.getElementById('bkName').value = '';
  document.getElementById('bkPhone').value = '';
  document.getElementById('bkEmail').value = '';
  document.getElementById('bkMessage').value = '';
  selectedSlot = '';
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
}

function addToCart(id, name, price) {
  const token = localStorage.getItem('flay_token');
  if (!token) { window.location = '/login.html?redirect=/product/' + id; return; }
  fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ productId: id, quantity: 1 })
  })
  .then(r => r.json())
  .then(data => {
    if (data.error) { toast(data.error, 'error'); return; }
    toast(name + ' ajoute au panier', 'success');
  })
  .catch(() => toast('Erreur', 'error'));
}

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => document.getElementById('loader')?.classList.add('hidden'), 300);
  if (document.getElementById('bkDate').value) loadSlots(document.getElementById('bkDate').value);
});
</script>
</body>
</html>`;
}

module.exports = { generate };
