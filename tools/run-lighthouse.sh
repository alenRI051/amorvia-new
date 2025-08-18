#!/usr/bin/env bash
set -euo pipefail

# Base URL of the site (override with SITE_URL env)
SITE_URL="${SITE_URL:-https://amorvia.eu}"

# Append ?nosw=1 (or &nosw=1 if query already present) to avoid SW in lab tests
URL="${SITE_URL%/}"
if [[ "$URL" == *\?* ]]; then
  URL="${URL}&nosw=1"
else
  URL="${URL}?nosw=1"
fi

echo "Running Lighthouse for: $URL"

mkdir -p lighthouse

# Use npx to fetch Lighthouse on the fly; output JSON + HTML in ./lighthouse
npx --yes lighthouse "$URL" \
  --preset=desktop \
  --output=json --output=html \
  --output-path=./lighthouse/report \
  --quiet \
  --chrome-flags="--headless=new --no-sandbox"

echo "Lighthouse reports saved to ./lighthouse: "
ls -la lighthouse
