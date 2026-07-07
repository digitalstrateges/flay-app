/**
 * Flay PDF Export - Generation de profils au format PDF
 * Utilise purement du HTML/CSS pour generer le PDF (sans dependances)
 */

class PDFExport {
    constructor() {
        this.styles = `
            @page { margin: 20mm; size: A4; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #667eea; padding-bottom: 20px; }
            .avatar { width: 120px; height: 120px; border-radius: 50%; border: 4px solid #667eea; margin: 0 auto 15px; display: block; background: #f0f0f0; }
            .name { font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0 0 5px; }
            .bio { font-size: 14px; color: #666; line-height: 1.6; margin: 10px 0; }
            .location { font-size: 13px; color: #888; margin: 5px 0; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin: 5px; }
            .badge-pro { background: linear-gradient(135deg, #667eea, #764ba2); color: white; }
            .badge-premium { background: linear-gradient(135deg, #f093fb, #f5576c); color: white; }
            .section { margin: 25px 0; }
            .section-title { font-size: 18px; font-weight: 600; color: #1a1a2e; border-left: 4px solid #667eea; padding-left: 12px; margin-bottom: 15px; }
            .service { background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 3px solid #667eea; }
            .service-name { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0; }
            .service-desc { font-size: 13px; color: #666; margin: 5px 0 0; }
            .service-price { font-size: 15px; font-weight: 700; color: #667eea; float: right; }
            .contact { display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; }
            .contact-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; }
            .contact-label { font-weight: 600; color: #1a1a2e; }
            .socials { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }
            .social-link { display: inline-block; padding: 8px 16px; background: #667eea; color: white; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; font-size: 11px; color: #999; }
            .qr-code { text-align: center; margin: 20px 0; }
            .qr-code img { width: 150px; height: 150px; }
            @media print {
                body { padding: 0; }
                .no-print { display: none; }
            }
        `;
    }

    generate(profile, user) {
        const servicesHTML = (profile.services || []).map(s => `
            <div class="service">
                ${s.price ? `<div class="service-price">${s.price}</div>` : ''}
                <div class="service-name">${this.escapeHTML(s.name)}</div>
                ${s.description ? `<div class="service-desc">${this.escapeHTML(s.description)}</div>` : ''}
            </div>
        `).join('');

        const badgeHTML = profile.plan === 'premium'
            ? '<span class="badge badge-premium">PREMIUM</span>'
            : profile.plan === 'pro'
            ? '<span class="badge badge-pro">VERIFIE PRO</span>'
            : '';

        const contactItems = [];
        if (profile.phone) contactItems.push(`<div class="contact-item"><span class="contact-label">Tel:</span> ${this.escapeHTML(profile.phone)}</div>`);
        if (profile.email) contactItems.push(`<div class="contact-item"><span class="contact-label">Email:</span> ${this.escapeHTML(profile.email)}</div>`);
        if (profile.location) contactItems.push(`<div class="contact-item"><span class="contact-label">Localisation:</span> ${this.escapeHTML(profile.location)}</div>`);

        const socialsHTML = profile.socials
            ? Object.entries(profile.socials).filter(([,v]) => v).map(([k, v]) => `<a class="social-link" href="${v}">${k.charAt(0).toUpperCase() + k.slice(1)}</a>`).join('')
            : '';

        const qrURL = `https://flay.app/${user.username}`;

        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>${this.escapeHTML(user.name)} - Profil Flay</title>
    <style>${this.styles}</style>
</head>
<body>
    <div class="header">
        <div class="name">${this.escapeHTML(user.name)}</div>
        ${badgeHTML}
        <div class="bio">${this.escapeHTML(profile.bio || '')}</div>
        ${profile.location ? `<div class="location">&#128205; ${this.escapeHTML(profile.location)}</div>` : ''}
    </div>

    ${contactItems.length ? `
    <div class="section">
        <div class="section-title">Contact</div>
        <div class="contact">${contactItems.join('')}</div>
    </div>` : ''}

    ${servicesHTML ? `
    <div class="section">
        <div class="section-title">Services</div>
        ${servicesHTML}
    </div>` : ''}

    ${socialsHTML ? `
    <div class="section">
        <div class="section-title">Reseaux Sociaux</div>
        <div class="socials">${socialsHTML}</div>
    </div>` : ''}

    <div class="qr-code">
        <div class="section-title">Scannez pour visiter mon profil</div>
        <div style="font-size:14px;color:#667eea;font-weight:600;">${qrURL}</div>
    </div>

    <div class="footer">
        Profil genere via Flay - ${new Date().toLocaleDateString('fr-FR')}<br>
        DIGITALSTRATEGES - Contact: +225 07 59 73 19 90
    </div>
</body>
</html>`;
    }

    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

module.exports = new PDFExport();
