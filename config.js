module.exports = {
    PORT: process.env.PORT || 4000,
    JWT_SECRET: process.env.JWT_SECRET || 'flay_ultimate_secret_2024_digitalstrateges_ci',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'flay_refresh_ultimate_2024',
    BASE_URL: process.env.BASE_URL || 'http://localhost:4000',

    // === WAVE PAYMENT ===
    WAVE_PAYMENT_URL: 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/',
    WAVE_MERCHANT: 'DIGITALSTRATEGE BUSINESS',
    WAVE_PHONE: '+2250759731990',
    WAVE_EMAIL: 'contact@digitalstrateges.ci',
    WAVE_MERCHANT_ID: process.env.WAVE_MERCHANT_ID || '',
    WAVE_API_KEY: process.env.WAVE_API_KEY || '',
    WAVE_SECRET_KEY: process.env.WAVE_SECRET_KEY || '',
    WAVE_WEBHOOK_SECRET: process.env.WAVE_WEBHOOK_SECRET || '',

    // === WHATSAPP ===
    WHATSAPP_NUMBER: '2250759731990',
    WHATSAPP_LINK: 'https://wa.me/2250759731990',
    WHATSAPP_BUSINESS_NAME: 'DIGITALSTRATEGES',

    // === PLANS ===
    PLANS: {
        free: {
            name: 'Gratuit',
            slug: 'free',
            price: 0,
            priceLabel: '0 FCFA',
            interval: 'monthly',
            features: [
                'Carte de visite digitale',
                'Lien unique flay.app/username',
                '3 services maximum',
                'Statistiques de base',
                '2 themes (Dark/Light)',
                'Partage WhatsApp'
            ],
            limits: { services: 3, themes: 2, reservations: 0, contacts: 50, invoices: 10, storage: '50 MB' }
        },
        pro: {
            name: 'Pro',
            slug: 'pro',
            price: 5000,
            priceLabel: '5 000 FCFA',
            interval: 'monthly',
            features: [
                'Tout du plan Gratuit',
                'Reservations en ligne illimitees',
                'Services illimites',
                'Analytics detailles',
                '7 themes premium',
                'QR Code personnalise',
                'Badge Verifie Pro',
                'Chat en temps reel',
                'Notifications SMS',
                'Support email 48h',
                'Reception de paiements Wave',
                'Facturation simple',
                'Export contacts CSV'
            ],
            limits: { services: -1, themes: 7, reservations: -1, contacts: 500, invoices: 100, storage: '500 MB' }
        },
        premium: {
            name: 'Premium',
            slug: 'premium',
            price: 15000,
            priceLabel: '15 000 FCFA',
            interval: 'monthly',
            features: [
                'Tout du plan Pro',
                'Agent IA integre',
                'Generation auto de contenu',
                'Domaine personnalise',
                'Multi-langues (FR/EN)',
                'Export PDF',
                'Analytics avances + graphiques',
                'Templates premium (10+)',
                'CSS personnalise',
                'Badge Premium Or',
                'API publique',
                'Webhooks',
                'Support prioritaire 24/7',
                'CRM complet illimite',
                'Facturation avancee + PDF',
                'Team management',
                'Multi-utilisateurs',
                'White label'
            ],
            limits: { services: -1, themes: -1, reservations: -1, contacts: -1, invoices: -1, storage: '5 GB' }
        }
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
            imageGeneration: false, // Premium only
            voiceGeneration: false  // Future
        },
        prompts: {
            bio: (name, services) => `Genere une bio professionnelle pour ${name} qui offre: ${services.join(', ')}. Max 150 mots, ton professionnel.`,
            services: (industry) => `Suggere 5 services pour un professionnel du domaine: ${industry}. Format: nom + description courte + prix estime en FCFA.`,
            response: (context) => `Reponds de maniere professionnelle et amicale a ce client: ${context}`
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
        apiAccess: true
    },

    // === RATE LIMITS ===
    RATE_LIMITS: {
        auth: { window: 15 * 60 * 1000, max: 10 },
        api: { window: 60 * 1000, max: 100 },
        reservation: { window: 60 * 1000, max: 20 },
        chat: { window: 60 * 1000, max: 30 },
        ai: { window: 60 * 1000, max: 5 },
        upload: { window: 60 * 1000, max: 10 }
    },

    // === VALIDATION ===
    VALIDATION: {
        username: { min: 3, max: 30, pattern: /^[a-zA-Z0-9_-]+$/ },
        password: { min: 6, max: 128 },
        name: { min: 2, max: 100 },
        slug: { min: 3, max: 50, pattern: /^[a-z0-9-]+$/ }
    }
};
