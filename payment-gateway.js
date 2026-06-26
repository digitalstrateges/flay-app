/**
 * Flay v14.0 - Payment Gateway Unifie
 * 
 * Supporte 3 modes:
 * 1. Wave Checkout API (cle API) — flow: creer session → redirect → webhook
 * 2. CinetPay API (cle API) — supporte Wave + OM + Moov + MTN + CB
 * 3. Link fallback — liens de paiement statiques (sans API)
 * 
 * Le gatewya se comporte differemment selon la config:
 * - Si WAVE_API_KEY → mode Wave API
 * - Si CINETPAY_API_KEY → mode CinetPay
 * - Sinon → mode lien (fallback)
 */

const crypto = require('crypto');

class PaymentGateway {
    constructor() {
        this.wave = {
            apiBase: 'https://api.wave.com/v1',
            apiKey: process.env.WAVE_API_KEY || '',
            webhookSecret: process.env.WAVE_WEBHOOK_SECRET || '',
            signingSecret: process.env.WAVE_SIGNING_SECRET || '',
            paymentLink: process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/'
        };

        this.cinetpay = {
            apiBase: 'https://api.cinetpay.co',
            sandboxBase: 'https://api.cinetpay.net',
            apiKey: process.env.CINETPAY_API_KEY || '',
            siteId: process.env.CINETPAY_SITE_ID || '',
            apiPassword: process.env.CINETPAY_API_PASSWORD || '',
            secretKey: process.env.CINETPAY_SECRET_KEY || ''
        };

        this.baseUrl = process.env.BASE_URL || 'http://localhost:4000';

        // Detect active gateway
        this.activeGateway = this._detectGateway();

        // In-memory payment store (in production: use DB)
        this.payments = new Map();
        this.webhookEvents = new Set();
    }

    _detectGateway() {
        if (this.wave.apiKey) return 'wave';
        if (this.cinetpay.apiKey && this.cinetpay.siteId) return 'cinetpay';
        return 'link';
    }

    // ===================================================================
    //  GATEWAY INFO
    // ===================================================================

    getStatus() {
        return {
            gateway: this.activeGateway,
            wave: {
                configured: !!this.wave.apiKey,
                hasWebhook: !!this.wave.webhookSecret,
                hasSigning: !!this.wave.signingSecret,
                paymentLink: this.wave.paymentLink
            },
            cinetpay: {
                configured: !!(this.cinetpay.apiKey && this.cinetpay.siteId),
                hasPassword: !!this.cinetpay.apiPassword,
                isSandbox: this.cinetpay.apiKey?.startsWith('sk_test_')
            }
        };
    }

    // ===================================================================
    //  WAVE CHECKOUT API
    // ===================================================================

    async _waveCreateSession(options) {
        const {
            amount,
            currency = 'XOF',
            description = 'Paiement Flay',
            customerName = '',
            customerPhone = '',
            externalId = null,
            successUrl,
            cancelUrl
        } = options;

        const ref = externalId || `flay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const body = JSON.stringify({
            amount: Math.round(amount).toString(),
            currency,
            description,
            customer: {
                name: customerName || undefined,
                phone: customerPhone || undefined
            },
            external_id: ref,
            success_url: successUrl || `${this.baseUrl}/payment-success?ref=${ref}`,
            cancel_url: cancelUrl || `${this.baseUrl}/payment-cancel?ref=${ref}`
        });

        try {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.wave.apiKey}`
            };

            // Add request signing if configured
            if (this.wave.signingSecret) {
                const timestamp = Math.floor(Date.now() / 1000).toString();
                const signature = crypto
                    .createHmac('sha256', this.wave.signingSecret)
                    .update(timestamp + body)
                    .digest('hex');
                headers['Wave-Signature'] = `t=${timestamp},v1=${signature}`;
            }

            const response = await fetch(`${this.wave.apiBase}/checkout/sessions`, {
                method: 'POST',
                headers,
                body
            });

            const data = await response.json();

