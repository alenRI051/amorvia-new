# CI Bundle for Amorvia

## Included
- `.github/workflows/e2e.yml` — structure & JSON checks on push/PR.
- `.github/workflows/lighthouse.yml` — Lighthouse CI on PRs and manual dispatch.

## Optional: Preview URL
Set a repo secret named **LIGHTHOUSE_URL** if you want to run Lighthouse against a specific deployment URL (e.g., Vercel preview). Otherwise it defaults to `https://www.amorvia.eu/`.

## How to install
1. Download the ZIP and extract it.
2. In GitHub → your repo → **Add file → Upload files**.
3. Drag the `.github/` folder (keep structure) and commit to `main`.
