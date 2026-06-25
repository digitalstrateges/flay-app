/**
 * Flay Omni - Email System
 * Emails transactionnels et notifications
 * (Simulation en dev, integre SendGrid/Mailgun en prod)
 */

const crypto = require('crypto');

class EmailSystem {
    constructor() {
        this.sent = new Map();
        this.templates = new Map();
        this.queue = [];
        this.initTemplates();
    }

    initTemplates() {
        this.templates.set('welcome', {
            subject: 'Bienvenue sur Flay !',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <h2 style="color:#1a1a2e;">Bienvenue ${data.name} !</h2>
                    <p style="color:#666;line-height:1.7;">Votre compte a ete cree avec succes. Votre lien de profil est :</p>
                    <div style="background:#f8f9fa;padding:16px;border-radius:8px;text-align:center;margin:20px 0;">
                        <a href="${data.profileUrl}" style="color:#667eea;font-weight:600;font-size:16px;">${data.profileUrl}</a>
                    </div>
                    <p style="color:#666;">Commencez a personnaliser votre profil des maintenant !</p>
                    <div style="text-align:center;margin-top:32px;">
                        <a href="${data.dashboardUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Mon tableau de bord</a>
                    </div>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });

        this.templates.set('payment_confirmed', {
            subject: 'Paiement confirme - Flay',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <div style="text-align:center;font-size:48px;margin-bottom:16px;">✅</div>
                    <h2 style="color:#1a1a2e;text-align:center;">Paiement confirme !</h2>
                    <div style="background:#f0fdf4;padding:20px;border-radius:12px;margin:20px 0;text-align:center;">
                        <p style="color:#16a34a;font-size:24px;font-weight:800;">${data.amount?.toLocaleString()} ${data.currency}</p>
                        <p style="color:#666;margin-top:4px;">Plan ${data.plan} active</p>
                    </div>
                    <p style="color:#666;line-height:1.7;">Votre plan ${data.plan} est maintenant actif. Profitez de toutes ses fonctionnalites !</p>
                    <div style="text-align:center;margin-top:32px;">
                        <a href="${data.dashboardUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Acceder a mon espace</a>
                    </div>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });

        this.templates.set('reservation', {
            subject: 'Nouvelle reservation - Flay',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <h2 style="color:#1a1a2e;">Nouvelle reservation</h2>
                    <div style="background:#f8f9fa;padding:20px;border-radius:12px;margin:20px 0;">
                        <p style="margin:8px 0;"><strong>Client :</strong> ${data.clientName}</p>
                        <p style="margin:8px 0;"><strong>Service :</strong> ${data.service}</p>
                        <p style="margin:8px 0;"><strong>Date :</strong> ${data.date} a ${data.time}</p>
                        ${data.message ? `<p style="margin:8px 0;"><strong>Message :</strong> ${data.message}</p>` : ''}
                    </div>
                    <div style="text-align:center;margin-top:32px;">
                        <a href="${data.dashboardUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Voir la reservation</a>
                    </div>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });

        this.templates.set('plan_expiring', {
            subject: 'Votre plan expire bientot - Flay',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <div style="text-align:center;font-size:48px;margin-bottom:16px;">⏰</div>
                    <h2 style="color:#1a1a2e;text-align:center;">Plan expirant bientot</h2>
                    <p style="color:#666;line-height:1.7;text-align:center;">Votre plan ${data.plan} expire dans ${data.daysLeft} jours.</p>
                    <div style="text-align:center;margin-top:32px;">
                        <a href="${data.paymentUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Renouveler maintenant</a>
                    </div>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });

        this.templates.set('password_reset', {
            subject: 'Reinitialisation mot de passe - Flay',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <h2 style="color:#1a1a2e;">Reinitialisation du mot de passe</h2>
                    <p style="color:#666;line-height:1.7;">Vous avez demande la reinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
                    <div style="text-align:center;margin:32px 0;">
                        <a href="${data.resetUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Reinitialiser</a>
                    </div>
                    <p style="color:#999;font-size:13px;">Ce lien expire dans 1 heure. Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });

        this.templates.set('weekly_stats', {
            subject: 'Vos statistiques hebdomadaires - Flay',
            html: (data) => `
                <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:40px;">
                    <div style="text-align:center;margin-bottom:32px;">
                        <h1 style="font-size:32px;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Flay</h1>
                    </div>
                    <h2 style="color:#1a1a2e;">Resume de la semaine</h2>
                    <div style="display:flex;gap:12px;margin:20px 0;">
                        <div style="flex:1;background:#f8f9fa;padding:16px;border-radius:12px;text-align:center;">
                            <p style="font-size:24px;font-weight:800;color:#667eea;">${data.views || 0}</p>
                            <p style="font-size:12px;color:#666;">Vues</p>
                        </div>
                        <div style="flex:1;background:#f8f9fa;padding:16px;border-radius:12px;text-align:center;">
                            <p style="font-size:24px;font-weight:800;">${data.clicks || 0}</p>
                            <p style="font-size:12px;color:#666;">Clics</p>
                        </div>
                        <div style="flex:1;background:#f8f9fa;padding:16px;border-radius:12px;text-align:center;">
                            <p style="font-size:24px;font-weight:800;color:#16a34a;">${data.reservations || 0}</p>
                            <p style="font-size:12px;color:#666;">Reservations</p>
                        </div>
                    </div>
                    <div style="text-align:center;margin-top:32px;">
                        <a href="${data.dashboardUrl}" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Voir les details</a>
                    </div>
                    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;text-align:center;color:#999;font-size:12px;">
                        Flay by DIGITALSTRATEGES | +225 07 59 73 19 90
                    </div>
                </div>`
        });
    }

    async send(to, templateName, data = {}, options = {}) {
        const template = this.templates.get(templateName);
        if (!template) return { sent: false, error: 'Template inconnu' };

        const email = {
            id: `email_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            to,
            subject: template.subject,
            html: template.html(data),
            from: options.from || 'noreply@flay.app',
            status: 'sent',
            createdAt: new Date().toISOString()
        };

        this.sent.set(email.id, email);
        console.log(`[EMAIL] Sent to ${to}: ${template.subject}`);
        return { sent: true, emailId: email.id };
    }

    getUserEmails(userId, limit = 50) {
        const emails = [];
        for (const [, e] of this.sent) { emails.push(e); }
        return emails.slice(-limit).reverse();
    }

    getStats(userId) {
        const emails = this.getUserEmails(userId);
        return { total: emails.length, sent: emails.filter(e => e.status === 'sent').length };
    }
}

module.exports = new EmailSystem();
