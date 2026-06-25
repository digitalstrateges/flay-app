/**
 * Flay Omni - SMS System
 * Notifications SMS (simulation en dev, integre Twilio en prod)
 */

const crypto = require('crypto');

class SMSSystem {
    constructor() {
        this.sent = new Map();
        this.templates = new Map();
        this.initTemplates();
    }

    initTemplates() {
        this.templates.set('reservation', 'Flay: Nouvelle reservation de {clientName} pour "{service}" le {date} a {time}. Connectez-vous pour confirmer.');
        this.templates.set('payment', 'Flay: Paiement recu ! Plan {plan} active pour {amount} FCFA. Merci !');
        this.templates.set('reminder', 'Flay: Rappel - Vous avez une reservation demain a {time} pour "{service}".');
        this.templates.set('verification', 'Flay: Votre code de verification est {code}. Valable 10 minutes.');
        this.templates.set('plan_expiring', 'Flay: Votre plan {plan} expire dans {daysLeft} jours. Renouvelez pour continuer.');
    }

    async send(phone, templateName, variables = {}) {
        const template = this.templates.get(templateName);
        if (!template) return { sent: false, error: 'Template inconnu' };

        let message = template;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        const sms = {
            id: `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            to: phone,
            message,
            template: templateName,
            status: 'sent',
            createdAt: new Date().toISOString()
        };

        this.sent.set(sms.id, sms);
        console.log(`[SMS] Sent to ${phone}: ${message.substring(0, 50)}...`);
        return { sent: true, smsId: sms.id };
    }

    generateVerificationCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    getUserSMS(userId, limit = 50) {
        const sms = [];
        for (const [, s] of this.sent) { sms.push(s); }
        return sms.slice(-limit).reverse();
    }

    getStats(userId) {
        const sms = this.getUserSMS(userId);
        return { total: sms.length, sent: sms.filter(s => s.status === 'sent').length };
    }
}

module.exports = new SMSSystem();
