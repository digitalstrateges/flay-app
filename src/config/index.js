module.exports = {
  VERSION: '1.02',
  APP_NAME: 'Flay Super App',
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET env var required in production'); })() : 'flay_super_app_secret_dev'),
  JWT_EXPIRES_IN: parseInt(process.env.JWT_EXPIRES_IN || '86400', 10),
  BASE_URL: process.env.BASE_URL || 'http://localhost:4000',
  SITE_URL: process.env.SITE_URL || 'http://localhost:4000',
  DB_PATH: process.env.DB_PATH || require('path').join(__dirname, '..', '..', 'data', 'flay.db'),
  DATA_DIR: process.env.DATA_DIR || require('path').join(__dirname, '..', '..', 'data'),
  WAVE_PAYMENT_URL: process.env.WAVE_PAYMENT_URL || 'https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/',
  WHATSAPP_LINK: process.env.WHATSAPP_LINK || 'https://wa.me/2250759731990',
  LLM_MODEL: process.env.LLM_MODEL || 'qwen2.5-0.5b',
  LLM_ENABLED: true,
  DEMO_EMAIL: process.env.DEMO_EMAIL || 'demo@flay.app',
  DEMO_PASSWORD: process.env.DEMO_PASSWORD || 'demo123',
  DEMO_ENABLED: process.env.DEMO_ENABLED !== 'false',
  RAILWAY_API_KEY: process.env.RAILWAY_API_KEY || '',
  SUPER_APP: true,
  MODULES: {
    auth: true, profile: true, ecommerce: true, crm: true, analytics: true,
    chat: true, ai: true, invoicing: true, reservations: true, payments: true,
    marketplace: true, social: true, team: true, notifications: true, export: true,
    flayStore: true, africa: true, multiLang: true, push: true, webhooks: true
  }
};
