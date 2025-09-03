#!/usr/bin/env bash
set -euo pipefail

# Ensure we're at the repo root
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT" ]; then
  echo "Not a git repo (or no git in PATH). Aborting." >&2
  exit 1
fi
cd "$ROOT"

echo "== Amorvia cleanup: consolidate on root, remove public/* duplicates =="

rm_if_exists() {
  local f="$1"
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1; then
    echo "git rm -f $f"
    git rm -f "$f"
  else
    # Also try regular fs in case it's untracked
    if [ -e "$f" ]; then
      echo "rm -f $f (untracked)"
      rm -f "$f"
    fi
  fi
}

# List of duplicate paths to remove from public (keep root copies)
PUB_REMOVE=(
  "public/index.html"
  "public/css/addons.css"
  "public/css/styles.css"
  "public/css/ui.patch.css"
  "public/js/addons/art-loader.js"
  "public/js/addons/ensure-anchor.js"
  "public/js/addons/extras-tabs.js"
  "public/js/app.js"
  "public/js/app.v2.js"
  "public/js/bootstrap.js"
  "public/js/compat/v2-to-graph.js"
  "public/js/engine/scenarioEngine.js"
  "public/js/metrics.js"
  "public/assets/backgrounds/room.svg"
  "public/assets/characters/female_casual.svg"
  "public/assets/characters/male_casual.svg"
  "public/data/brzi-kontakti.v2.json"
  "public/data/co-parenting-with-bipolar-partner.v2.json"
  "public/data/dating-after-breakup-with-child-involved.v2.json"
  "public/data/different-rules.v2.json"
  "public/data/direction.v2.json"
  "public/data/scene-de-escalation.v2.json"
  "public/data/scene-different-rules.v2.json"
  "public/data/scene-first-agreements.v2.json"
  "public/data/scene-new-introductions.v2.json"
  "public/data/to-do.v2.json"
  "public/data/v2-index.json"
  "public/data/visitor.v2.json"
  "public/favicon.png"
  "public/icons/icon-192.png"
  "public/icons/icon-512.png"
  "public/manifest.json"
  "public/sitemap.xml"
  "public/vercel.json"
  "public/sw.js"
  "public/sw-register.js"
)

# Only remove if a root counterpart exists (safety)
for f in "${PUB_REMOVE[@]}"; do
  base="${f#public/}"
  if git ls-files --error-unmatch "$base" >/dev/null 2>&1; then
    rm_if_exists "$f"
  else
    # If no root counterpart, keep it (might be intentional)
    echo "skip (no root counterpart): $f"
  fi
done

# Special-case: multiple sw-register.js copies. Keep root one.
if git ls-files --error-unmatch "js/sw-register.js" >/dev/null 2>&1; then
  echo "Removing js/sw-register.js (duplicate, keep root sw-register.js referenced in index.html)"
  rm_if_exists "js/sw-register.js"
fi

# Double-check: ensure root sw.js exists; if both existed earlier, we already removed public/sw.js
if ! [ -f "sw.js" ]; then
  echo "WARNING: root sw.js not found. If you need a service worker, ensure sw.js exists at repo root."
fi

echo "== Done. Staged deletions above. Review then commit. =="
