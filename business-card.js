/**
 * Flay Business Card Generator
 * Carte de visite physique PDF intelligente - Recto/Verso
 * Format: 85mm x 55mm (standard carte visite)
 */

class BusinessCardGenerator {
    constructor() {
        this.cardWidth = 85;
        this.cardHeight = 55;
        this.dpi = 300;
    }

    generateFront(profile, user, theme = 'dark', options = {}) {
        const colors = this.getThemeColors(theme, profile.plan);

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 0; size: ${this.cardWidth}mm ${this.cardHeight}mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${this.cardWidth}mm; height: ${this.cardHeight}mm; font-family: 'Helvetica Neue', Arial, sans-serif; overflow: hidden; position: relative; }
    .card { width: 100%; height: 100%; position: relative; background: ${colors.bg}; color: ${colors.text}; display: flex; flex-direction: column; padding: 4mm; }
    .accent-bar { position: absolute; top: 0; left: 0; width: 100%; height: 2mm; background: ${colors.accent}; }
    .top-section { display: flex; align-items: flex-start; gap: 3mm; margin-top: 3mm; }
    .avatar { width: 14mm; height: 14mm; border-radius: 50%; border: 0.5mm solid ${colors.accent}; background: ${colors.avatarBg}; display: flex; align-items: center; justify-content: center; font-size: 6mm; font-weight: 700; color: ${colors.accent}; flex-shrink: 0; ${profile.avatar ? `background-image: url(${profile.avatar}); background-size: cover;` : ''} }
    .identity { flex: 1; }
    .name { font-size: 4mm; font-weight: 800; color: ${colors.text}; letter-spacing: 0.1mm; line-height: 1.2; }
    .title { font-size: 2.2mm; color: ${colors.accent}; font-weight: 500; margin-top: 0.5mm; }
    .badges { display: flex; gap: 1mm; margin-top: 1mm; }
    .badge { font-size: 1.5mm; padding: 0.3mm 1.5mm; border-radius: 0.8mm; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1mm; }
    .badge-pro { background: ${colors.accent}; color: white; }
    .badge-premium { background: ${colors.gold}; color: #1a1a2e; }
    .divider { width: 100%; height: 0.2mm; background: ${colors.divider}; margin: 2mm 0; }
    .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2mm; }
    .contact-item { display: flex; align-items: center; gap: 1mm; font-size: 1.8mm; color: ${colors.textLight}; }
    .contact-icon { width: 3mm; height: 3mm; background: ${colors.accent}20; border-radius: 1mm; display: flex; align-items: center; justify-content: center; font-size: 1.6mm; color: ${colors.accent}; flex-shrink: 0; }
    .qr-section { position: absolute; bottom: 3mm; right: 3mm; text-align: center; }
    .qr-placeholder { width: 12mm; height: 12mm; border: 0.3mm solid ${colors.divider}; border-radius: 1mm; background: white; display: flex; align-items: center; justify-content: center; }
    .qr-text { font-size: 1.2mm; color: ${colors.textLight}; margin-top: 0.5mm; }
    .bottom-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 1mm; background: ${colors.accent}; }
    ${profile.logo ? `.logo { position: absolute; top: 3mm; right: 3mm; width: 8mm; height: 8mm; background-image: url(${profile.logo}); background-size: contain; background-repeat: no-repeat; background-position: center; }` : ''}
</style>
</head>
<body>
<div class="card">
    <div class="accent-bar"></div>
    ${profile.logo ? '<div class="logo"></div>' : ''}
    <div class="top-section">
        <div class="avatar">${profile.avatar ? '' : (user.name || '?')[0].toUpperCase()}</div>
        <div class="identity">
            <div class="name">${this.esc(user.name)}</div>
            <div class="title">${this.esc(profile.title || profile.bio?.substring(0, 50) || '')}</div>
            <div class="badges">
                ${profile.plan === 'pro' ? '<span class="badge badge-pro">PRO</span>' : ''}
                ${profile.plan === 'premium' ? '<span class="badge badge-premium">PREMIUM</span>' : ''}
            </div>
        </div>
    </div>
    <div class="divider"></div>
    <div class="contact-grid">
        ${profile.phone ? `<div class="contact-item"><div class="contact-icon">&#128222;</div>${this.esc(profile.phone)}</div>` : ''}
        ${profile.email ? `<div class="contact-item"><div class="contact-icon">&#9993;</div>${this.esc(profile.email)}</div>` : ''}
        ${profile.location ? `<div class="contact-item"><div class="contact-icon">&#128205;</div>${this.esc(profile.location)}</div>` : ''}
        ${profile.website ? `<div class="contact-item"><div class="contact-icon">&#127760;</div>${this.esc(profile.website)}</div>` : ''}
    </div>
    <div class="qr-section">
        <div class="qr-placeholder" id="qr"></div>
        <div class="qr-text">Scannez mon profil</div>
    </div>
    <div class="bottom-bar"></div>
