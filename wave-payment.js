/**
 * Flay v14.0 - Wave Payment Integration
 * 
 * Deux modes:
 * 1. Abonnement Flay: Utilisateurs paient leur plan (Pro/Premium)
 * 2. Paiements utilisateurs: Chaque utilisateur recoit l'argent de ses clients
 * 
 * Wave API Docs: https://developers.wave.com/
 */

const crypto = require('crypto');

class WavePayment {
    constructor() {
        this.config = {
            merchantId: process.env.WAVE_MERCHANT_ID || '',
            apiKey: process.env.WAVE_API_KEY || '',
            secretKey: process.env.WAVE_SECRET_KEY || '',
            webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
            baseUrl: process.env.WAVE_BASE_URL || 'https://api.wave.com/v1',
            paymentLink: process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/'
        };
    }

    // === PAIEMENT D'ABONNEMENT FLAY ===
    // L'utilisateur paie son abonnement via le lien Wave de Flay
    createSubscriptionPayment(userId, plan, amount) {
        const ref = `FLAY-SUB-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        return {
            ref,
            userId,
            plan,
            amount,
            currency: 'XOF',
            paymentUrl: this.config.paymentLink,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }

    // === PAIEMENTS UTILISATEUR ===
    // Chaque utilisateur recoit l'argent de ses clients
    
    // Creer un lien de paiement personnalise pour un utilisateur
    createPaymentLink(userId, options = {}) {
        const {
            amount,
            currency = 'XOF',
            description = 'Paiement Flay',
            customerName = '',
            customerEmail = '',
            customerPhone = '',
            expiresIn = 3600
        } = options;

        const ref = `FLAY-${userId.substring(0, 8)}-${Date.now()}`;
        
        return {
            ref,
            userId,
            amount,
            currency,
            description,
            customer: { name: customerName, email: customerEmail, phone: customerPhone },
            paymentUrl: `${this.config.paymentLink}?amount=${amount}&ref=${ref}`,
            status: 'pending',
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            createdAt: new Date().toISOString()
        };
    }

    // Creer un lien de paiement pour une reservation
    createReservationPayment(userId, reservationId, amount, clientName) {
        const ref = `RES-${reservationId.substring(0, 8)}-${Date.now()}`;
        return {
            ref,
            userId,
            reservationId,
            amount,
            currency: 'XOF',
            description: `Reservation - ${clientName}`,
            paymentUrl: `${this.config.paymentLink}?amount=${amount}&ref=${ref}`,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }

    // Creer un lien de paiement pour une facture
    createInvoicePayment(userId, invoiceId, amount, contactName) {
        const ref = `INV-${invoiceId.substring(0, 8)}-${Date.now()}`;
        return {
            ref,
            userId,
            invoiceId,
            amount,
            currency: 'XOF',
            description: `Facture - ${contactName}`,
            paymentUrl: `${this.config.paymentLink}?amount=${amount}&ref=${ref}`,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    }

    // Verifier le statut d'un paiement (via Wave API)
    async checkPaymentStatus(ref) {
        // En production, appeler l'API Wave
        // GET https://api.wave.com/v1/payment/{ref}
        try {
            const response = await fetch(`${this.config.baseUrl}/payments/${ref}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Wave API Error:', error);
            return { status: 'unknown', error: error.message };
        }
    }

    // Webhook Wave - Confirmer un paiement
    verifyWebhookSignature(payload, signature) {
        if (!this.config.webhookSecret) return true; // Skip in dev
        
        const expectedSignature = crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    handleWebhook(event) {
        const { type, data } = event;
        
        switch (type) {
            case 'payment.successful':
                return {
                    status: 'confirmed',
                    ref: data.ref,
                    amount: data.amount,
                    currency: data.currency,
                    customerName: data.customer?.name || '',
                    customerPhone: data.customer?.phone || '',
                    confirmedAt: new Date().toISOString()
                };
            
            case 'payment.failed':
                return {
                    status: 'failed',
                    ref: data.ref,
                    error: data.failure_reason || 'Paiement echoue',
                    failedAt: new Date().toISOString()
                };
            
            case 'payment.expired':
                return {
                    status: 'expired',
                    ref: data.ref,
                    expiredAt: new Date().toISOString()
                };
            
            default:
                return { status: 'unknown', type };
        }
    }

    // Generer le HTML du bouton de paiement
    generatePaymentButton(amount, description, options = {}) {
        const {
            color = '#6366f1',
            textColor = '#ffffff',
            size = 'large',
            fullWidth = true
        } = options;

        return `
        <div class="flay-payment-button" style="margin: 16px 0;">
            <a href="${this.config.paymentLink}?amount=${amount}&description=${encodeURIComponent(description)}" 
               target="_blank"
               style="display: inline-flex; align-items: center; gap: 8px; padding: ${size === 'large' ? '16px 32px' : '10px 20px'}; 
                      background: ${color}; color: ${textColor}; border-radius: 12px; 
                      text-decoration: none; font-weight: 700; font-size: ${size === 'large' ? '16px' : '14px'};
                      ${fullWidth ? 'width: 100%; justify-content: center;' : ''}
                      transition: transform 0.2s, box-shadow 0.2s;
                      box-shadow: 0 4px 12px ${color}40;"
               onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px ${color}60'"
               onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px ${color}40'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                </svg>
                Payer ${amount.toLocaleString()} FCFA via Wave
            </a>
        </div>`;
    }

    // Generer le formulaire de paiement
    generatePaymentForm(userId, options = {}) {
        const { service = '', amount = 0, description = '' } = options;
        
        return `
        <form class="flay-payment-form" id="wavePaymentForm" style="max-width: 400px; margin: 0 auto;">
            <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px;">
                <h3 style="margin-bottom: 16px; font-size: 18px;">Paiement Wave</h3>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px;">Nom</label>
                    <input type="text" name="name" required placeholder="Votre nom"
                           style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px;">Telephone</label>
                    <input type="tel" name="phone" required placeholder="+225 XX XX XX XX XX"
                           style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px;">Service</label>
                    <input type="text" name="service" value="${service}" placeholder="Ex: Mariage, Portrait..."
                           style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px;">Montant (FCFA)</label>
                    <input type="number" name="amount" value="${amount}" required min="100"
                           style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); font-size: 18px; font-weight: 700;">
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer;">
                    Payer via Wave
                </button>
                
                <p style="text-align: center; font-size: 12px; color: var(--muted); margin-top: 12px;">
                    Paiement securise par Wave
                </p>
            </div>
        </form>`;
    }
}

module.exports = new WavePayment();
