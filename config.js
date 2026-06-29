module.exports = {
    VERSION: '2.14.3',
    PORT: process.env.PORT || 4000,
    JWT_SECRET: process.env.JWT_SECRET || 'flay_ultimate_secret_2024_digitalstrateges_ci',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'flay_refresh_ultimate_2024',
    BASE_URL: process.env.BASE_URL || 'http://localhost:4000',
    SITE_URL: process.env.SITE_URL || 'http://localhost:4000',

    // === PAYMENT GATEWAYS ===
    WAVE_MERCHANT_NAME: process.env.WAVE_MERCHANT_NAME || 'DIGITALSTRATEGE BUSINESS',
    WAVE_MERCHANT_PHONE: process.env.WAVE_MERCHANT_PHONE || '+2250759731990',
    WAVE_MERCHANT_EMAIL: process.env.WAVE_MERCHANT_EMAIL || 'contact@digitalstrateges.ci',
    WAVE_PAYMENT_URL: process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/',
    
    // Wave Checkout API (optionnel - si tu as un API key Wave Business)
    WAVE_API_BASE: 'https://api.wave.com/v1',
    WAVE_API_KEY: process.env.WAVE_API_KEY || '',
    WAVE_WEBHOOK_SECRET: process.env.WAVE_WEBHOOK_SECRET || '',
    WAVE_SIGNING_SECRET: process.env.WAVE_SIGNING_SECRET || '',

    // CinetPay (alternative: supporte Wave + OM + Moov + MTN + CB)
    CINETPAY_API_KEY: process.env.CINETPAY_API_KEY || '',
    CINETPAY_SITE_ID: process.env.CINETPAY_SITE_ID || '',
    CINETPAY_API_PASSWORD: process.env.CINETPAY_API_PASSWORD || '',
    CINETPAY_SECRET_KEY: process.env.CINETPAY_SECRET_KEY || '',

    // === WHATSAPP ===
    WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '2250759731990',
    WHATSAPP_LINK: process.env.WHATSAPP_LINK || 'https://wa.me/2250759731990',

    // === AI GEMINI ===
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyCA4FdSwRvg5J0Vdb-FUo34qzrpRCRfzPk',
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',

    // === EMAIL (SMTP) ===
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM: process.env.SMTP_FROM || 'noreply@flay.app',
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Flay',

    // === SMS ===
    SMS_PROVIDER: process.env.SMS_PROVIDER || 'africastalking',
    SMS_API_KEY: process.env.SMS_API_KEY || '',
    SMS_USERNAME: process.env.SMS_USERNAME || '',
    SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'FLAY',

    // Twilio (alternative)
    TWILIO_SID: process.env.TWILIO_SID || '',
    TWILIO_TOKEN: process.env.TWILIO_TOKEN || '',
    TWILIO_FROM: process.env.TWILIO_FROM || '',

    // === PUSH NOTIFICATIONS (VAPID) ===
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',

    // === ANALYTICS ===
    GA4_MEASUREMENT_ID: process.env.GA4_MEASUREMENT_ID || '',
    META_PIXEL_ID: process.env.META_PIXEL_ID || '',
    HOTJAR_ID: process.env.HOTJAR_ID || '',

    // === PLANS ===
    PLANS: {
        free: {
            name: 'Gratuit',
            slug: 'free',
            price: 0,
            priceLabel: '0 FCFA/mois',
            priceAnnual: 0,
            interval: 'monthly',
            features: [
                'Carte de visite digitale',
                'Lien unique flay.app/username',
                '5 services maximum',
                'Statistiques de base',
                '15 themes (Dark, Light, modes jour/nuit)',
                'Partage WhatsApp + QR Code',
                'Reservation jusqu\'a 10/mois',
                'Contact jusqu\'a 100',
                'Stock de base (20 produits)'
            ],
            limits: {
                services: 5,
                themes: 15,
                reservations: 10,
                contacts: 100,
                invoices: 20,
                products: 20,
                storage: '100 MB',
                customDomain: false,
                ecommerce: true,
                aiAgent: false,
                whiteLabel: false,
                flayStore: false
            }
        },
        pro: {
            name: 'Pro',
            slug: 'pro',
            price: 5000,
            priceLabel: '5 000 FCFA/mois',
            priceAnnual: 50000,
            priceAnnualLabel: '50 000 FCFA/an',
            interval: 'monthly',
            features: [
                'Tout du plan Gratuit',
                'Reservations en ligne illimitees',
                'Services illimites',
                'Analytics detailles + graphiques',
                '30 themes (tous les modes + drapeaux)',
                'QR Code personnalise',
                'Badge Verifie Pro',
                'Chat en temps reel',
                'Notifications SMS',
                'Support email 48h',
                'Reception de paiements Wave',
                'Facturation simple',
                'Export contacts CSV',
                'Site vitrine professionnel',
                'Galerie photos (20 images)',
                'Formulaire de contact',
                'Carte Google Maps',
                'Liens reseaux sociaux',
                'Boutique en ligne (50 articles)',
                'Acces Flay Store (achats d\'espace)'
            ],
            limits: {
                services: -1,
                themes: 30,
                reservations: -1,
                contacts: 500,
                invoices: 100,
                products: 50,
                storage: '500 MB',
                customDomain: false,
                ecommerce: true,
                aiAgent: false,
                whiteLabel: false,
                gallery: 20,
                flayStore: true
            }
        },
        premium: {
            name: 'Premium',
            slug: 'premium',
            price: 15000,
            priceLabel: '15 000 FCFA/mois',
            priceAnnual: 150000,
            priceAnnualLabel: '150 000 FCFA/an',
            interval: 'monthly',
            features: [
                'Tout du plan Pro',
                'Agent IA integre',
                'Generation auto de contenu',
                'Domaine personnalise',
                'Multi-langues (FR/EN/AR/PT)',
                'Export PDF',
                'Analytics avances + insights IA',
                '40+ themes (tous + saisonniers)',
                'CSS personnalise',
                'Badge Premium Or',
                'API publique',
                'Webhooks',
                'Support prioritaire 24/7',
                'CRM complet illimite',
                'Facturation avancee + PDF',
                'Boutique en ligne (300 articles)',
                'Panier d\'achat',
                'Paiement Wave/OM/Moov integre',
                'Commandes en ligne',
                'Gestion des stocks avancee',
                'Galerie photos (100 images)',
                'CV/Portfolio en ligne',
                'Animations et effets',
                'Integration Google Analytics',
                'Meta Pixel',
                'Acces Flay Store complet',
                'Programme de fidelite',
                'Coupons avances'
            ],
            limits: {
                services: -1,
                themes: -1,
                reservations: -1,
                contacts: -1,
                invoices: -1,
                products: 300,
                storage: '5 GB',
                customDomain: true,
                ecommerce: true,
                aiAgent: true,
                whiteLabel: false,
                gallery: 100,
                flayStore: true
            }
        },
        doree: {
            name: 'Doree',
            slug: 'doree',
            price: 30000,
            priceLabel: '30 000 FCFA/mois',
            priceAnnual: 300000,
            priceAnnualLabel: '300 000 FCFA/an',
            interval: 'monthly',
            badge: 'Doree',
            badgeColor: '#eab308',
            features: [
                'Tout du plan Premium',
                'Boutique en ligne (1000 articles)',
                'Achats d\'espace supplementaire via Flay Store',
                'Multi-utilisateurs (5 comptes)',
                'Team management',
                'White label (votre marque)',
                'Domaine personnalise',
                'SSL inclus',
                'SEO avance + Meta tags auto',
                'Emails de confirmation auto',
                'Notifications push',
                'Reporting avance + export',
                'Export donnees complet (CSV/PDF/JSON)',
                'API avancee + Webhooks custom',
                'Support telephone 24/7',
                'Formation incluse',
                'Galerie photos ILLIMITEE',
                'Video embed',
                'Booking en ligne',
                'Abonnements clients',
                'Programme de fidelite complet',
                'Coupons et reductions illimites',
                'Statistiques ventes detaillees',
                'Multi-devises (XOF/EUR/USD/GHS/NGN)',
                'Facturation automatique',
                'Suivi livraison',
                'Avis clients + notation',
                'Wishlist + comparateur',
                'Dropshipping ready',
                'Marketplace multi-vendeurs',
                'Flay Store: achats d\'espace a la carte'
            ],
            limits: {
                services: -1,
                themes: -1,
                reservations: -1,
                contacts: -1,
                invoices: -1,
                products: 1000,
                storage: '20 GB',
                customDomain: true,
                ecommerce: true,
                aiAgent: true,
                whiteLabel: true,
                gallery: -1,
                users: 5,
                flayStore: true
            }
        }
    },

    // === E-COMMERCE ===
    ECOMMERCE: {
        currencies: ['XOF', 'EUR', 'USD', 'GHS', 'NGN'],
        defaultCurrency: 'XOF',
        taxRate: 0.18, // TVA 18% Cote d'Ivoire
        freeShippingThreshold: 50000, // Livraison gratuite > 50 000 FCFA
        maxProductsPerOrder: 50,
        orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        paymentMethods: ['wave', 'cinetpay', 'momo', 'om', 'cb', 'cod', 'bank_transfer']
    },

    // === AI AGENT ===
    AI: {
        enabled: true,
        features: {
            autoBio: true,
            autoServices: true,
            smartSchedule: true,
            autoResponse: true,
            analyticsInsights: true,
            contentGeneration: true,
            productDescriptions: true,
            seoOptimization: true
        }
    },

    // === FEATURES FLAGS ===
    FEATURES: {
        aiAgent: true,
        chat: true,
        analytics: true,
        webhooks: true,
        apiKeys: true,
        abTesting: true,
        pdfExport: true,
        customCss: true,
        multiLang: true,
        darkMode: true,
        wavePayments: true,
        reservations: true,
        crm: true,
        invoicing: true,
        ecommerce: true,
        teamManagement: true,
        customDomains: true,
        whiteLabel: true,
        smsNotifications: true,
        emailNotifications: true,
        pushNotifications: true,
        fileUpload: true,
        gallery: true,
        geolocation: true,
        socialAuth: true,
        twoFactorAuth: true,
        apiAccess: true,
        multiCurrency: true,
        coupons: true,
        loyalty: true,
        reviews: true,
        wishlist: true
    },

    // === RATE LIMITS ===
    RATE_LIMITS: {
        auth: { window: 15 * 60 * 1000, max: 10 },
        api: { window: 60 * 1000, max: 100 },
        reservation: { window: 60 * 1000, max: 20 },
        chat: { window: 60 * 1000, max: 30 },
        ai: { window: 60 * 1000, max: 5 },
        upload: { window: 60 * 1000, max: 10 },
        ecommerce: { window: 60 * 1000, max: 50 }
    }
};
