#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
node tools/audit-amorvia.mjs
echo
echo "Open ./tools/audit-output/audit-report.md"
