#!/bin/bash
# Flay v0.1 - Script de demarrage
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  =============================="
echo "   FLAY SUPER APP v1.01"
echo "   by DIGITALSTRATEGES"
echo "  =============================="
echo ""
echo "  URL:      http://localhost:${PORT:-4000}"
echo "  API:      http://localhost:${PORT:-4000}/api"
echo "  Wave:     https://pay.wave.com/m/M_uv5jVAEPkSWs/c/ci/"
echo ""

# Ensure data directory exists
mkdir -p data uploads

exec node server.js
