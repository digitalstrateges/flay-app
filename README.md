# Flay Super App

**La première Super App africaine tout-en-un** — carte de visite digitale, e-commerce, CRM, réservations, IA, marketplace, chat, analytics, facturation, push notifications et multi-langues.

Par [DIGITALSTRATEGES](https://digitalstrateges.ci) — Côte d'Ivoire.

## Stack Technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Node.js 18+, Express 5 |
| Base de données | SQLite (better-sqlite3 + sql.js) + JSON |
| Auth | JWT (jti), PBKDF2, CSRF tokens |
| Frontend | HTML/CSS/JS vanilla (SPA dashboard) |
| Paiement | Wave CI + vérification WhatsApp |
| IA | Moteur LLM local + Gemini API |
| PWA | Service worker, offline, manifest |
| Déploiement | Docker → Railway |

## Architecture

```
flay-app/
├── app.js                  # Application Express
├── server.js               # Point d'entrée
├── config.js               # Configuration centralisée
│
├── routes/                 # Routes API (26 modules)
│   ├── auth.js             # Authentification (register, login, OAuth)
│   ├── profile.js          # Gestion des profils
│   ├── ecommerce.js        # E-commerce (produits, catégories, commandes)
│   ├── reservation.js      # Système de réservation
│   ├── flay-pay.js         # Paiement Wave + WhatsApp
│   ├── leaderboard.js      # Classement MRR public
│   ├── analytics.js        # Analytics métier
│   ├── crm.js, chat.js, ai.js, invoicing.js
│   └── ...
│
├── public/                 # Pages statiques + PWA
├── src/                    # Modules noyau
│   ├── core/               # Event bus, plugin system
│   ├── database/           # Migrations, backup
│   ├── security/           # Rate limiting, CORS, CSRF
│   ├── llm/                # Moteur IA local
│   ├── utils/logger.js     # Logger structuré
│   └── error-handler.js    # Gestion d'erreurs centralisée
│
├── db/index.js             # Couche d'accès aux données
├── flayer.js               # Générateur de page publique
├── models/                 # Modèles de données
├── uploads/                # Images uploadées
└── CLAUDE.md               # Contexte IA pour agents
```

## Démarrage Rapide

```bash
git clone https://github.com/digitalstrateges/flay-app
cd flay-app
cp .env.example .env
node server.js
# → http://localhost:4000
```

## Scripts

| Commande | Description |
|----------|-------------|
| `node server.js` | Démarrer le serveur |
| `node --watch server.js` | Mode développement (auto-reload) |
| `npm run docker:build` | Build Docker |
| `npm run docker:compose` | Docker Compose |
| `curl localhost:4000/api/health` | Health check |

## API

Toutes les routes sous `/api/*`. Format réponse standardisé :
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "message", "code": "ERROR_CODE" }
```

### Authentification
- `POST /api/auth/register` — Création de compte
- `POST /api/auth/login` — Connexion (retourne JWT)
- `POST /api/auth/forgot` — Mot de passe oublié
- `POST /api/auth/reset` — Réinitialisation mot de passe

### Profil public
- `GET /u/:slug` — Page profil publique (générée par flayer.js)
- `GET /api/card/vcard/:slug` — Télécharger vCard
- `GET /api/card/print/:slug` — Carte de visite imprimable

### E-commerce
- `GET/POST/PUT/DELETE /api/products` — CRUD produits
- `GET/POST/PUT/DELETE /api/categories` — CRUD catégories
- `GET /api/orders` — Commandes reçues
- `POST /api/orders` — Passer commande

### Paiement (Flay-Pay)
- `POST /api/flay-pay/subscribe` — Souscrire à un plan
- `POST /api/flay-pay/verify` — Vérifier paiement Wave
- `POST /api/flay-pay/confirm` — (Admin) Confirmer abonnement
- `GET /api/flay-pay/my-subscription` — État abonnement

### Réservations
- `GET /api/reservations` — Mes réservations
- `POST /api/reservations` — Créer réservation
- `GET /api/reservations/available/:slug` — Créneaux disponibles

### Leaderboard
- `GET /api/leaderboard` — Classement public
- `GET /api/leaderboard/stats` — Statistiques globales

## Déploiement (Railway)

1. Connecter `github.com/digitalstrateges/flay-app` dans Railway
2. Variables d'environnement requises (voir `.env.example`) :
   - `JWT_SECRET`, `SITE_URL`, `WHATSAPP_NUMBER=2250759731990`
3. Déploiement automatique sur push vers `main`

Ou CLI :
```bash
npm i -g @railway/cli && railway login && railway link && railway up
```

## PWA

- Service worker avec cache des assets statiques
- Page offline personnalisée (`/offline.html`)
- Thème CI (orange/blanc/vert) avec mode clair/sombre
- `@media(hover:none)` retour tactile pour mobile

## Plans & Limites

| Plan | Prix | Produits | Fonctionnalités |
|------|------|----------|-----------------|
| Free | Gratuit | 1 | Profil, QR code, réservations |
| Starter | 20k FCFA/mois | 10 | + E-commerce, CRM, analytics |
| Pro | 50k FCFA/mois | Illimité | + IA, marketplace, API |
| Annuel | -10% | Selon plan | Tout le plan + 2 mois offerts |

---

**DIGITALSTRATEGES** — +225 07 59 73 19 90 — [WhatsApp](https://wa.me/2250759731990)
