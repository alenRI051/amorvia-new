Amorvia — Hardening Pack (2025-08-18)
=============================================================

What this pack does
- **Strict CSP (no 'unsafe-inline')** using a SHA-256 hash for your inline JSON-LD only.
- Removes inline styles and moves them to **/css/ui.css** (so 'style-src' can be 'self').
- Adds selected-scenario highlight + better focus styles (keyboard-friendly).
- Adds a tiny privacy-friendly analytics beacon (**/js/analytics.js**) that POSTs to **/api/pv** (Edge Function). No cookies, no IDs.
- Makes the SW **skip in lab runs** when **?nosw=1** or **navigator.webdriver** is true.

Files included
- public/index.html
- public/css/ui.css
- public/js/app.js
- public/js/bootstrap.js
- public/js/analytics.js
- public/sw-register.js
- api/pv.js   (Edge Function)
- vercel.json (security headers with CSP hash: sha256-c/JBXIj3sV+QrUV5EbMnBGHkc7eTrtOcxKvOPxq6iZY=)

Apply
1) Copy these files into your repo (preserving paths). Merge with any local changes you made.
2) Ensure your existing **public/service-worker.js** stays in place.
3) Deploy. Then Lighthouse: test **https://amorvia.eu/?nosw=1** for lab runs.

Notes
- If you change the JSON-LD content, the CSP hash must be updated. I can regenerate it for you.
- The analytics endpoint logs minimal info to Vercel logs (path, referrer host, UA slice, timestamp). Extend it later if you need.
