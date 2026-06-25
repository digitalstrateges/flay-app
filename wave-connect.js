/**
 * Flay v4.0 - Wave Connect
 * Chaque utilisateur Pro/Premium/Doree connecte son compte Wave
 * pour recevoir les paiements de ses clients
 */

const crypto = require('crypto');

class WaveConnect {
    constructor() {
        this.config = {
            apiBase: process.env.WAVE_API_BASE || 'https://api.wave.com/v1',
            apiKey: process.env.WAVE_API_KEY || '',
            secretKey: process.env.WAVE_SECRET_KEY || '',
            webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
            appId: process.env.WAVE_APP_ID || '',
            redirectUri: process.env.WAVE_REDIRECT_URI || 'http://localhost:4000/api/wave/callback'
        };
        this.userAccounts = new Map(); // userId -> wave account info
    }

    // === OAuth Flow ===
    // 1. L'utilisateur clique "Connecter mon Wave"
    // 2. Il est redirige vers Wave pour autoriser
    // 3. Wave redirige vers notre callback avec le code
    // 4. On echange le code contre un access token
    // 5. On sauvegarde le token pour recevoir les paiements

    getAuthorizationUrl(userId) {
        const state = crypto.randomBytes(16).toString('hex');
        const params = new URLSearchParams({
            client_id: this.config.appId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            state: `${userId}:${state}`,
            scope: 'payments_receive'
        });
        
        return {
            url: `https://api.wave.com/oauth/authorize?${params.toString()}`,
            state
        };
    }

    async handleCallback(code, state) {
        try {
            const [userId] = state.split(':');
            
            // Exchange code for token
            const response = await fetch(`${this.config.apiBase}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(`${this.config.appId}:${this.config.secretKey}`).toString('base64')}`
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: this.config.redirectUri
                })
            });

            const data = await response.json();
            
            if (data.access_token) {
                // Get merchant info
                const merchantInfo = await this.getMerchantInfo(data.access_token);
                
                // Save connection
                const connection = {
                    userId,
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    merchantId: merchantInfo.id,
                    merchantName: merchantInfo.name,
                    merchantPhone: merchantInfo.phone,
                    currency: merchantInfo.currency,
                    connectedAt: new Date().toISOString(),
                    status: 'active'
                };
                
                this.userAccounts.set(userId, connection);
                return { success: true, connection };
            }
            
            return { success: false, error: data.error || 'Erreur d\'autorisation' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getMerchantInfo(accessToken) {
        try {
            const response = await fetch(`${this.config.apiBase}/merchant`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            return await response.json();
        } catch (error) {
            return { id: null, name: 'Unknown', phone: null, currency: 'XOF' };
        }
    }

    // === Creer un paiement pour un utilisateur ===
    async createPayment(userId, options) {
        const connection = this.userAccounts.get(userId);
        if (!connection || connection.status !== 'active') {
            return { error: 'Wave non connecte. Connectez votre compte Wave dans les parametres.' };
        }

        const {
            amount,
            currency = 'XOF',
            description = 'Paiement',
            customerName = '',
            customerPhone = '',
            externalId = null
        } = options;

        try {
            const response = await fetch(`${this.config.apiBase}/checkout/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${connection.accessToken}`
                },
                body: JSON.stringify({
                    amount: amount.toString(),
                    currency,
                    description,
                    customer: {
                        name: customerName,
                        phone: customerPhone
                    },
                    external_id: externalId || `flay_${Date.now()}`,
                    success_url: `${process.env.BASE_URL || 'http://localhost:4000'}/payment-success`,
                    cancel_url: `${process.env.BASE_URL || 'http://localhost:4000'}/payment-cancel`
                })
            });

            const data = await response.json();
            
            if (data.id) {
                return {
                    success: true,
                    sessionId: data.id,
                    paymentUrl: data.wave_launch_url,
                    status: data.status
                };
            }
            
            return { success: false, error: data.message || 'Erreur de creation de paiement' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // === Verifier le statut d'un paiement ===
    async checkPaymentStatus(sessionId, userId) {
        const connection = this.userAccounts.get(userId);
        if (!connection) return { error: 'Wave non connecte' };

        try {
            const response = await fetch(`${this.config.apiBase}/checkout/sessions/${sessionId}`, {
                headers: { 'Authorization': `Bearer ${connection.accessToken}` }
            });

            const data = await response.json();
            return {
                sessionId: data.id,
                status: data.status, // INITIATED, PENDING, EXPIRED, COMPLETED, FAILED
                amount: data.amount,
                currency: data.currency,
                customerName: data.customer?.name,
                customerPhone: data.customer?.phone,
                completedAt: data.completed_at
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    // === Webhook Handler ===
    handleWebhook(event, userId) {
        const { type, data } = event;
        
        switch (type) {
            case 'checkout.session.completed':
                return {
                    status: 'confirmed',
                    sessionId: data.id,
                    amount: data.amount,
                    currency: data.currency,
                    externalId: data.external_id,
                    customerName: data.customer?.name,
                    customerPhone: data.customer?.phone,
                    confirmedAt: new Date().toISOString()
                };
            
            case 'checkout.session.expired':
                return {
                    status: 'expired',
                    sessionId: data.id,
                    expiredAt: new Date().toISOString()
                };
            
            default:
                return { status: 'unknown', type };
        }
    }

    // === Generer le bouton de paiement ===
    generatePaymentButton(userId, amount, description, options = {}) {
        const {
            color = '#6366f1',
            textColor = '#ffffff',
            size = 'large',
            fullWidth = true
        } = options;

        return `
        <div class="flay-wave-button" style="margin: 16px 0;">
            <form action="/api/wave/pay" method="POST" style="${fullWidth ? 'width: 100%;' : 'display: inline-block;'}">
                <input type="hidden" name="userId" value="${userId}">
                <input type="hidden" name="amount" value="${amount}">
                <input type="hidden" name="description" value="${description}">
                <button type="submit" style="
                    display: inline-flex; align-items: center; gap: 8px; 
                    padding: ${size === 'large' ? '16px 32px' : '10px 20px'}; 
                    background: ${color}; color: ${textColor}; border: none; border-radius: 12px; 
                    font-weight: 700; font-size: ${size === 'large' ? '16px' : '14px'};
                    width: 100%; justify-content: center; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 12px ${color}40;"
                    onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px ${color}60'"
                    onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px ${color}40'">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                    </svg>
                    Payer ${amount.toLocaleString()} FCFA via Wave
                </button>
            </form>
            <p style="text-align: center; font-size: 11px; color: var(--muted); margin-top: 8px;">
                Paiement securise par Wave
            </p>
        </div>`;
    }

    // === Status de connexion ===
    getConnectionStatus(userId) {
        const connection = this.userAccounts.get(userId);
        if (!connection) {
            return { connected: false, message: 'Wave non connecte' };
        }
        return {
            connected: true,
            merchantName: connection.merchantName,
            merchantPhone: connection.merchantPhone,
            currency: connection.currency,
            connectedAt: connection.connectedAt
        };
    }

    // === Deconnecter ===
    disconnect(userId) {
        this.userAccounts.delete(userId);
        return { success: true, message: 'Wave deconnecte' };
    }
}

module.exports = new WaveConnect();
