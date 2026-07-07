# Flay Super App v1.01

**La première Super App africaine tout-en-un.**

Plateforme unifiée : showcase, e-commerce, CRM, réservations, IA, marketplace, chat, analytics, facturation, push notifications, multi-langues.

**DIGITALSTRATEGES - Côte d'Ivoire**

## Architecture Super App

```
flay-app/
├── server.js                    # Point d'entrée avec Super App API v1
├── app.js                       # Application Express (backward compatible)
├── config.js                    # Configuration principale
├── src/                         # NOUVELLE ARCHITECTURE SUPER APP
│   ├── config/index.js          # Configuration Super App v1
│   ├── core/
│   │   ├── event-bus.js         # Bus d'événements asynchrone
│   │   ├── plugin-system.js     # Système de plugins modulaire
│   │   ├── app-factory.js       # Factory pattern pour l'app
│   │   └── error-handler.js     # Gestion d'erreurs centralisée
│   ├── database/
│   │   ├── migrator.js          # Système de migrations
│   │   ├── backup.js            # Backup automatique (toutes les 6h)
│   │   └── migrations/          # Migrations SQL
│   ├── security/index.js        # Sécurité v2 (rate-limit, CORS, CSRF, XSS)
│   ├── api/v1/gateway.js        # API Gateway v1
│   └── utils/logger.js          # Logger structuré
├── db/index.js                  # Base de données principale (SQLite/JSON)
├── database.js                  # Base CRM (SQLite/JSON)
├── routes/                      # Routes API (26 modules, 115+ endpoints)
├── lib/                         # Librairies partagées
├── models/                      # Modèles de données
├── public/                      # Interface PWA complète
│   ├── index.html               # Landing page moderne
│   ├── dashboard.html           # Dashboard complet
│   ├── sw.js                    # Service Worker (offline support)
│   ├── manifest.json            # PWA manifest v1.01
│   └── *.html                   # 6 pages fonctionnelles
├── data/                        # Persistance (SQLite + JSON backup)
└── deploy/                      # Déploiement
```

## Fonctionnalités Super App

### 🎯 Showcase & Profil
- Carte de visite digitale interactive
- 40+ thèmes (Dark, Light, Drapeaux, Saisonniers)
- QR Code dynamique
- Liens réseaux sociaux
- Géolocalisation

### 🛒 E-commerce
- Boutique en ligne complète
- Panier d'achat
- Paiements Wave, Orange Money, Moov, Carte bancaire
- Gestion des stocks
- Coupons et réductions
- Suivi de livraison
- Market Intelligence

### 🤝 CRM
- Gestion des contacts
- Pipeline de vente
- Scoring automatique
- Programme de fidélité
- Campagnes SMS/Email

### 🤖 IA & Chat
- Assistant Gemini intégré
- Génération auto de contenu
- Chat en temps réel (WebSocket/SSE)
- Notifications push

### 📊 Analytics
- Tableau de bord temps réel
- Trackeur de visiteurs
- Heatmap géographique
- Export PDF/CSV

### 🌍 Multi-langues
- Français, Anglais, Arabe, Portugais
- Langues locales (Dioula, Baoulé, etc.)

### 🔧 Technique
- Super App API v1 (`/super-api/v1`)
- Event Bus asynchrone
- Système de plugins
- Migrations de base de données
- Backup automatique (toutes les 6h)
- Rate limiting avancé
- Anti-CSRF, XSS Protection
- Arrêt gracieux (graceful shutdown)

## Démarrage

```bash
npm install
cp .env.example .env
node server.js
```

**URL:** http://localhost:4000
**Super API:** http://localhost:4000/super-api/v1
**Demo:** demo@flay.app / demo123

## Déploiement Railway

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

## Docker

```bash
docker compose up -d
```

## Statistiques

- **53** modules JavaScript
- **26** routes API
- **115+** endpoints
- **40+** thèmes
- **6** pages PWA
- **24/7** support

---

**DIGITALSTRATEGES** - +225 07 59 73 19 90
Wave: DIGITALSTRATEGE BUSINESS
