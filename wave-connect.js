/**
 * Flay v4.0 - Wave Connect
 * 
 * Mode API Key (pas OAuth — Wave n'a pas d'OAuth)
 * 
 * Comment ca marche:
 * 1. Chaque utilisateur Pro/Premium/Doree entre sa Wave API key
 * 2. La cle est stockee en base (chiffree)
 * 3. On utilise la cle pour creer des sessions checkout
 * 4. Les paiements vont directement sur le Wave account de l'utilisateur
 * 
 * Pour obtenir une cle API Wave:
 * 1. Creer un compte Wave Business sur business.wave.com
 * 2. Verifier son identite (NINEA requis)
 * 3. Aller dans Developpeur → Cles API
 * 4. Creer une cle avec scope "Checkout API"
 * 5. Copier la cle (elle n'apparaitra qu'une seule fois)
 */

const crypto = require('crypto');

class WaveConnect {
    constructor() {
        this.apiBase = 'https://api.wave.com/v1';
        this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
        
        // In-memory store for user Wave connections
        // In production: store in DB with encrypted keys
        this.connections = new Map(); // userId -> { apiKey, status, info }
    }

    // ===================================================================
    //  CONNECTER UN COMPTE WAVE
    // ===================================================================

    /**
     * Connecter le compte Wave d'un utilisateur
     * L'utilisateur fournit sa cle API Wave Business
     */
    async connect(userId, apiKey) {
        if (!apiKey || !apiKey.startsWith('wave_')) {
            return { success: false, error: 'Cle API Wave invalide. Doit commencer par "wave_"' };
        }

        // Tester la cle en recuperant les infos du compte
        try {
            const response = await fetch(`${this.apiBase}/checkout/sessions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.ok || response.status === 404) {
                // 404 = pas de sessions encore = cle valide
                // On stocke la connexion
                const connection = {
                    userId,
                    apiKey,
                    status: 'active',
                    connectedAt: new Date().toISOString(),
                    lastCheck: new Date().toISOString()
                };

                this.connections.set(userId, connection);

                return {
                    success: true,
                    message: 'Compte Wave connecte avec succes',
                    connection: {
                        status: 'active',
                        connectedAt: connection.connectedAt
                    }
                };
            }

            if (response.status === 401 || response.status === 403) {
                return { success: false, error: 'Cle API Wave invalide ou expiree' };
            }

            // Autre erreur
            const data = await response.json().catch(() => ({}));
            return { success: false, error: data.message || 'Erreur de verification de la cle Wave' };
        } catch (error) {
            return { success: false, error: 'Erreur connexion Wave API: ' + error.message };
        }
    }

    /**
     * Verifier la validite d'une cle Wave
     */
    async verify(userId) {
        const conn = this.connections.get(userId);
        if (!conn) {
            return { connected: false, message: 'Wave non connecte' };
        }

        try {
            const response = await fetch(`${this.apiBase}/checkout/sessions`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${conn.apiKey}` }
            });

            conn.lastCheck = new Date().toISOString();

            if (response.ok || response.status === 404) {
                conn.status = 'active';
                return { connected: true, status: 'active', lastCheck: conn.lastCheck };
            }

