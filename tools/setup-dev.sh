#!/usr/bin/env bash
set -euo pipefail

# ---- Config ----
APP_PORT="${PORT:-3000}"   # used by your local server during tests

echo "==> Dev setup starting…"

# ---- OS packages (Ubuntu/Debian) ----
if command -v apt-get >/dev/null 2>&1; then
  echo "==> Updating apt cache & installing system dependencies"
  sudo apt-get update -y
  sudo apt-get install -y \
    xvfb xauth dbus-x11 \
    libgtk-3-0t64 libgtk2.0-0t64 libatk1.0-0t64 libatk-bridge2.0-0t64 \
    libgbm1 libnss3 libasound2t64 libxss1 libxtst6 libxdamage1 \
    libxrandr2 libxcomposite1 libxcursor1 libxkbcommon0 libxfixes3 \
    libxi6 libwayland-client0 libpango-1.0-0 libpangocairo-1.0-0 \
    libdrm2 libx11-xcb1 libxinerama1 libgdk-pixbuf-2.0-0
else
  echo "!! apt-get not found. Install equivalent system deps for your distro before continuing."
fi

# ---- Node / npm ----
echo "==> Checking Node & npm"
if ! command -v node >/dev/null 2>&1; then
  echo "!! Node.js is not installed. Install Node 18+ (or 22+) and re-run."
  exit 1
fi
node -v
npm -v

# ---- Project deps ----
echo "==> Installing project dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# Ensure required dev deps exist (idempotent)
echo "==> Ensuring required devDependencies"
npm i -D cypress@15.3.0 http-server ajv@8.17.1 \
  chalk execa globby minimist >/dev/null 2>&1 || true

# ---- Cypress binary & verify ----
echo "==> Installing & verifying Cypress binary"
npx cypress install
npx cypress verify

# ---- Xvfb sanity check ----
echo "==> Verifying xvfb"
if ! command -v xvfb-run >/dev/null 2>&1; then
  echo "!! xvfb-run not found even after install. Check your PATH or apt output."
  exit 1
fi
xvfb-run --help >/dev/null

# ---- Done ----
cat <<EOF

✅ Setup complete.

Common next commands:
  - Run one spec (headless):
      /usr/bin/xvfb-run -a npx cypress run --browser electron --spec cypress/e2e/dating_after_breakup.cy.js

  - Or via npm script (if defined):
      npm run test:e2e -- --spec cypress/e2e/dating_after_breakup.cy.js

  - If port ${APP_PORT} is busy, you can override:
      PORT=3210 npm run test:e2e -- --spec cypress/e2e/dating_after_breakup.cy.js

Tip: add this script to your repo and run after new Codespaces start:
  bash tools/setup-dev.sh
EOF
