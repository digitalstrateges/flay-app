const path = require('path');

const env = (key, fallback) => {
  const val = process.env[key];
  if (val !== undefined && val !== '') return val;
  if (fallback !== undefined) return fallback;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Environment variable ${key} is required in production`);
  }
  return fallback;
};

const config = {
  VERSION: '1.01',
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  JWT_SECRET: env('JWT_SECRET', 'flay_dev_secret_change_in_prod'),
  JWT_REFRESH_SECRET: env('JWT_REFRESH_SECRET', 'flay_dev_refresh_change_in_prod'),
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
  JWT_REFRESH_EXPIRES_IN: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '2592000', 10),

  BASE_URL: env('BASE_URL', 'http://localhost:4000'),
  SITE_URL: env('SITE_URL', 'http://localhost:4000'),
  CORS_ORIGIN: env('CORS_ORIGIN', ''),

  DB_PATH: env('DB_PATH', path.join(__dirname, '..', 'data', 'flay.db')),
  DB_JSON_PATH: env('DB_JSON_PATH', path.join(__dirname, '..', 'data', 'db.json')),
  DATA_DIR: env('DATA_DIR', path.join(__dirname, '..', 'data')),

  WAVE_MERCHANT_NAME: env('WAVE_MERCHANT_NAME', 'DIGITALSTRATEGE BUSINESS'),
  WAVE_MERCHANT_PHONE: env('WAVE_MERCHANT_PHONE', '+2250759731990'),
  WAVE_MERCHANT_EMAIL: env('WAVE_MERCHANT_EMAIL', 'contact@digitalstrateges.ci'),
  WAVE_PAYMENT_URL: env('WAVE_PAYMENT_URL', 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/'),
  WAVE_API_KEY: env('WAVE_API_KEY', ''),
  WAVE_WEBHOOK_SECRET: env('WAVE_WEBHOOK_SECRET', ''),
  WAVE_SIGNING_SECRET: env('WAVE_SIGNING_SECRET', ''),

  CINETPAY_API_KEY: env('CINETPAY_API_KEY', ''),
  CINETPAY_SITE_ID: env('CINETPAY_SITE_ID', ''),
  CINETPAY_API_PASSWORD: env('CINETPAY_API_PASSWORD', ''),
  CINETPAY_SECRET_KEY: env('CINETPAY_SECRET_KEY', ''),

  WHATSAPP_NUMBER: env('WHATSAPP_NUMBER', '2250759731990'),
  WHATSAPP_LINK: env('WHATSAPP_LINK', 'https://wa.me/2250759731990'),

  LLM_MODEL: env('LLM_MODEL', 'qwen2.5-0.5b'),
  LLM_ENABLED: true,
  LLM_CACHE_SIZE: parseInt(env('LLM_CACHE_SIZE', '100'), 10),

  SMTP_HOST: env('SMTP_HOST', ''),
  SMTP_PORT: parseInt(env('SMTP_PORT', '587'), 10),
  SMTP_USER: env('SMTP_USER', ''),
  SMTP_PASS: env('SMTP_PASS', ''),
  SMTP_FROM: env('SMTP_FROM', 'noreply@flay.app'),
  SMTP_FROM_NAME: env('SMTP_FROM_NAME', 'Flay'),

  SMS_PROVIDER: env('SMS_PROVIDER', 'africastalking'),
  SMS_API_KEY: env('SMS_API_KEY', ''),
  SMS_USERNAME: env('SMS_USERNAME', ''),
  SMS_SENDER_ID: env('SMS_SENDER_ID', 'FLAY'),

  TWILIO_SID: env('TWILIO_SID', ''),
  TWILIO_TOKEN: env('TWILIO_TOKEN', ''),
  TWILIO_FROM: env('TWILIO_FROM', ''),

  VAPID_PUBLIC_KEY: env('VAPID_PUBLIC_KEY', ''),
  VAPID_PRIVATE_KEY: env('VAPID_PRIVATE_KEY', ''),

  GA4_MEASUREMENT_ID: env('GA4_MEASUREMENT_ID', ''),
  META_PIXEL_ID: env('META_PIXEL_ID', ''),
  HOTJAR_ID: env('HOTJAR_ID', ''),

  DEMO_EMAIL: env('DEMO_EMAIL', 'demo@flay.app'),
  DEMO_PASSWORD: env('DEMO_PASSWORD', 'demo123'),
  DEMO_ENABLED: process.env.DEMO_ENABLED !== 'false',

  ECOMMERCE: {
    currencies: ['XOF', 'EUR', 'USD', 'GHS', 'NGN'],
    defaultCurrency: 'XOF',
    taxRate: 0.18,
    freeShippingThreshold: 50000,
    maxProductsPerOrder: 50,
    orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    paymentMethods: ['wave', 'cinetpay', 'momo', 'om', 'cb', 'cod', 'bank_transfer']
  },

  RATE_LIMITS: {
    auth: { window: 15 * 60 * 1000, max: 10 },
    api: { window: 60 * 1000, max: 100 },
    reservation: { window: 60 * 1000, max: 20 },
    chat: { window: 60 * 1000, max: 30 },
    ai: { window: 60 * 1000, max: 5 },
    upload: { window: 60 * 1000, max: 10 },
    ecommerce: { window: 60 * 1000, max: 50 }
  },

  PLANS: {
    free: {
      name: 'Gratuit', slug: 'free', price: 0,
      features: [
        'Carte de visite digitale',
        'Lien unique flay.app/username',
        '5 services maximum',
        'Statistiques de base',
        '15 themes',
        'Partage WhatsApp + QR Code',
        'Reservation jusqu\'a 10/mois',
        'Contact jusqu\'a 100',
        'Stock de base (20 produits)'
      ],
      limits: { services: 5, themes: 15, reservations: 10, contacts: 100, invoices: 20, products: 20, storage: '100 MB', customDomain: false, ecommerce: true, aiAgent: false, whiteLabel: false, flayStore: false }
    },
    pro: {
      name: 'Pro', slug: 'pro', price: 5000, priceLabel: '5 000 FCFA/mois', priceAnnual: 50000,
      features: [
        'Tout du plan Gratuit', 'Reservations en ligne illimitees', 'Services illimites',
        'Analytics detailles + graphiques', '30 themes', 'QR Code personnalise',
        'Badge Verifie Pro', 'Chat en temps reel', 'Notifications SMS',
        'Support email 48h', 'Reception de paiements Wave', 'Facturation simple',
        'Export contacts CSV', 'Site vitrine professionnel', 'Galerie photos (20 images)',
        'Formulaire de contact', 'Carte Google Maps', 'Liens reseaux sociaux',
        'Boutique en ligne (50 articles)', 'Acces Flay Store'
      ],
      limits: { services: -1, themes: 30, reservations: -1, contacts: 500, invoices: 100, products: 50, storage: '500 MB', customDomain: false, ecommerce: true, aiAgent: false, whiteLabel: false, gallery: 20, flayStore: true }
    },
    premium: {
      name: 'Premium', slug: 'premium', price: 15000, priceLabel: '15 000 FCFA/mois', priceAnnual: 150000,
      features: [
        'Tout du plan Pro', 'Agent IA integre', 'Generation auto de contenu',
        'Domaine personnalise', 'Multi-langues (FR/EN/AR/PT)', 'Export PDF',
        'Analytics avances + insights IA', '40+ themes', 'CSS personnalise',
        'Badge Premium Or', 'API publique', 'Webhooks', 'Support prioritaire 24/7',
        'CRM complet illimite', 'Facturation avancee + PDF', 'Boutique en ligne (300 articles)',
        'Panier d\'achat', 'Paiement Wave/OM/Moov integre', 'Commandes en ligne',
        'Gestion des stocks avancee', 'Galerie photos (100 images)', 'CV/Portfolio en ligne',
        'Animations et effets', 'Integration Google Analytics', 'Meta Pixel',
        'Acces Flay Store complet', 'Programme de fidelite', 'Coupons avances'
      ],
      limits: { services: -1, themes: -1, reservations: -1, contacts: -1, invoices: -1, products: 300, storage: '5 GB', customDomain: true, ecommerce: true, aiAgent: true, whiteLabel: false, gallery: 100, flayStore: true }
    },
    doree: {
      name: 'Doree', slug: 'doree', price: 30000, priceLabel: '30 000 FCFA/mois', priceAnnual: 300000,
      badge: 'Doree', badgeColor: '#eab308',
      features: [
        'Tout du plan Premium', 'Boutique en ligne (1000 articles)',
        'Achats d\'espace supplementaire via Flay Store', 'Multi-utilisateurs (5 comptes)',
        'Team management', 'White label', 'Domaine personnalise', 'SSL inclus',
        'SEO avance + Meta tags auto', 'Emails de confirmation auto',
        'Notifications push', 'Reporting avance + export', 'Export donnees complet',
        'API avancee + Webhooks custom', 'Support telephone 24/7', 'Formation incluse',
        'Galerie photos ILLIMITEE', 'Video embed', 'Booking en ligne',
        'Abonnements clients', 'Programme de fidelite complet', 'Coupons et reductions illimites',
        'Statistiques ventes detaillees', 'Multi-devises', 'Facturation automatique',
        'Suivi livraison', 'Avis clients + notation', 'Wishlist + comparateur',
        'Dropshipping ready', 'Marketplace multi-vendeurs', 'Flay Store: achats d\'espace a la carte'
      ],
      limits: { services: -1, themes: -1, reservations: -1, contacts: -1, invoices: -1, products: 1000, storage: '20 GB', customDomain: true, ecommerce: true, aiAgent: true, whiteLabel: true, gallery: -1, users: 5, flayStore: true }
    }
  },

  FEATURES: {
    aiAgent: true, chat: true, analytics: true, webhooks: true, apiKeys: true,
    abTesting: true, pdfExport: true, customCss: true, multiLang: true, darkMode: true,
    wavePayments: true, reservations: true, crm: true, invoicing: true, ecommerce: true,
    teamManagement: true, customDomains: true, whiteLabel: true, smsNotifications: true,
    emailNotifications: true, pushNotifications: true, fileUpload: true, gallery: true,
    geolocation: true, socialAuth: true, twoFactorAuth: true, apiAccess: true,
    multiCurrency: true, coupons: true, loyalty: true, reviews: true, wishlist: true
  }
};

module.exports = config;
