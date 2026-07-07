#!/bin/bash
# Flay Deploy Check - Rapide
URL="${1:-https://web-production-b3720.up.railway.app}"

echo "=== Flay v0.1 Deploy Check ==="
echo "Target: $URL"
echo ""

for path in /index.html /login.html /register.html /dashboard.html /settings.html /api/health /api/plans /favicon.ico; do
    status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL$path" 2>/dev/null)
    if [ "$status" = "200" ]; then
        echo "  ✓ $path → $status"
    else
        echo "  ✗ $path → $status"
    fi
done

echo ""
echo "Done."
