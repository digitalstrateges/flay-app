#!/bin/bash
# ==========================================
# FLAY - Script de deploiement automatique
# DIGITALSTRATEGES
# ==========================================

set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         FLAY - DEPLOIEMENT AUTOMATIQUE           ║"
echo "║         DIGITALSTRATEGES Business                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Git n'est pas installe.${NC}"
    echo "Installe-le: sudo apt install git"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js n'est pas installe.${NC}"
    echo "Installe-le: sudo apt install nodejs"
    exit 1
fi

echo -e "${GREEN}[1/6] Verification du projet...${NC}"
cd /root/Flay
echo "  Dossier: $(pwd)"
echo "  Fichiers: $(find . -maxdepth 1 -type f | wc -l)"
echo "  Pages: $(ls public/*.html 2>/dev/null | wc -l)"
echo "  Modules: $(ls *.js 2>/dev/null | wc -l)"

echo ""
echo -e "${GREEN}[2/6] Initialisation Git...${NC}"
if [ ! -d ".git" ]; then
    git init
    git branch -M main
    echo "  Git init: OK"
else
    echo "  Git deja initialise"
fi

echo ""
echo -e "${GREEN}[3/6] Ajout des fichiers...${NC}"
git add .
git status --short | head -20
echo "  $(git status --short | wc -l) fichiers a commiter"

echo ""
echo -e "${GREEN}[4/6] Premier commit...${NC}"
git commit -m "Flay v3.0 - Production | DIGITALSTRATEGES

Modules: 26 (Auth, IA, Chat, CRM, Analytics, Payments, SEO...)
Pages: 17 (Landing, Dashboard, Editor, Studio, CRM, Admin...)
Routes: 115 API
Securite: CSRF, XSS, Rate Limiting, Headers
SEO: Meta tags, Sitemap, Structured Data
Deploiement: Docker, Railway, Render, Cyclic

Contact: +225 07 59 73 19 90
Wave: DIGITALSTRATEGE BUSINESS"

echo ""
echo -e "${GREEN}[5/6] Test du serveur...${NC}"
timeout 5 node server.js &
sleep 3
if curl -s --max-time 3 http://127.0.0.1:4000/api/health > /dev/null 2>&1; then
    echo "  Serveur: OK (port 4000)"
else
    echo "  Serveur: Erreur - verifie le code"
fi
kill %1 2>/dev/null

echo ""
echo -e "${GREEN}[6/6] Instructions de deploiement...${NC}"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}PROCHAINE ETAPE: Creer un compte GitHub${NC}"
echo ""
echo "  1. Va sur: https://github.com"
echo "  2. Clique 'Sign up' (gratuit)"
echo "  3. Cree un compte avec ton email"
echo "  4. Clique 'New repository'"
echo "  5. Nom: flay-app"
echo "  6. Public ou Private"
echo "  7. Clique 'Create repository'"
echo ""
echo "  Puis copie-colle ces commandes:"
echo ""
echo "  git remote add origin https://github.com/TON_UTILISATEUR/flay-app.git"
echo "  git push -u origin main"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}APRES GITHUB: Deploie sur Cyclic (le plus simple)${NC}"
echo ""
echo "  1. Va sur: https://cyclic.sh"
echo "  2. Clique 'Login with GitHub'"
echo "  3. Autorise l'acces"
echo "  4. Clique 'Link to GitHub'"
echo "  5. Selectionne 'flay-app'"
echo "  6. Clique 'Deploy'"
echo "  7. Attends 2-3 minutes"
echo ""
echo "  Cyclic te donne une URL gratuit!"
echo "  Exemple: https://flay-app.cyclic.app"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}Tu peux aussi deploier sur Railway:${NC}"
echo "  https://railway.app > Login with GitHub > New Project"
echo ""
echo -e "${GREEN}Ou sur Render:${NC}"
echo "  https://render.com > New Web Service > GitHub"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo "Bon deploiement! - DIGITALSTRATEGES"
echo ""