</div>
</body>
</html>`;
    }

    generateBack(profile, user, theme = 'dark', options = {}) {
        const colors = this.getThemeColors(theme, profile.plan);
        const services = (profile.services || []).slice(0, 6);

        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 0; size: ${this.cardWidth}mm ${this.cardHeight}mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${this.cardWidth}mm; height: ${this.cardHeight}mm; font-family: 'Helvetica Neue', Arial, sans-serif; overflow: hidden; }
    .card { width: 100%; height: 100%; background: ${colors.bg}; color: ${colors.text}; display: flex; flex-direction: column; padding: 4mm; position: relative; }
    .accent-bar { position: absolute; top: 0; left: 0; width: 100%; height: 2mm; background: ${colors.accent}; }
    .header { text-align: center; margin-bottom: 2mm; }
    .company { font-size: 3.5mm; font-weight: 800; color: ${colors.accent}; letter-spacing: 0.2mm; }
    .tagline { font-size: 1.8mm; color: ${colors.textLight}; margin-top: 0.5mm; }
    .services-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; flex: 1; }
    .service-card { background: ${colors.cardBg}; border-radius: 1mm; padding: 1.5mm; border-left: 0.5mm solid ${colors.accent}; }
    .service-name { font-size: 2mm; font-weight: 700; color: ${colors.text}; }
    .service-price { font-size: 1.8mm; color: ${colors.accent}; font-weight: 600; margin-top: 0.3mm; }
    .service-desc { font-size: 1.4mm; color: ${colors.textLight}; margin-top: 0.3mm; line-height: 1.3; }
    .social-bar { display: flex; justify-content: center; gap: 2mm; margin-top: 2mm; padding-top: 2mm; border-top: 0.2mm solid ${colors.divider}; }
    .social-link { font-size: 1.5mm; color: ${colors.textLight}; }
    .social-dot { width: 0.8mm; height: 0.8mm; background: ${colors.accent}; border-radius: 50%; }
    .bottom-section { position: absolute; bottom: 3mm; left: 4mm; right: 4mm; text-align: center; }
    .wave-info { font-size: 1.5mm; color: ${colors.accent}; font-weight: 600; }
    .wave-url { font-size: 1.2mm; color: ${colors.textLight}; margin-top: 0.3mm; }
    .bottom-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 1mm; background: ${colors.accent}; }
    .qr-back { position: absolute; bottom: 3mm; right: 3mm; width: 10mm; height: 10mm; border: 0.3mm solid ${colors.divider}; border-radius: 1mm; background: white; }
    ${profile.signature ? `.signature { position: absolute; bottom: 10mm; left: 4mm; width: 20mm; height: 8mm; background-image: url(${profile.signature}); background-size: contain; background-repeat: no-repeat; background-position: center; }` : ''}
</style>
</head>
<body>
<div class="card">
    <div class="accent-bar"></div>
    <div class="header">
        <div class="company">${this.esc(user.name)}</div>
        ${profile.title ? `<div class="tagline">${this.esc(profile.title)}</div>` : ''}
    </div>
    <div class="services-grid">
        ${services.map(s => `
        <div class="service-card">
            <div class="service-name">${this.esc(s.name)}</div>
            ${s.price ? `<div class="service-price">${this.esc(s.price)}</div>` : ''}
            ${s.description ? `<div class="service-desc">${this.esc(s.description.substring(0, 40))}</div>` : ''}
        </div>`).join('')}
    </div>
    <div class="social-bar">
        ${profile.socials?.facebook ? '<div class="social-link">Facebook</div><div class="social-dot"></div>' : ''}
        ${profile.socials?.instagram ? '<div class="social-link">Instagram</div><div class="social-dot"></div>' : ''}
        ${profile.socials?.twitter ? '<div class="social-link">Twitter</div><div class="social-dot"></div>' : ''}
        ${profile.socials?.linkedin ? '<div class="social-link">LinkedIn</div><div class="social-dot"></div>' : ''}
        ${profile.socials?.tiktok ? '<div class="social-link">TikTok</div><div class="social-dot"></div>' : ''}
    </div>
    ${profile.signature ? '<div class="signature"></div>' : ''}
    <div class="bottom-section">
        <div class="wave-info">Paiement Wave: ${this.esc(user.name)}</div>
        <div class="wave-url">flay.app/${this.esc(user.username)} | +225 07 59 73 19 90</div>
    </div>
    <div class="qr-back"></div>
    <div class="bottom-bar"></div>
</div>
</body>
</html>`;
    }

    getThemeColors(theme, plan) {
        const themes = {
            dark: {
                bg: '#1a1a2e', text: '#ffffff', textLight: '#a0a0b0', accent: '#667eea',
                cardBg: '#16213e', divider: '#2a2a4a', avatarBg: '#16213e', gold: '#f5a623'
            },
            light: {
                bg: '#ffffff', text: '#1a1a2e', textLight: '#666666', accent: '#667eea',
                cardBg: '#f8f9fa', divider: '#e0e0e0', avatarBg: '#f0f0f0', gold: '#f5a623'
            },
            midnight: {
                bg: '#0a0a23', text: '#ffffff', textLight: '#8888aa', accent: '#4a90d9',
                cardBg: '#111133', divider: '#222244', avatarBg: '#111133', gold: '#ffd700'
            },
            emerald: {
                bg: '#0d2818', text: '#ffffff', textLight: '#88bbaa', accent: '#2ecc71',
                cardBg: '#1a3a2a', divider: '#2a5a3a', avatarBg: '#1a3a2a', gold: '#f1c40f'
            },
            ocean: {
                bg: '#0a192f', text: '#ffffff', textLight: '#8899bb', accent: '#64ffda',
                cardBg: '#112240', divider: '#1d3557', avatarBg: '#112240', gold: '#ffd700'
            },
            sunset: {
                bg: '#1a0a0a', text: '#ffffff', textLight: '#cc8877', accent: '#ff6b6b',
                cardBg: '#2a1515', divider: '#3a2525', avatarBg: '#2a1515', gold: '#ffa500'
            },
            electric: {
                bg: '#0a0a1a', text: '#ffffff', textLight: '#9999bb', accent: '#a855f7',
                cardBg: '#15152a', divider: '#252545', avatarBg: '#15152a', gold: '#ffd700'
            },
            rose: {
                bg: '#1a0a15', text: '#ffffff', textLight: '#bb8899', accent: '#f472b6',
                cardBg: '#2a1525', divider: '#3a2535', avatarBg: '#2a1525', gold: '#ffd700'
            },
            forest: {
                bg: '#0a1a0a', text: '#ffffff', textLight: '#88aa88', accent: '#4ade80',
                cardBg: '#152a15', divider: '#253a25', avatarBg: '#152a15', gold: '#ffd700'
            },
            gold: {
                bg: '#1a150a', text: '#ffffff', textLight: '#bb9966', accent: '#f5a623',
                cardBg: '#2a2515', divider: '#3a3525', avatarBg: '#2a2515', gold: '#ffd700'
            },
            electric: {
                bg: '#0a0a1a', text: '#ffffff', textLight: '#9999bb', accent: '#a855f7',
                cardBg: '#15152a', divider: '#252545', avatarBg: '#15152a', gold: '#ffd700'
            }
        };
        return themes[theme] || themes.dark;
    }

    esc(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    getPrintCSS(orientation = 'landscape') {
        return `
            @page { margin: 0; size: ${this.cardWidth}mm ${this.cardHeight}mm ${orientation}; }
            @media print { body { margin: 0; } }
        `;
    }

    generatePrintPage(frontHTML, backHTML, copies = 1) {
        return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Cartes de visite - ${copies} exemplaire(s)</title>
<style>
    @page { margin: 5mm; size: A4 landscape; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f0f0f0; }
    .print-controls { position: fixed; top: 0; left: 0; right: 0; background: #1a1a2e; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
    .print-title { font-size: 18px; font-weight: 700; }
    .print-btn { background: #667eea; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    .print-btn:hover { background: #5a6fd6; }
    .cards-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; padding: 80px 20mm 20mm; max-width: 210mm; margin: 0 auto; }
    .card-frame { border: 1px solid #ccc; background: white; border-radius: 2mm; overflow: hidden; page-break-inside: avoid; }
    .card-frame iframe { width: ${this.cardWidth}mm; height: ${this.cardHeight}mm; border: none; }
    .card-label { text-align: center; padding: 5px; font-size: 11px; color: #666; border-top: 1px solid #eee; }
    .specs { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    @media print {
        .print-controls { display: none; }
        body { background: white; }
        .cards-grid { padding: 0; }
        .card-frame { border: none; }
    }
</style>
</head>
<body>
<div class="print-controls">
    <div class="print-title">Cartes de visite Flay - ${copies} exemplaire(s)</div>
    <div>
        <button class="print-btn" onclick="window.print()">Imprimer / Exporter PDF</button>
    </div>
</div>
<div class="specs">
    Format: ${this.cardWidth}mm x ${this.cardHeight}mm | Impression: recto/verso | Resolution: ${this.dpi} DPI
</div>
<div class="cards-grid">
    ${Array(copies).fill('').map((_, i) => `
    <div class="card-frame">
        <div class="card-label">Recto - Exemplaire ${i + 1}</div>
    </div>
    <div class="card-frame">
        <div class="card-label">Verso - Exemplaire ${i + 1}</div>
    </div>
    `).join('')}
</div>
</body>
</html>`;
    }
}

module.exports = new BusinessCardGenerator();