            if (response.ok && data.id) {
                const payment = {
                    id: data.id,
                    ref,
                    gateway: 'wave',
                    amount: Math.round(amount),
                    currency,
                    description,
                    status: data.status || 'INITIATED',
                    paymentUrl: data.wave_launch_url,
                    customerName,
                    customerPhone,
                    externalId: ref,
                    createdAt: new Date().toISOString(),
                    metadata: options.metadata || {}
                };

                this.payments.set(ref, payment);
                return { success: true, payment };
            }

            return {
                success: false,
                error: data.message || data.error || 'Erreur Wave API',
                code: data.code
            };
        } catch (error) {
            console.error('[Wave API Error]', error.message);
            return { success: false, error: 'Erreur connexion Wave API' };
        }
    }

    async _waveCheckStatus(sessionId) {
        try {
            const headers = {
                'Authorization': `Bearer ${this.wave.apiKey}`
            };

            const response = await fetch(`${this.wave.apiBase}/checkout/sessions/${sessionId}`, {
                headers
            });

            const data = await response.json();
            return {
                sessionId: data.id,
                status: data.status,
                paymentStatus: data.payment_status,
                amount: data.amount,
                currency: data.currency,
                customerName: data.customer?.name,
                customerPhone: data.customer?.phone,
                completedAt: data.completed_at,
                failedAt: data.failed_at,
                expiredAt: data.expired_at
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    _waveVerifyWebhook(rawBody, signatureHeader) {
        if (!this.wave.webhookSecret) return true;

        try {
            const [timestampPart, signaturePart] = signatureHeader.split(',');
            const timestamp = timestampPart.replace('t=', '');
            const receivedSig = signaturePart.replace('v1=', '');

            const expected = crypto
                .createHmac('sha256', this.wave.webhookSecret)
                .update(timestamp + rawBody)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(receivedSig, 'hex'),
                Buffer.from(expected, 'hex')
            );
        } catch {
            return false;
        }
    }

    _waveHandleWebhook(event) {
        const { type, data } = event;

        // Idempotency: skip duplicate events
        if (this.webhookEvents.has(event.id)) {
            return { status: 'duplicate', event: type };
        }
        this.webhookEvents.add(event.id);

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
                    error: 'Paiement echoue',
                    failedAt: new Date().toISOString()
                };

            case 'checkout.session.expired':
                return {
                    status: 'expired',
                    sessionId: data.id,
                    expiredAt: new Date().toISOString()
                };

            default:
                return { status: 'unhandled', type };
        }
    }

    // ===================================================================
    //  CINETPAY API
    // ===================================================================

    async _cinetpayGetToken() {
        try {
            const response = await fetch(
                `${this.cinetpay.apiBase}/v2/auth`,  // CINETPAY v2 endpoint
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: this.cinetpay.apiKey,
                        api_password: this.cinetpay.apiPassword
                    })
                }
            );

            const data = await response.json();
            if (data.token) {
                return { success: true, token: data.token };
            }
            return { success: false, error: data.message || 'Token error' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async _cinetpayInitPayment(options) {
        const {
            amount,
            currency = 'XOF',
            description = 'Paiement Flay',
            customerName = '',
            customerPhone = '',
            customerEmail = '',
            externalId = null,
            successUrl,
            failedUrl,
            notifyUrl,
            channels = 'MOBILE_MONEY,CREDIT_CARD,WALLET'
        } = options;

        const ref = externalId || `flay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Get auth token first
        const auth = await this._cinetpayGetToken();
        if (!auth.success) {
            return { success: false, error: 'Erreur authentification CinetPay: ' + auth.error };
        }

        const [firstName, ...lastParts] = (customerName || 'Client Flay').split(' ');
        const lastName = lastParts.join(' ') || '';

        try {
            const response = await fetch(
                `${this.cinetpay.apiBase}/payment/v1/request`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`
                    },
                    body: JSON.stringify({
                        amount: Math.round(amount),
                        currency,
                        description,
                        transaction_id: ref,
                        customer_first_name: firstName,
                        customer_last_name: lastName,
                        customer_phone_number: customerPhone || undefined,
                        customer_email: customerEmail || undefined,
                        customer_country: 'CI',
                        success_url: successUrl || `${this.baseUrl}/payment-success?ref=${ref}`,
                        failed_url: failedUrl || `${this.baseUrl}/payment-cancel?ref=${ref}`,
                        notify_url: notifyUrl || `${this.baseUrl}/api/webhooks/cinetpay`,
                        channels
                    })
                }
            );

            const data = await response.json();

            if (data.code === 201 || data.code === 100) {
                const payment = {
                    id: data.data?.payment_token || ref,
                    ref,
                    gateway: 'cinetpay',
                    amount: Math.round(amount),
                    currency,
                    description,
                    status: 'pending',
                    paymentUrl: data.data?.payment_url,
                    paymentToken: data.data?.payment_token,
                    paymentMethods: data.data?.payment_methods,
                    customerName,
                    customerPhone,
                    customerEmail,
                    externalId: ref,
                    createdAt: new Date().toISOString(),
                    metadata: options.metadata || {}
                };

                this.payments.set(ref, payment);
                return { success: true, payment };
            }

            return {
                success: false,
                error: data.message || data.description || 'Erreur CinetPay',
                code: data.code
            };
        } catch (error) {
            console.error('[CinetPay API Error]', error.message);
            return { success: false, error: 'Erreur connexion CinetPay' };
        }
    }

    async _cinetpayCheckStatus(transactionId) {
        try {
            const auth = await this._cinetpayGetToken();
            if (!auth.success) return { error: 'Auth error' };

            const response = await fetch(
                `${this.cinetpay.apiBase}/payment/v1/status`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.token}`
                    },
                    body: JSON.stringify({
                        transaction_id: transactionId
                    })
                }
            );

            const data = await response.json();
            return {
                transactionId: data.data?.transaction_id,
                status: data.data?.status, // ACCEPTED, REFUSED, PENDING
                amount: data.data?.amount,
                currency: data.data?.currency,
                paymentMethod: data.data?.payment_method,
                operatorId: data.data?.operator_id,
                paymentDate: data.data?.payment_date
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    _cinetpayVerifyWebhook(rawBody, signature) {
        if (!this.cinetpay.secretKey) return true;

        try {
            const expected = crypto
                .createHmac('sha256', this.cinetpay.secretKey)
                .update(rawBody)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expected)
            );
        } catch {
            return false;
        }
    }

    _cinetpayHandleWebhook(event) {
        const { status, transaction_id, amount, payment_method } = event;

        if (this.webhookEvents.has(transaction_id)) {
            return { status: 'duplicate' };
        }
        this.webhookEvents.add(transaction_id);

        switch (status) {
            case 'ACCEPTED':
                return {
                    status: 'confirmed',
                    transactionId: transaction_id,
                    amount,
                    paymentMethod: payment_method,
                    confirmedAt: new Date().toISOString()
                };

            case 'REFUSED':
                return {
                    status: 'failed',
                    transactionId: transaction_id,
                    error: 'Paiement refuse',
                    failedAt: new Date().toISOString()
                };

            case 'PENDING':
                return {
                    status: 'pending',
                    transactionId: transaction_id,
                    message: 'Paiement en cours de traitement'
                };

            default:
                return { status: 'unknown', raw: status };
        }
    }

    // ===================================================================
    //  PAYMENT LINK FALLBACK (sans API)
    // ===================================================================

    _createPaymentLink(options) {
        const {
            amount,
            description = 'Paiement Flay',
            customerName = '',
            externalId = null
        } = options;

        const ref = externalId || `flay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const paymentUrl = this.wave.paymentLink;

        const payment = {
            id: ref,
            ref,
            gateway: 'link',
            amount: Math.round(amount),
            currency: 'XOF',
            description,
            status: 'pending',
            paymentUrl,
            customerName,
            externalId: ref,
            createdAt: new Date().toISOString()
        };

        this.payments.set(ref, payment);
        return { success: true, payment, isFallback: true };
    }

    // ===================================================================
    //  UNIFIED API
    // ===================================================================

    /**
     * Creer une session de paiement (unifie)
     * @param {Object} options - { amount, currency, description, customerName, customerPhone, customerEmail, externalId, type, metadata }
     * @returns {Object} - { success, payment, isFallback }
     */
    async createPayment(options) {
        const gateway = options.gateway || this.activeGateway;

        console.log(`[PaymentGateway] Creating payment via ${gateway}`);

        switch (gateway) {
            case 'wave':
                return this._waveCreateSession(options);

            case 'cinetpay':
                return this._cinetpayInitPayment(options);

            case 'link':
            default:
                return this._createPaymentLink(options);
        }
    }

    /**
     * Verifier le statut d'un paiement
     */
    async checkStatus(paymentId) {
        // Check in local store first
        const payment = this.payments.get(paymentId);
        if (payment && payment.gateway === 'wave') {
            return this._waveCheckStatus(paymentId);
        }
        if (payment && payment.gateway === 'cinetpay') {
            return this._cinetpayCheckStatus(paymentId);
        }
        return { status: 'unknown', paymentId };
    }

    /**
     * Verifier un webhook (unifie)
     */
    verifyWebhook(rawBody, signature, gateway) {
        if (gateway === 'cinetpay') {
            return this._cinetpayVerifyWebhook(rawBody, signature);
        }
        if (gateway === 'wave') {
            return this._waveVerifyWebhook(rawBody, signature);
        }
        return true;
    }

    /**
     * Traiter un webhook (unifie)
     */
    handleWebhook(event, gateway) {
        if (gateway === 'cinetpay') {
            return this._cinetpayHandleWebhook(event);
        }
        if (gateway === 'wave') {
            return this._waveHandleWebhook(event);
        }
        return { status: 'unknown', gateway };
    }

    /**
     * Obtenir le paiement par reference
     */
    getPayment(ref) {
        return this.payments.get(ref) || null;
    }

    /**
     * Generer bouton de paiement HTML (unifie)
     */
    generatePaymentButton(options) {
        const {
            amount,
            description = 'Paiement',
            color = '#6366f1',
            textColor = '#ffffff',
            size = 'large',
            fullWidth = true,
            type = 'one_time', // 'one_time' | 'reservation' | 'invoice' | 'subscription'
            metadata = {}
        } = options;

        const gateway = this.activeGateway;
        const method = gateway === 'cinetpay' ? 'cinetpay' : 'wave';

        return `
        <div class="flay-payment-btn-wrap" style="margin: 16px 0;">
            <form action="/api/payments/create" method="POST" 
                  onsubmit="return flayPay(this, '${method}')"
                  style="${fullWidth ? 'width: 100%;' : 'display: inline-block;'}">
                <input type="hidden" name="amount" value="${amount}">
                <input type="hidden" name="description" value="${description}">
                <input type="hidden" name="type" value="${type}">
                <input type="hidden" name="metadata" value='${JSON.stringify(metadata)}'>
                
                <button type="submit" class="flay-pay-btn" style="
                    display: inline-flex; align-items: center; gap: 10px; 
                    padding: ${size === 'large' ? '16px 32px' : '12px 24px'}; 
                    background: ${method === 'cinetpay' ? 'linear-gradient(135deg, #e63946, #f4a261)' : `linear-gradient(135deg, ${color}, ${color}dd)`}; 
                    color: ${textColor}; border: none; border-radius: 12px; 
                    font-weight: 700; font-size: ${size === 'large' ? '16px' : '14px'};
                    width: 100%; justify-content: center; cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    box-shadow: 0 4px 15px ${method === 'cinetpay' ? '#e6394640' : color + '40'};"
                    onmouseover="this.style.transform='translateY(-2px)'"
                    onmouseout="this.style.transform='translateY(0)'">
                    
                    ${method === 'cinetpay' ? `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Payer ${amount.toLocaleString()} FCFA
                        <span style="font-size:11px; opacity:0.8; display:block;">Wave · Orange · Moov · MTN · CB</span>
                    ` : `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/>
                        </svg>
                        Payer ${amount.toLocaleString()} FCFA via Wave
                    `}
                </button>
            </form>
            <p style="text-align: center; font-size: 11px; color: #888; margin-top: 8px;">
                Paiement securise · Flay by DIGITALSTRATEGES
            </p>
        </div>`;
    }

    /**
     * Generer le widget de selection de methode de paiement
     */
    generatePaymentWidget(options) {
        const { amount, description = 'Paiement', showAll = false } = options;
        const available = this._getAvailableMethods();

        return `
        <div class="flay-payment-widget" style="max-width: 440px; margin: 0 auto; font-family: system-ui;">
            <div style="background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 16px; padding: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                <h3 style="margin: 0 0 20px; color: #fff; font-size: 18px;">Choisir le mode de paiement</h3>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${available.map(method => `
                    <button onclick="flaySelectMethod('${method.id}')" 
                            id="flay-method-${method.id}"
                            style="display: flex; align-items: center; gap: 12px; padding: 16px; 
                                   background: #16213e; border: 2px solid #2a2a4a; border-radius: 12px;
                                   color: #fff; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.borderColor='${method.color}'"
                            onmouseout="this.style.borderColor='#2a2a4a'">
                        <div style="width: 44px; height: 44px; background: ${method.color}20; border-radius: 10px; 
                                    display: flex; align-items: center; justify-content: center;">
                            ${method.icon}
                        </div>
                        <div style="flex: 1; text-align: left;">
                            <div style="font-weight: 700; font-size: 15px;">${method.label}</div>
                            <div style="font-size: 12px; color: #888; margin-top: 2px;">${method.desc}</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#888" style="transition: fill 0.2s;">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                    `).join('')}
                </div>

                <div id="flay-payment-form" style="display: none; margin-top: 20px;">
                    <div style="background: #16213e; border-radius: 12px; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 16px;">
                            <div style="color: #888; font-size: 13px;">Montant a payer</div>
                            <div style="color: #fff; font-size: 28px; font-weight: 800;">${Number(amount).toLocaleString()} FCFA</div>
                            <div style="color: #888; font-size: 13px; margin-top: 4px;">${description}</div>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; color: #888; font-size: 12px; margin-bottom: 4px;">Nom complet</label>
                            <input type="text" id="flay-pay-name" placeholder="Votre nom"
                                   style="width: 100%; padding: 12px; background: #0f0f23; border: 1px solid #2a2a4a; 
                                          border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;">
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <label style="display: block; color: #888; font-size: 12px; margin-bottom: 4px;">Telephone</label>
                            <input type="tel" id="flay-pay-phone" placeholder="+225 07 00 00 00"
                                   style="width: 100%; padding: 12px; background: #0f0f23; border: 1px solid #2a2a4a; 
                                          border-radius: 8px; color: #fff; font-size: 14px; box-sizing: border-box;">
                        </div>
                        
                        <button onclick="flayProcessPayment()" id="flay-pay-submit"
                                style="width: 100%; padding: 16px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                       color: #fff; border: none; border-radius: 10px; font-weight: 700; font-size: 16px;
                                       cursor: pointer; transition: transform 0.2s;"
                                onmouseover="this.style.transform='scale(1.02)'"
                                onmouseout="this.style.transform='scale(1)'">
                            Payer maintenant
                        </button>
                    </div>
                </div>
            </div>
            
            <script>
            let flaySelectedMethod = null;
            const flayMethods = ${JSON.stringify(available.reduce((acc, m) => { acc[m.id] = m; return acc; }, {}))};
            
            function flaySelectMethod(id) {
                flaySelectedMethod = id;
                document.querySelectorAll('[id^="flay-method-"]').forEach(el => {
                    el.style.borderColor = '#2a2a4a';
                });
                document.getElementById('flay-method-' + id).style.borderColor = '#6366f1';
                document.getElementById('flay-payment-form').style.display = 'block';
            }
            
            async function flayProcessPayment() {
                const name = document.getElementById('flay-pay-name').value.trim();
                const phone = document.getElementById('flay-pay-phone').value.trim();
                
                if (!name || !phone) { alert('Remplissez tous les champs'); return; }
                if (!flaySelectedMethod) { alert('Choisissez un mode de paiement'); return; }
                
                const btn = document.getElementById('flay-pay-submit');
                btn.textContent = 'Redirection en cours...';
                btn.disabled = true;
                
                try {
                    const res = await fetch('/api/payments/create', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: ${amount},
                            description: ${JSON.stringify(description)},
                            customerName: name,
                            customerPhone: phone,
                            gateway: flaySelectedMethod
                        })
                    });
                    
                    const data = await res.json();
                    
                    if (data.success && data.paymentUrl) {
                        window.location.href = data.paymentUrl;
                    } else if (data.success && data.isFallback) {
                        alert('Redirection vers Wave...');
                        window.location.href = '${this.wave.paymentLink}';
                    } else {
                        alert('Erreur: ' + (data.error || 'Paiement impossible'));
                        btn.textContent = 'Payer maintenant';
                        btn.disabled = false;
                    }
                } catch (err) {
                    alert('Erreur reseau');
                    btn.textContent = 'Payer maintenant';
                    btn.disabled = false;
                }
            }
            </script>
        </div>`;
    }

    _getAvailableMethods() {
        const methods = [];

        if (this.wave.apiKey) {
            methods.push({
                id: 'wave',
                label: 'Wave',
                desc: 'Paiement via Wave Business API',
                color: '#1dc4e9',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#1dc4e9"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/></svg>'
            });
        }

        if (this.cinetpay.apiKey && this.cinetpay.siteId) {
            methods.push({
                id: 'cinetpay',
                label: 'Wave / Orange Money / Moov / MTN',
                desc: 'Toutes les mobile money + carte bancaire',
                color: '#e63946',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#e63946"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
            });
        }

        // Fallback: always show Wave link
        if (methods.length === 0) {
            methods.push({
                id: 'wave',
                label: 'Wave (Lien de paiement)',
                desc: 'Paiement via lien Wave direct',
                color: '#1dc4e9',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="#1dc4e9"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.98-3.12 3.19z"/></svg>'
            });
        }

        return methods;
    }

    // ===================================================================
    //  ABONNEMENTS FLOW
    // ===================================================================

    async createSubscriptionPayment(userId, plan, amount) {
        return this.createPayment({
            amount,
            description: `Abonnement Flay ${plan}`,
            externalId: `sub_${userId}_${plan}_${Date.now()}`,
            type: 'subscription',
            metadata: { userId, plan, type: 'subscription' }
        });
    }

    async createEcommercePayment(userId, orderId, amount, description) {
        return this.createPayment({
            amount,
            description: description || `Commande #${orderId}`,
            externalId: `ecom_${orderId}_${Date.now()}`,
            type: 'order',
            metadata: { userId, orderId, type: 'ecommerce' }
        });
    }

    async createReservationPayment(userId, reservationId, amount, clientName) {
        return this.createPayment({
            amount,
            description: `Reservation - ${clientName}`,
            externalId: `res_${reservationId}_${Date.now()}`,
            type: 'reservation',
            metadata: { userId, reservationId, clientName, type: 'reservation' }
        });
    }

    async createInvoicePayment(userId, invoiceId, amount, contactName) {
        return this.createPayment({
            amount,
            description: `Facture - ${contactName}`,
            externalId: `inv_${invoiceId}_${Date.now()}`,
            type: 'invoice',
            metadata: { userId, invoiceId, contactName, type: 'invoice' }
        });
    }
}

module.exports = new PaymentGateway();
