# Flay Super App — CLAUDE.md

## Project Overview
Flay Super App is a multi-tenant African super app: digital business cards, e-commerce, CRM, reservations, AI, marketplace, chat, analytics, invoicing, push notifications, and multi-language support. Built for the Côte d'Ivoire market with Wave payment integration.

## Architecture

```
flay-app/
├── app.js                 # Express app (legacy entry, backward compatible)
├── server.js              # Main entry point (recommended)
├── config.js              # Base configuration
├── db/index.js            # SQLite database (better-sqlite3 + sql.js fallback)
│
├── routes/                # API route modules (Express Router)
│   ├── auth.js, profile.js, ecommerce.js, reservation.js
│   ├── flay-pay.js        # Wave + WhatsApp payment system
│   ├── leaderboard.js     # MRR leaderboard (TrustMRR style)
│   ├── card.js            # Digital business card
│   ├── settings.js, crm.js, ai.js, chat.js
│   ├── analytics.js, invoicing.js, tracking.js
│   ├── accounting.js, premium.js, export.js
│   ├── push.js, webhooks.js, flay-store.js
│   ├── social.js, followers.js, system.js
│   ├── enhanced-design-studio.js
│   ├── africa-world.js, local-languages.js, bidirectional.js
│   └── flay-pay.js, leaderboard.js
│
├── public/                # Static frontend (SPA pages)
│   ├── dashboard.html      # Main dashboard (settings, ecommerce, MRR, etc.)
│   ├── index.html          # Landing page
│   ├── login.html, register.html, forgot-password.html, reset-password.html
│   ├── scanner.html, offline.html, payment.html
│   ├── leaderboard.html    # Public MRR leaderboard
│   ├── digitalstrateges.html  # Agency landing page
│   └── pwa.js, manifest.json, sw.js
│
├── src/                   # Core modules (new architecture)
│   ├── config/index.js    # Environment config
│   ├── core/              # Event bus, plugin system, app factory
│   ├── database/          # Migrations, backup system
│   ├── security/          # Rate limiting, CORS, CSRF, XSS
│   ├── llm/               # Local LLM engine (prompts, model loader)
│   ├── middleware/        # Auth middleware (JWT, session)
│   ├── utils/logger.js    # Structured logger
│   └── error-handler.js   # Centralized error handler + AppError class
│
├── models/                # Data models (User, Profile, Product, etc.)
├── lib/                   # Libraries (auth, rate-limit)
├── data/                  # Database files (gitignored)
├── uploads/               # User-uploaded images
│
├── flayer.js              # Public profile page generator
├── config.js              # App configuration
├── security.js            # Security utilities (PBKDF2, JWT, CSRF)
│
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Local dev environment
├── railway.json           # Railway deployment config
├── Procfile               # Railway process definition
└── CLAUDE.md              # This file
```

## Tech Stack
- **Runtime**: Node.js 18+ (Express 5)
- **Database**: SQLite (better-sqlite3) + JSON file storage
- **Auth**: JWT (jti), PBKDF2 password hashing, CSRF tokens
- **Payment**: Wave CI (QR code + WhatsApp manual verification)
- **LLM**: Local AI engine (prompt templates, Gemini API fallback)
- **Frontend**: Vanilla HTML/CSS/JS (SPA-style dashboard)
- **PWA**: Service worker, offline page, manifest
- **Deploy**: Railway (Docker)

## Key Conventions

### Code Style
- No semicolons (ASI style)
- Single quotes for strings, template literals for interpolation
- `camelCase` for variables/functions, `PascalCase` for classes
- Async/await preferred over raw Promises
- Error-first pattern: never swallow errors, always log

### API Patterns
- All API routes under `/api/*`
- JSON request/response with `Content-Type: application/json`
- Response format: `{ success: true, data: {...} }` or `{ error: "message" }`
- Auth via `Authorization: Bearer <token>` header
- Auth middleware: `security.authenticate(req, res, next)`

### Database
- `db/index.js` exports: `db.query(sql, params)`, `db.get(sql, params)`, `db.run(sql, params)`, `db.update(table, id, data)`, `db.insert(table, data)`, `db.delete(table, id)`
- Use parameterized queries (no string interpolation in SQL)
- Tables: users, profiles, products, categories, reservations, orders, etc.

### Error Handling
- Throw `AppError` from `src/error-handler.js`: `new AppError(message, statusCode, code)`
- Use `next(error)` or `throw error` in async routes
- The centralized error handler in `app.js` catches all errors

### Validation
- Use `validator.js` class: `new Validator().isRequired(val, 'field').isEmail(val, 'field').validate()`

### Payments (Flay-Pay)
- Three-step flow: subscribe → verify (send Wave ID via WhatsApp) → admin confirms
- Plans: Free (1 product), Starter (10 products, 20k FCFA/mo), Pro (unlimited, 50k FCFA/mo), Annual (10% off)
- WhatsApp number: +225 07 59 73 19 90

## Commands

### Development
```bash
node server.js          # Start server (port 4000)
node --watch server.js  # Dev mode with auto-reload
```

### Docker
```bash
npm run docker:build    # docker build -t flay-super-app .
npm run docker:compose  # docker compose up -d
```

### Database
```bash
node -e "require('./src/database/backup')"  # Manual backup
```

### Health Check
```bash
curl http://localhost:4000/api/health
```

## Deployment (Railway)
1. Connect `github.com/digitalstrateges/flay-app` in Railway dashboard
2. Set environment variables in Railway (see `.env.example`)
3. Auto-deploys on push to `main`
4. Dockerfile handles build: `npm install --omit=dev` + `EXPOSE 4000`

## Environment Variables
See `.env.example` for all required/optional vars:
- `PORT`, `NODE_ENV`, `SITE_URL`, `JWT_SECRET`, `DB_PATH`, `WHATSAPP_NUMBER`
- `CORS_ORIGIN`, `LOG_LEVEL`, `ADMIN_IDS`
- `UPLOAD_DIR`, `BACKUP_INTERVAL`, `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX`

## AGENTS.md — AI Instructions (loaded automatically)

When working in this project, always:
1. Read CLAUDE.md first for full context
2. Check existing patterns before writing new code
3. Run `node --check` on modified files before committing
4. Never use fake/random data for charts or analytics
5. Respect the CI orange (#f77f00) / white / green (#00853f) theme
6. Add PWA meta tags to all new HTML pages
7. Test mobile responsive at 480px, 600px, 768px breakpoints
8. Keep error messages in French for the CI market

## Safety Guards
- NEVER commit `.env` or `data/` files
- NEVER use `eval()` or `new Function()`
- ALWAYS use parameterized SQL queries (never string concatenation)
- ALWAYS validate and sanitize user input
- ALWAYS check authentication for protected routes
- Use CSRF tokens for all state-changing operations