            conn.status = 'expired';
            return { connected: false, status: 'expired', message: 'Cle API expiree ou invalide' };
        } catch (error) {
            return { connected: false, error: error.message };
        }
    }

    // ===================================================================
    //  CREER UN PAIEMENT
    // ===================================================================

    async createPayment(userId, options) {
        const conn = this.connections.get(userId);
        
        // Si pas de cle API, utiliser le mode lien (fallback)
        if (!conn || conn.status !== 'active') {
            return this._fallbackPayment(options);
        }

        const {
            amount,
            currency = 'XOF',
            description = 'Paiement',
            customerName = '',
            customerPhone = '',
            externalId = null
        } = options;

        const ref = externalId || `flay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        try {
            const body = JSON.stringify({
                amount: Math.round(amount).toString(),
                currency,
                description,
                customer: {
                    name: customerName || undefined,
                    phone: customerPhone || undefined
                },
                external_id: ref,
                success_url: `${this.baseUrl}/payment-success?ref=${ref}`,
                cancel_url: `${this.baseUrl}/payment-cancel?ref=${ref}`
            });

            const response = await fetch(`${this.apiBase}/checkout/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${conn.apiKey}`
                },
                body
            });

            const data = await response.json();

            if (response.ok && data.id) {
                return {
                    success: true,
                    sessionId: data.id,
                    paymentUrl: data.wave_launch_url,
                    status: data.status,
                    ref
                };
            }

            return {
                success: false,
                error: data.message || data.error || 'Erreur Wave API',
                code: data.code
            };
        } catch (error) {
            return { success: false, error: 'Erreur Wave: ' + error.message };
        }
    }

    /**
     * Fallback: generer un lien de paiement statique
     */
    _fallbackPayment(options) {
        const { amount, description = 'Paiement', externalId } = options;
        const ref = externalId || `flay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        return {
            success: true,
            isFallback: true,
            paymentUrl: `${process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/'}?amount=${amount}&description=${encodeURIComponent(description)}&ref=${ref}`,
            ref,
            message: 'Utilisation du lien de paiement Wave (mode sans API key)'
        };
    }

    // ===================================================================
    //  WEBHOOK
    // ===================================================================

    handleWebhook(event) {
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

            case 'checkout.session.payment_failed':
                return {
                    status: 'failed',
                    sessionId: data.id,
                    error: 'Paiement echoue'
                };

            case 'checkout.session.expired':
                return {
                    status: 'expired',
                    sessionId: data.id
                };

            default:
                return { status: 'unknown', type };
        }
    }

    // ===================================================================
    //  DECONNEXION
    // ===================================================================

    disconnect(userId) {
        this.connections.delete(userId);
        return { success: true, message: 'Wave deconnecte' };
    }

    getConnectionStatus(userId) {
        const conn = this.connections.get(userId);
        if (!conn) {
            return { connected: false, message: 'Wave non connecte' };
        }
        return {
            connected: true,
            status: conn.status,
            connectedAt: conn.connectedAt,
            lastCheck: conn.lastCheck
        };
    }

    // ===================================================================
    //  BOUTON DE PAIEMENT (pour les profils publics)
    // ===================================================================

    generatePaymentButton(userId, amount, description, options = {}) {
        const { color = '#1dc4e9', size = 'large' } = options;
        const conn = this.connections.get(userId);
        const hasApi = conn && conn.status === 'active';

        if (hasApi) {
            return `
            <form action="/api/wave/pay" method="POST" style="width:100%">
                <input type="hidden" name="userId" value="${userId}">
                <input type="hidden" name="amount" value="${amount}">
                <input type="hidden" name="description" value="${description}">
                <button type="submit" style="
                    display:flex; align-items:center; gap:10px; width:100%; justify-content:center;
                    padding: ${size === 'large' ? '16px 32px' : '12px 24px'};
                    background: linear-gradient(135deg, ${color}, ${color}dd);
                    color: #fff; border: none; border-radius: 12px; font-weight: 700;
                    font-size: ${size === 'large' ? '16px' : '14px'}; cursor: pointer;
                    box-shadow: 0 4px 15px ${color}40; transition: transform 0.2s;"
                    onmouseover="this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.transform='translateY(0)'">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/></svg>
                    Payer ${Number(amount).toLocaleString()} FCFA via Wave
                </button>
            </form>`;
        }

        // Mode lien (sans API key)
        return `
        <a href="${process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/'}?amount=${amount}&description=${encodeURIComponent(description)}"
           target="_blank" style="
            display:flex; align-items:center; gap:10px; width:100%; justify-content:center;
            padding: ${size === 'large' ? '16px 32px' : '12px 24px'};
            background: linear-gradient(135deg, ${color}, ${color}dd);
            color: #fff; border-radius: 12px; text-decoration: none; font-weight: 700;
            font-size: ${size === 'large' ? '16px' : '14px'};
            box-shadow: 0 4px 15px ${color}40; transition: transform 0.2s;"
            onmouseover="this.style.transform='translateY(-2px)'"
            onmouseout="this.style.transform='translateY(0)'">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/></svg>
            Payer ${Number(amount).toLocaleString()} FCFA via Wave
        </a>`;
    }
}

module.exports = new WaveConnect();
