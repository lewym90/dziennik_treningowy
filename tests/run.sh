#!/usr/bin/env bash
# Wszystkie testy FORGE przed wydaniem: obliczenia, scenariusze w przeglądarce i serwer powiadomień.
# Wymaga Playwright (Chromium). Gdy Playwright jest zainstalowany globalnie, ustaw NODE_PATH, np.:
#   NODE_PATH=/opt/npm-tools/node_modules bash tests/run.sh
set -e
cd "$(dirname "$0")/.."
echo "== obliczenia =="; node tests/calc.test.js
echo "== scenariusze =="; node tests/e2e.test.js
echo "== serwer powiadomień =="; (cd server && { [ -d node_modules ] || npm install --no-audit --no-fund >/dev/null; } && node test.mjs | tail -3)
echo "Wszystkie testy przeszły."
