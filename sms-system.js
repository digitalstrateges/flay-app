/**
 * Flay Omni - Enhanced SMS System
 * Real SMS integration with Africa's Talking / Twilio
 */

const crypto = require('crypto');
const https = require('https');

class SMSSystem {
    constructor() {
        this.sent = new Map();
        this.templates = new Map();
        this.config = {
            provider: process.env.SMS_PROVIDER || 'africastalking', // africastalking | twilio | console
            apiKey: process.env.SMS_API_KEY || '',
            username: process.env.SMS_USERNAME || '',
            senderId: process.env.SMS_SENDER_ID || 'FLAY',
            // Twilio
            twilioSid: process.env.TWILIO_SID || '',
            twilioToken: process.env.TWILIO_TOKEN || '',
            twilioFrom: process.env.TWILIO_FROM || '',
        };
        this.initTemplates();
    }

    initTemplates() {
        this.templates.set('verification', {
            message: 'Flay: Votre code de verification est {code}. Valable 10 minutes. Ne partagez ce code avec personne.',
            variables: ['code']
        });
        this.templates.set('reservation', {
            message: 'Flay: Nouvelle reservation de {clientName} pour "{service}" le {date} a {time}. Connectez-vous pour confirmer.',
            variables: ['clientName', 'service', 'date', 'time']
        });
        this.templates.set('reservation_confirmed', {
            message: 'Flay: Votre reservation pour "{service}" le {date} a {time} est confirmee ! A bientot.',
            variables: ['service', 'date', 'time']
        });
        this.templates.set('reservation_cancelled', {
            message: 'Flay: Votre reservation pour "{service}" le {date} a ete annulee.',
            variables: ['service', 'date']
        });
        this.templates.set('payment', {
            message: 'Flay: Paiement recu ! {amount} {currency} pour "{service}". Merci pour votre confiance !',
            variables: ['amount', 'currency', 'service']
        });
        this.templates.set('reminder', {
            message: 'Flay: Rappel - Vous avez une reservation demain a {time} pour "{service}". A demain !',
            variables: ['time', 'service']
        });
        this.templates.set('plan_expiring', {
            message: 'Flay: Votre plan {plan} expire dans {days} jours. Renouvelez pour continuer a beneficier de vos avantages.',
            variables: ['plan', 'days']
        });
        this.templates.set('promo', {
            message: 'Flay: {message} Utilisez le code {code} pour {discount}. Valable jusqu\'a {expiry}.',
            variables: ['message', 'code', 'discount', 'expiry']
        });
        this.templates.set('welcome', {
            message: 'Flay: Bienvenue {name} ! Votre compte est active. Connectez-vous sur {url} pour commencer.',
            variables: ['name', 'url']
        });
    }

    async send(phone, templateName, variables = {}) {
        const template = this.templates.get(templateName);
        if (!template) return { sent: false, error: 'Template inconnu' };

        let message = template.message;
        for (const [key, value] of Object.entries(variables)) {
            message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        // Truncate to 160 chars for SMS
        if (message.length > 160) {
            message = message.substring(0, 157) + '...';
        }

        const sms = {
            id: `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
            to: this._formatPhone(phone),
            message,
            template: templateName,
            status: 'queued',
            createdAt: new Date().toISOString()
        };

        // Send via provider
        if (this.config.provider === 'africastalking' && this.config.apiKey) {
            try {
                await this._sendAfricasTalking(sms);
                sms.status = 'sent';
                sms.sentAt = new Date().toISOString();
            } catch (e) {
                sms.status = 'failed';
                sms.error = e.message;
                console.log(`[SMS-AT] Failed: ${e.message}`);
            }
        } else if (this.config.provider === 'twilio' && this.config.twilioSid) {
            try {
                await this._sendTwilio(sms);
                sms.status = 'sent';
                sms.sentAt = new Date().toISOString();
            } catch (e) {
                sms.status = 'failed';
                sms.error = e.message;
                console.log(`[SMS-TWILIO] Failed: ${e.message}`);
            }
        } else {
            // Dev mode - just log
            sms.status = 'sent';
            sms.sentAt = new Date().toISOString();
            console.log(`[SMS] To: ${sms.to} | ${sms.message}`);
        }

        this.sent.set(sms.id, sms);
        return { sent: sms.status === 'sent', smsId: sms.id, status: sms.status };
    }

    async _sendAfricasTalking(sms) {
        const params = new URLSearchParams({
            username: this.config.username,
            to: sms.to,
            message: sms.message,
            from: this.config.senderId
        });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.africastalking.com',
                path: '/version1/messaging',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'apiKey': this.config.apiKey,
                    'Accept': 'application/json'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.SMSMessageData?.Recipients?.[0]?.status === 'Success') {
                            resolve(json);
                        } else {
                            reject(new Error(json.SMSMessageData?.Message || 'Send failed'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(params.toString());
            req.end();
        });
    }

    async _sendTwilio(sms) {
        const params = new URLSearchParams({
            To: sms.to,
            From: this.config.twilioFrom,
            Body: sms.message
        });

        const auth = Buffer.from(`${this.config.twilioSid}:${this.config.twilioToken}`).toString('base64');

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.twilio.com',
                path: `/2010-04-01/Accounts/${this.config.twilioSid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.sid) {
                            resolve(json);
                        } else {
                            reject(new Error(json.message || 'Send failed'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(params.toString());
            req.end();
        });
    }

    _formatPhone(phone) {
        // Ensure proper format
        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('225')) return '+' + cleaned;
        if (cleaned.length === 10) return '+225' + cleaned;
        if (!cleaned.startsWith('+')) return '+' + cleaned;
        return cleaned;
    }

    generateVerificationCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    async sendVerification(phone) {
        const code = this.generateVerificationCode();
        const result = await this.send(phone, 'verification', { code });
        return { ...result, code };
    }

    getUserSMS(userId, limit = 50) {
        return Array.from(this.sent.values())
            .filter(s => s.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    }

    getStats(userId) {
        const sms = this.getUserSMS(userId, 1000);
        return {
            total: sms.length,
            sent: sms.filter(s => s.status === 'sent').length,
            failed: sms.filter(s => s.status === 'failed').length,
            queued: sms.filter(s => s.status === 'queued').length
        };
    }
}

module.exports = new SMSSystem();
