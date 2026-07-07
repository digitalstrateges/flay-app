const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const router = express.Router();

function auth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const authUtils = require('../auth-utils');
  return authUtils.verifyToken(token);
}

function generateQRUrl(text, size = 300) {
  const encoded = encodeURIComponent(text);
  return `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&choe=UTF-8`;
}

router.get('/my', (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const user = db.get('users', payload.userId);
  const profile = db.findBy('profiles', 'userId', payload.userId);
  if (!user || !profile) return res.status(404).json({ error: 'Profil non trouve' });
  const siteUrl = config.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  res.json({
    flayerUrl,
    qrCode: generateQRUrl(flayerUrl, 400),
    qrCodeSmall: generateQRUrl(flayerUrl, 200),
    slug: profile.slug,
    name: user.name,
    title: profile.title || '',
    phone: profile.phone || user.phone || '',
    email: profile.email || user.email || '',
    website: profile.website || '',
    location: profile.location || '',
    avatar: profile.avatar || '',
    socials: (() => { try { return JSON.parse(profile.socials || '{}'); } catch { return {}; } })(),
    bio: profile.bio || ''
  });
});

router.get('/vcard/:slug', (req, res) => {
  const profile = db.findBy('profiles', 'slug', req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  const user = db.get('users', profile.userId);
  if (!user) return res.status(404).json({ error: 'Profil non trouve' });
  const siteUrl = config.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  const socials = (() => { try { return JSON.parse(profile.socials || '{}'); } catch { return {}; } })();
  const phone = profile.phone || user.phone || '';
  const email = profile.email || user.email || '';
  const name = user.name || '';
  const title = profile.title || '';
  const org = 'Flay';

  let vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
  vcard += `FN:${name}\r\n`;
  vcard += `N:${name.split(' ').reverse().join(';')};;;\r\n`;
  if (title) vcard += `TITLE:${title}\r\n`;
  vcard += `ORG:${org}\r\n`;
  if (phone) vcard += `TEL;TYPE=CELL:${phone}\r\n`;
  if (email) vcard += `EMAIL:${email}\r\n`;
  if (profile.website) vcard += `URL:${profile.website}\r\n`;
  vcard += `URL:${flayerUrl}\r\n`;
  if (profile.location) vcard += `ADR:;;${profile.location};;;;\r\n`;
  if (socials.instagram) vcard += `X-SOCIAL-PROFILE;type=instagram:${socials.instagram}\r\n`;
  if (socials.linkedin) vcard += `X-SOCIAL-PROFILE;type=linkedin:${socials.linkedin}\r\n`;
  if (socials.twitter) vcard += `X-SOCIAL-PROFILE;type=twitter:${socials.twitter}\r\n`;
  if (socials.whatsapp) vcard += `X-SOCIAL-PROFILE;type=whatsapp:${socials.whatsapp}\r\n`;
  vcard += `NOTE:Retrouvez ${name} sur Flay : ${flayerUrl}\r\n`;
  vcard += 'END:VCARD\r\n';

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${profile.slug}.vcf"`);
  res.send(vcard);
});

router.get('/print/:slug', (req, res) => {
  const profile = db.findBy('profiles', 'slug', req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  const user = db.get('users', profile.userId);
  if (!user) return res.status(404).json({ error: 'Profil non trouve' });
  const siteUrl = config.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  const qrUrl = generateQRUrl(flayerUrl, 300);
  const socials = (() => { try { return JSON.parse(profile.socials || '{}'); } catch { return {}; } })();
  const phone = profile.phone || user.phone || '';
  const email = profile.email || user.email || '';
  const name = user.name || '';
  const title = profile.title || '';
  const bio = profile.bio || '';
  const avatar = profile.avatar || '';

  const socialLinks = [];
  if (socials.whatsapp) socialLinks.push(`<a href="${socials.whatsapp}" class="social wp">WhatsApp</a>`);
  if (socials.instagram) socialLinks.push(`<a href="${socials.instagram}" class="social ig">Instagram</a>`);
  if (socials.linkedin) socialLinks.push(`<a href="${socials.linkedin}" class="social li">LinkedIn</a>`);
  if (socials.facebook) socialLinks.push(`<a href="${socials.facebook}" class="social fb">Facebook</a>`);
  if (socials.twitter) socialLinks.push(`<a href="${socials.twitter}" class="social tw">X</a>`);
  if (socials.tiktok) socialLinks.push(`<a href="${socials.tiktok}" class="social tk">TikTok</a>`);

  res.send(`<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Carte de visite - ${name} | Flay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:2rem}
.card-print{background:#fff;border-radius:16px;padding:2.5rem;max-width:600px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.12)}
.card-front{text-align:center;margin-bottom:2rem;padding-bottom:2rem;border-bottom:2px dashed #e2e8f0}
.avatar{width:100px;height:100px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;display:block;background:linear-gradient(135deg,#818cf8,#a855f7);padding:3px}
.avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
h1{font-size:1.5rem;color:#0f172a;margin-bottom:.25rem}
.title{color:#6366f1;font-weight:600;font-size:.95rem;margin-bottom:.5rem}
.bio{color:#64748b;font-size:.85rem;line-height:1.5;margin-bottom:1rem}
.contact{display:flex;flex-direction:column;gap:.5rem;margin-bottom:1.25rem}
.contact-item{display:flex;align-items:center;gap:.5rem;justify-content:center;color:#334155;font-size:.9rem;text-decoration:none}
.contact-item:hover{color:#6366f1}
.social-links{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-bottom:1.25rem}
.social{display:inline-block;padding:.35rem .85rem;border-radius:999px;font-size:.8rem;font-weight:500;text-decoration:none;transition:opacity .2s}
.social:hover{opacity:.8}
.wp{background:#dcfce7;color:#166534}
.ig{background:#fce7f3;color:#9d174d}
.li{background:#dbeafe;color:#1e40af}
.fb{background:#dbeafe;color:#1e3a5f}
.tw{background:#e2e8f0;color:#334155}
.tk{background:#f1f5f9;color:#0f172a}
.card-back{text-align:center}
.qr-section{display:flex;justify-content:center;margin-bottom:1rem}
.qr-section img{width:160px;height:160px;border-radius:12px;background:#fff;padding:4px}
.flayer-url{color:#6366f1;font-weight:600;font-size:.9rem;word-break:break-all;margin-bottom:.5rem}
.hint{color:#94a3b8;font-size:.75rem}
.print-actions{display:flex;gap:.75rem;justify-content:center;margin-top:1.5rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.5rem;border-radius:8px;border:none;font-weight:600;font-size:.85rem;cursor:pointer;text-decoration:none;transition:opacity .2s}
.btn:hover{opacity:.9}
.btn-primary{background:#6366f1;color:#fff}
.btn-success{background:#059669;color:#fff}
@media print{body{background:#fff;padding:0}.print-actions{display:none}.card-print{box-shadow:none;padding:0;max-width:100%}}
</style></head><body>
<div class="card-print" id="card">
  <div class="card-front">
    ${avatar ? `<div class="avatar"><img src="${avatar}" alt="${name}"></div>` : `<div class="avatar"><div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#818cf8,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:2rem;font-weight:700">${name.charAt(0)}</div></div>`}
    <h1>${name}</h1>
    ${title ? `<div class="title">${title}</div>` : ''}
    ${bio ? `<div class="bio">${bio.substring(0, 150)}</div>` : ''}
    <div class="contact">
      ${phone ? `<a href="tel:${phone}" class="contact-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${phone}</a>` : ''}
      ${email ? `<a href="mailto:${email}" class="contact-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> ${email}</a>` : ''}
      ${profile.website ? `<a href="${profile.website}" target="_blank" class="contact-item"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> ${profile.website}</a>` : ''}
    </div>
    ${socialLinks.length ? `<div class="social-links">${socialLinks.join('')}</div>` : ''}
  </div>
  <div class="card-back">
    <div class="qr-section"><img src="${qrUrl}" alt="QR Code Flay"></div>
    <div class="flayer-url">${flayerUrl}</div>
    <div class="hint">Scannez pour voir ma carte interactive, mes services et reserver en ligne</div>
  </div>
</div>
<div class="print-actions">
  <button class="btn btn-primary" onclick="window.print()">Imprimer la carte</button>
  <a class="btn btn-success" href="/api/card/vcard/${profile.slug}">Telecharger vCard</a>
</div>
</body></html>`);
});

router.get('/qr/:slug', (req, res) => {
  const profile = db.findBy('profiles', 'slug', req.params.slug);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  const siteUrl = config.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  res.redirect(generateQRUrl(flayerUrl, 500));
});

router.put('/regenerate', (req, res) => {
  const payload = auth(req);
  if (!payload) return res.status(401).json({ error: 'Token manquant' });
  const profile = db.findBy('profiles', 'userId', payload.userId);
  if (!profile) return res.status(404).json({ error: 'Profil non trouve' });
  const siteUrl = config.SITE_URL || `${req.protocol}://${req.get('host')}`;
  const flayerUrl = `${siteUrl}/u/${profile.slug}`;
  const qrUrl = generateQRUrl(flayerUrl, 400);
  db.update('profiles', profile.id, { qrCode: qrUrl, shareLink: flayerUrl });
  res.json({ qrCode: qrUrl, shareLink: flayerUrl, message: 'QR code regenere' });
});

module.exports = router;
