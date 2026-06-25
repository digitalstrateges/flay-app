#!/bin/bash
# Flay - Script de demarrage
# Usage: bash start.sh

cd /root/Flay

echo ""
echo "  =============================="
echo "   FLAY - Carte de Visite Pro"
echo "   by DIGITALSTRATEGES"
echo "  =============================="
echo ""
echo "  URL:      http://localhost:4000"
echo "  API:      http://localhost:4000/api"
echo "  Wave:     https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/"
echo ""

exec node server.js
