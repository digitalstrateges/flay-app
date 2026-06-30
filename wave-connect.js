/**
 * Flay v22.0 - Wave Connect
 * 
 * Mode Lien de paiement Wave (sans NINEA)
 * 
 * Comment ca marche:
 * 1. L'utilisateur installe Wave Business (gratuit)
 * 2. Il genere un lien de paiement depuis l'app Wave
 * 3. Il colle le lien dans Flay → Settings → Paiement Wave
 * 4. Ses clients sont rediriges vers le lien Wave pour payer
 * 5. L'argent arrive directement sur son compte Wave
 * 
 * Wave Business (gratuit) genere des liens comme:
 * https://pay.wave.com/m/XXXXX/c/ci/
 * 
 * Sur mobile, ces liens ouvrent automatiquement l'app Wave
 */

class WaveConnect {
    constructor() {
        this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';
        
        // In-memory store for user Wave links
        // key: userId, value: { paymentLink, phone, verified, createdAt }
        this.userLinks = new Map();
    }

    // ===================================================================
    //  GERER LE LIEN DE PAIEMENT D'UN UTILISATEUR
    // ===================================================================

    /**
     * Enregistrer le lien Wave d'un utilisateur
     * Accepte differents formats:
     * - https://pay.wave.com/m/XXXXX/c/ci/
     * - https://pay.wave.com/m/XXXXX
     * - Lien court: pay.wave.com/m/XXXXX
     */
    setPaymentLink(userId, link) {
        if (!link || !link.trim()) {
            return { success: false, error: 'Lien Wave requis' };
        }

        // Normaliser le lien
        let cleanLink = link.trim();
        
        // Ajouter https:// si manquant
        if (!cleanLink.startsWith('http')) {
            cleanLink = 'https://' + cleanLink;
        }

        // Valider que c'est bien un lien Wave
        if (!cleanLink.includes('pay.wave.com') && !cleanLink.includes('wave.com')) {
            return { 
                success: false, 
                error: 'Lien invalide. Doit etre un lien Wave (pay.wave.com/...)' 
            };
        }

        const connection = {
            userId,
            paymentLink: cleanLink,
            verified: false,
            createdAt: new Date().toISOString(),
            lastUsed: null
        };

        this.userLinks.set(userId, connection);

        return {
            success: true,
            message: 'Lien Wave enregistre',
            connection: {
                paymentLink: cleanLink,
                createdAt: connection.createdAt
            }
        };
    }

    /**
     * Obtenir le lien Wave d'un utilisateur
     */
    getPaymentLink(userId) {
        return this.userLinks.get(userId) || null;
    }

    /**
     * Verifier si un utilisateur a un lien Wave configure
     */
    isConfigured(userId) {
        const conn = this.userLinks.get(userId);
        return conn && conn.paymentLink;
    }

    /**
     * Supprimer le lien Wave d'un utilisateur
     */
    removePaymentLink(userId) {
        this.userLinks.delete(userId);
        return { success: true, message: 'Lien Wave supprime' };
    }

    /**
     * Marquer le lien comme utilise (pour les stats)
     */
    markUsed(userId) {
        const conn = this.userLinks.get(userId);
        if (conn) {
            conn.lastUsed = new Date().toISOString();
            conn.useCount = (conn.useCount || 0) + 1;
        }
    }

    // ===================================================================
    //  CREER UN PAIEMENT (redirect vers le lien Wave)
    // ===================================================================

