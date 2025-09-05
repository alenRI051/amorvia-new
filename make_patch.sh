#!/bin/bash
set -e
ZIP=amorvia-hud-choices-patch.zip
rm -f $ZIP
mkdir -p tmp_patch/js/compat tmp_patch/js/engine tmp_patch/public/js/compat tmp_patch/public/js

# v2-to-graph.js
cat > tmp_patch/js/compat/v2-to-graph.js <<'JS'
// … paste the enhanced converter from Nova’s message …
JS
cp tmp_patch/js/compat/v2-to-graph.js tmp_patch/public/js/compat/v2-to-graph.js

# ScenarioEngine.js
cat > tmp_patch/js/engine/scenarioEngine.js <<'JS'
// … paste the HUD-seeding ScenarioEngine version from Nova’s message …
JS

# public/js/app.v2.js
cat > tmp_patch/public/js/app.v2.js <<'JS'
// … paste the public app.v2.js that uses v2ToGraph from Nova’s message …
JS

# index.html (root & public)
cat > tmp_patch/index.html <<'HTML'
<!-- … paste the cleaned index.html … -->
HTML
cp tmp_patch/index.html tmp_patch/public/index.html

# manifest.json
cat > tmp_patch/public/manifest.json <<'JSON'
{
  "name": "Amorvia",
  "short_name": "Amorvia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192-maskable.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
JSON

# readme
cat > tmp_patch/README.txt <<'TXT'
Amorvia Patch — HUD + Choices + Cleanup
=======================================
See Nova’s instructions in ChatGPT for details.
TXT

# zip it
(cd tmp_patch && zip -r ../$ZIP .)
rm -rf tmp_patch
echo "Created $ZIP"
