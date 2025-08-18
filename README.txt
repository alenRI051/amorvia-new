Amorvia — Security Headers + CLS Patch

Files:
- vercel.json                 → adds HSTS, CSP, COOP, X-Frame-Options, Referrer-Policy, and nosniff
- public/css/styles-extra.css → reserves space for character images to drop CLS

How to apply:
1) Replace your existing vercel.json at the repo root with this one.
2) EITHER:
   a) Append the CSS rules in public/css/styles-extra.css to the end of your public/css/styles.css, OR
   b) Link it from index.html after your main CSS:
      <link rel="stylesheet" href="/css/styles-extra.css">
3) Deploy. For a clean test, unregister the Service Worker (DevTools → Application) and hard-reload.
4) Run Lighthouse against https://amorvia.eu/ (avoid the www redirect).

Notes on CSP:
- 'script-src' includes 'unsafe-inline' to allow your JSON-LD <script> and the preload onload trick.
- If you later remove inline uses, we can tighten CSP further.