    /**
     * Creer un paiement pour un utilisateur
     * Retourne l'URL de redirection vers le lien Wave
     */
    createPayment(userId, options) {
        const { amount, description = 'Paiement', externalId } = options;
        
        // Chercher le lien Wave de l'utilisateur
        const conn = this.userLinks.get(userId);
        
        let paymentUrl;
        
        if (conn && conn.paymentLink) {
            // Utiliser le lien personnel de l'utilisateur
            paymentUrl = conn.paymentLink;
            this.markUsed(userId);
        } else {
            // Fallback: lien Wave de DIGITALSTRATEGES
            paymentUrl = process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/';
        }

        const ref = externalId || `flay_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

        return {
            success: true,
            ref,
            paymentUrl,
            amount,
            description,
            gateway: 'wave-link',
            message: conn ? 'Redirection vers votre lien Wave' : 'Redirection vers Wave DIGITALSTRATEGES',
            createdAt: new Date().toISOString()
        };
    }

    // ===================================================================
    //  BOUTON DE PAIEMENT HTML
    // ===================================================================

    /**
     * Generer un bouton de paiement Wave pour un profil public
     * Supporte les deep links (ouvre l'app Wave sur mobile)
     */
    generatePaymentButton(userId, amount, description, options = {}) {
        const {
            color = '#1dc4e9',
            textColor = '#ffffff',
            size = 'large',
            fullWidth = true,
            showMethods = true
        } = options;

        const conn = this.userLinks.get(userId);
        const waveLink = conn?.paymentLink || process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/';

        return `
        <div class="flay-wave-btn" style="margin: 16px 0;">
            <a href="${waveLink}" 
               target="_blank" rel="noopener"
               onclick="flayTrackPayment('${userId}', ${amount})"
               style="display: inline-flex; align-items: center; gap: 10px; 
                      padding: ${size === 'large' ? '16px 32px' : '12px 24px'}; 
                      background: linear-gradient(135deg, ${color}, ${color}dd);
                      color: ${textColor}; border: none; border-radius: 12px; 
                      text-decoration: none; font-weight: 700; 
                      font-size: ${size === 'large' ? '16px' : '14px'};
                      ${fullWidth ? 'width: 100%; justify-content: center;' : ''}
                      transition: transform 0.2s, box-shadow 0.2s;
                      box-shadow: 0 4px 15px ${color}40;"
               onmouseover="this.style.transform='translateY(-2px)'"
               onmouseout="this.style.transform='translateY(0)'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                </svg>
                Payer ${Number(amount).toLocaleString()} FCFA via Wave
            </a>
            ${showMethods ? `
            <p style="text-align: center; font-size: 11px; color: #888; margin-top: 8px;">
                Wave · Orange Money · MTN · Moov · Carte bancaire
            </p>` : ''}
        </div>

        <script>
        function flayTrackPayment(userId, amount) {
            // Tracking optionnel
            fetch('/api/analytics/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'payment_click',
                    userId: userId,
                    amount: amount,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
        }
        </script>`;
    }

    // ===================================================================
    //  WIDGET DE PAIEMENT INTEGRE (pour pages e-commerce/reservation)
    // ===================================================================

    /**
     * Generer un widget de paiement Wave complet
     * Affiche le montant, le bouton, et les instructions
     */
    generatePaymentWidget(userId, options = {}) {
        const {
            amount = 0,
            description = 'Paiement',
            serviceName = '',
            showQR = false,
            autoOpen = true
        } = options;

        const conn = this.userLinks.get(userId);
        const waveLink = conn?.paymentLink || process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/';

        return `
        <div class="flay-wave-widget" style="max-width: 440px; margin: 0 auto; font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: linear-gradient(135deg, #0d1117, #161b22); border: 1px solid #30363d; border-radius: 16px; padding: 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
                
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #1dc4e9, #0ea5e9); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                        </svg>
                    </div>
                    <h3 style="margin: 0; color: #f0f6fc; font-size: 20px; font-weight: 700;">Paiement Wave</h3>
                    ${serviceName ? `<p style="margin: 6px 0 0; color: #8b949e; font-size: 14px;">${serviceName}</p>` : ''}
                </div>

                <!-- Montant -->
                <div style="background: #0d1117; border: 1px solid #30363d; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
                    <div style="color: #8b949e; font-size: 13px; margin-bottom: 4px;">Montant a payer</div>
                    <div style="color: #f0f6fc; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                        ${Number(amount).toLocaleString()} <span style="font-size: 16px; color: #8b949e;">FCFA</span>
                    </div>
                    ${description ? `<div style="color: #8b949e; font-size: 13px; margin-top: 6px;">${description}</div>` : ''}
                </div>

                <!-- Bouton principal -->
                <a href="${waveLink}" 
                   target="_blank" rel="noopener"
                   id="flay-pay-main-btn"
                   style="display: flex; align-items: center; justify-content: center; gap: 10px;
                          padding: 18px 32px; background: linear-gradient(135deg, #1dc4e9, #0ea5e9);
                          color: #fff; border: none; border-radius: 12px; text-decoration: none;
                          font-weight: 700; font-size: 17px; cursor: pointer;
                          transition: all 0.2s; box-shadow: 0 4px 20px rgba(29,196,233,0.3);"
                   onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 24px rgba(29,196,233,0.4)'"
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 20px rgba(29,196,233,0.3)'">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                    </svg>
                    Payer maintenant
                </a>

                <!-- Instructions -->
                <div style="margin-top: 20px; padding: 16px; background: #0d1117; border-radius: 10px; border: 1px solid #30363d;">
                    <div style="color: #f0f6fc; font-size: 13px; font-weight: 600; margin-bottom: 10px;">Comment payer :</div>
                    <ol style="margin: 0; padding-left: 18px; color: #8b949e; font-size: 13px; line-height: 1.8;">
                        <li>Cliquez sur "Payer maintenant"</li>
                        <li>L'app Wave s'ouvre automatiquement</li>
                        <li>Confirmez le paiement dans Wave</li>
                        <li>Vous recevrez une confirmation</li>
                    </ol>
                </div>

                <!-- Methodes acceptees -->
                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 16px; flex-wrap: wrap;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #21262d; border-radius: 6px; color: #8b949e; font-size: 11px;">
                        <span style="color: #1dc4e9;">●</span> Wave
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #21262d; border-radius: 6px; color: #8b949e; font-size: 11px;">
                        <span style="color: #ff6600;">●</span> Orange Money
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #21262d; border-radius: 6px; color: #8b949e; font-size: 11px;">
                        <span style="color: #ffc107;">●</span> MTN
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: #21262d; border-radius: 6px; color: #8b949e; font-size: 11px;">
                        <span style="color: #28a745;">●</span> Moov
                    </span>
                </div>

                <p style="text-align: center; font-size: 11px; color: #484f58; margin-top: 16px;">
                    Paiement securise par Wave · DIGITALSTRATEGES
                </p>
            </div>
        </div>

        <script>
        // Auto-open Wave app on mobile
        ${autoOpen ? `
        (function() {
            const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                // Small delay to let the page load first
                setTimeout(function() {
                    const btn = document.getElementById('flay-pay-main-btn');
                    if (btn) btn.click();
                }, 1500);
            }
        })();
        ` : ''}
        </script>`;
    }

    // ===================================================================
    //  STATISTIQUES
    // ===================================================================

    getStats(userId) {
        const conn = this.userLinks.get(userId);
        if (!conn) {
            return { configured: false };
        }
        return {
            configured: true,
            paymentLink: conn.paymentLink,
            useCount: conn.useCount || 0,
            lastUsed: conn.lastUsed,
            createdAt: conn.createdAt
        };
    }

    /**
     * Obtenir le statut complet
     */
    getStatus(userId) {
        const conn = this.userLinks.get(userId);
        if (!conn) {
            return { 
                configured: false, 
                message: 'Aucun lien Wave configure. Ajoutez votre lien dans Settings.',
                hint: 'Ouvrez Wave Business → Recevoir → Creer un lien de paiement'
            };
        }
        return {
            configured: true,
            paymentLink: conn.paymentLink,
            verified: conn.verified,
            createdAt: conn.createdAt,
            lastUsed: conn.lastUsed,
            useCount: conn.useCount || 0
        };
    }
}

module.exports = new WaveConnect();
