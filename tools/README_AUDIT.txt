Amorvia Repo Auditor
====================

This tool scans your repo for:
- duplicate basenames across folders
- same-name files with different content (hash)
- root/public shadow pairs (same logical path)
- files that still reference "/public/data/"
- v2-index.json vs *.v2.json consistency (missing/orphan)
- unused JS/CSS (best-effort from index.html + imports)
- large files (>= 1MB)

Usage
-----
1) Unzip at the repo root (it will create `tools/`).
2) Run:
   bash tools/run-audit.sh

Outputs
-------
- `tools/audit-output/audit-report.md`  (human-readable summary)
- `tools/audit-output/referenced.json`  (assets reached from index.html/import graph)

Notes
-----
- "Unused assets" is a best-effort static scan; dynamic loads via string concatenation may not be detected.
- If `public/data/v2-index.json` doesn't exist, the index/data check will try `data/v2-index.json`.
