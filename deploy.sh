#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         FLAY SUPER APP v1.01 - DEPLOIEMENT                  ║"
echo "║         DIGITALSTRATEGES Business                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}$1 n'est pas installe.${NC}"
        echo "Installe-le puis reessaye."
        exit 1
    fi
}

check_command git
check_command node
check_command npm

echo -e "${GREEN}[1/5] Verification du projet...${NC}"
echo "  Node.js: $(node --version)"
echo "  NPM: $(npm --version)"
echo "  Fichiers JS: $(find . -maxdepth 1 -name '*.js' | wc -l)"
echo "  Pages: $(ls public/*.html 2>/dev/null | wc -l)"
echo "  Routes API: $(ls routes/*.js 2>/dev/null | wc -l)"

echo ""
echo -e "${GREEN}[2/5] Installation des dependances...${NC}"
if [ -d "node_modules" ]; then
    echo "  node_modules existe deja"
else
    npm install --no-audit --no-fund
    echo "  Dependances installees"
fi

echo ""
echo -e "${GREEN}[3/5] Preparation des dossiers...${NC}"
mkdir -p data uploads
touch data/.gitkeep uploads/.gitkeep
echo "  Dossiers data/ et uploads/ prets"

echo ""
echo -e "${GREEN}[4/5] Test du serveur...${NC}"
timeout 8 node server.js &
SERVER_PID=$!
sleep 4
if curl -s --max-time 3 http://127.0.0.1:4000/api/health > /dev/null 2>&1; then
    echo -e "  Serveur: ${GREEN}OK${NC} (port 4000)"
else
    echo -e "  Serveur: ${YELLOW}Verification impossible${NC}"
fi
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo ""
echo -e "${GREEN}[5/5] Pret pour le deploiement !${NC}"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}DEPLOIEMENT RAPIDE SUR RAILWAY:${NC}"
echo ""
echo "  1. Installe Railway CLI:"
echo "     npm install -g @railway/cli"
echo ""
echo "  2. Connecte-toi:"
echo "     railway login"
echo ""
echo "  3. Lie le projet:"
echo "     railway link"
echo ""
echo "  4. Deploie:"
echo "     railway up"
echo ""
echo "  5. Configure les variables d'environnement:"
echo "     railway variables"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}OU SUR DOCKER:${NC}"
echo ""
echo "  docker compose up -d"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Bon deploiement ! - DIGITALSTRATEGES"
echo ""
