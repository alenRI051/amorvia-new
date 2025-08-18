Amorvia — Classic v1 Bundle
Generated: 2025-08-18

Files
- public/js/app.js             — v1 UI module (exports init())
- public/data/scenarios.json   — your scenarios dataset (v1)

How to use
1) Copy these files into your repo (preserve paths). They coexist with your v2 files.
2) Visit / and choose Mode → Classic v1 (or set localStorage 'amorvia:mode' to 'v1').
3) The v1 app shows a searchable list and Prev/Next across acts; content comes from /data/scenarios.json.

Notes
- CSP-safe (no inline styles). Uses your existing DOM ids and styles.
- You can freely edit /data/scenarios.json; it’s loaded with cache: 'no-store' so changes appear on refresh.
