# Flay v4.0 - Plateforme de Cartes de Visite Digitales

> **DIGITALSTRATEGES** - Solution complete pour professionnels en Cote d'Ivoire

## Presentation

Flay est une plateforme SaaS permettant aux professionnels de creer leur carte de visite digitale, site vitrine, gerer les reservations, le CRM, les factures et analyser leurs performances.

## Fonctionnalites

### Pour les utilisateurs
- **Carte de visite digitale** avec 11 themes
- **Site vitrine** avec services, galerie, formulaire
- **Reservations en ligne** avec calendrier
- **Analytics** temps reel (vues, clics, referrers)
- **CRM** contacts, deals, pipeline
- **Facturation** avec generation PDF
- **Paiement Wave** integre

### Plans
| Plan | Prix | Features |
|------|------|----------|
| Free | 0 FCFA | Profil de base |
| Pro | 5 000 FCFA/mois | Analytics, reservations |
| Premium | 15 000 FCFA/mois | Tout + domaine perso |

### Pour l'admin
- Dashboard complet
- Gestion des paiements
- Gestion des reservations
- Suivi des utilisateurs

## Architecture Technique

### Backend (Node.js)
- **26 modules** : Auth, IA, Chat, CRM, Analytics, SEO...
- **115 routes API** RESTful
- **SQLite** pour la persistance
- **WebSocket** temps reel
- **Securite** : CSRF, XSS, rate limiting, JWT

### Frontend
- **17 pages** HTML/CSS/JS
- **Design system** dark mode
- **Responsive** mobile-first
- **PWA** installable

### SEO
- Meta tags dynamiques
- Open Graph + Twitter Cards
- Structured Data (JSON-LD)
- Sitemap XML dynamique
- robots.txt optimise

## Installation

```bash
# Cloner
git clone https://github.com/digitalstrateges/flay-app.git
cd flay-app

# Installer les dependances (optionnel)
npm install

# Lancer
node server.js
```

Ouvrir http://localhost:4000

Compte demo: `demo@flay.app` / `demo123`

## Deploiement

### Railway (recommande)
1. Creer un compte sur https://railway.app
2. Connecter GitHub
3. Selectionner le depot flay-app
4. Ajouter les variables d'environnement:
   - `NODE_ENV=production`
   - `JWT_SECRET=ton-secret`
   - `SESSION_SECRET=ton-session`
5. Deployer

### Docker
```bash
docker-compose up -d
```

## Structure du projet

```
flay/
  server.js           # Serveur principal
  db.js               # Base de donnees SQLite
  security.js         # Securite
  seo.js              # SEO dynamique
  validator.js        # Validation API
  middleware.js        # Middleware system
  websocket.js        # WebSocket temps reel
  response.js         # Reponses standardisees
  config.js           # Configuration
  auth-utils.js       # Authentification
  ai-agent.js         # Agent IA
  chat-engine.js      # Chat
  crm.js              # CRM
  invoicing.js        # Facturation
  public/             # Frontend (17 pages)
  .github/workflows/  # CI/CD
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/refresh` - Rafraichir le token
- `POST /api/auth/forgot-password` - Mot de passe oublie
- `POST /api/auth/reset-password` - Reinitialiser

### Profil
- `GET /api/profile` - Mon profil
- `PUT /api/profile` - Modifier
- `GET /p/:slug` - Profil public

### Paiements
- `POST /api/payments` - Creer un paiement
- `GET /api/payments/history` - Historique

### Reservations
- `POST /api/reservations` - Creer
- `GET /api/reservations` - Liste
- `PUT /api/reservations/:id/status` - Modifier statut

### CRM
- `GET /api/contacts` - Contacts
- `POST /api/contacts` - Ajouter
- `GET /api/deals` - Deals
- `POST /api/deals` - Creer deal

### Analytics
- `GET /api/analytics` - Statistiques
- `GET /api/analytics/realtime` - Temps reel

## Contact

- **WhatsApp**: +225 07 59 73 19 90
- **Wave**: DIGITALSTRATEGE BUSINESS
- **GitHub**: https://github.com/digitalstrateges

## Licence

Proprietaire - DIGITALSTRATEGES 2026
