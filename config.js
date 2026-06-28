module.exports = {
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
                '4 themes (Dark, Light, Midnight, Ocean)',
                'Partage WhatsApp + QR Code',
                'Reservation jusqu\'a 10/mois',
                'Contact jusqu\'a 100',
                'Stock de base (20 produits)'
            ],
            limits: {
                services: 5,
                themes: 4,
                reservations: 10,
                contacts: 100,
                invoices: 20,
                products: 20,
                storage: '100 MB',
                customDomain: false,
                ecommerce: true,
                aiAgent: false,
                whiteLabel: false
            }
        },
        pro: {
            name: 'Pro',
            slug: 'pro',
            price: 5000,
            priceLabel: '5 000 FCFA/mois',
            priceAnnual: 50000, // 2 mois offerts
            priceAnnualLabel: '50 000 FCFA/an',
            interval: 'monthly',
            features: [
                'Tout du plan Gratuit',
                'Reservations en ligne illimitees',
                'Services illimites',
                'Analytics detailles + graphiques',
                '7 themes premium',
                'QR Code personnalise',
                'Badge Verifie Pro',
                'Chat en temps reel',
                'Notifications SMS',
                'Support email 48h',
                'Reception de paiements Wave',
                'Facturation simple',
                'Export contacts CSV',
                'Site vitrine professionnel',
                'Galerie photos (10 images)',
                'Formulaire de contact',
                'Carte Google Maps',
                'Liens reseaux sociaux'
            ],
            limits: {
                services: -1,
                themes: 7,
                reservations: -1,
                contacts: 500,
                invoices: 100,
                products: 10,
                storage: '500 MB',
                customDomain: false,
                ecommerce: false,
                aiAgent: false,
                whiteLabel: false,
                gallery: 10
            }
        },
        premium: {
            name: 'Premium',
            slug: 'premium',
            price: 15000,
            priceLabel: '15 000 FCFA/mois',
            priceAnnual: 150000, // 2 mois offerts
            priceAnnualLabel: '150 000 FCFA/an',
            interval: 'monthly',
            features: [
                'Tout du plan Pro',
                'Agent IA integre',
                'Generation auto de contenu',
                'Domaine personnalise',
                'Multi-langues (FR/EN)',
                'Export PDF',
                'Analytics avances + insights IA',
                'Templates premium (10+)',
                'CSS personnalise',
                'Badge Premium Or',
                'API publique',
                'Webhooks',
                'Support prioritaire 24/7',
                'CRM complet illimite',
                'Facturation avancee + PDF',
                'Boutique en ligne (30 articles)',
                'Panier d\'achat',
                'Paiement Wave intégré',
                'Commandes en ligne',
                'Gestion des stocks',
                'Galerie photos (50 images)',
                'CV/Portfolio en ligne',
                'Animations et effets',
                'Integration Google Analytics',
                'Meta Pixel'
            ],
            limits: {
                services: -1,
                themes: -1,
                reservations: -1,
                contacts: -1,
                invoices: -1,
                products: 30,
                storage: '2 GB',
                customDomain: true,
                ecommerce: true,
                aiAgent: true,
                whiteLabel: false,
                gallery: 50
            }
        },
        doree: {
            name: 'Doree',
            slug: 'doree',
            price: 30000,
            priceLabel: '30 000 FCFA/mois',
            priceAnnual: 300000, // 2 mois offerts
            priceAnnualLabel: '300 000 FCFA/an',
            interval: 'monthly',
            badge: 'Doree',
            badgeColor: '#eab308',
            features: [
                'Tout du plan Premium',
                'Boutique en ligne ILLIMITEE',
                'Articles ILLIMITES',
                'E-commerce complet',
                'Multi-utilisateurs (3 comptes)',
                'Team management',
                'White label (votre marque)',
                'Domaine personnalise',
                'SSL inclus',
                'SEO avance',
                'Emails de confirmation auto',
                'Notifications push',
                'Reporting avance',
                'Export donnees complet',
                'API avancee',
                'Webhooks custom',
                'Support telephone 24/7',
                'Formation incluse',
                'Galerie photos ILLIMITEE',
                'Video embed',
                'Booking en ligne',
                'Abonnements clients',
                'Programme de fidelite',
                'Coupons et reductions',
                'Statistiques ventes',
                'Multi-devises',
                'Facturation automatique',
                'Suivi livraison',
                'Avis clients',
                'Wishlist',
                'Comparateur de produits'
            ],
            limits: {
                services: -1,
                themes: -1,
                reservations: -1,
                contacts: -1,
                invoices: -1,
                products: -1, // Illimite
                storage: '10 GB',
                customDomain: true,
                ecommerce: true,
                aiAgent: true,
                whiteLabel: true,
                gallery: -1, // Illimite
                users: 3
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
