Amorvia Data Pack — generated 2025-08-18

Created files:
- public/data/index.json         → slim list for sidebar (id, title, acts)
- public/data/full-index.json    → full scenarios payload (what you pasted)
- public/data/<id>.json          → one file per scenario
- public/service-worker.js       → SCENES precached: scene-first-agreements, co-parenting-with-bipolar-partner, brzi-kontakti, scene-new-introductions, dating-after-breakup-with-child-involved, scene-different-rules, to-do, scene-de-escalation, direction

How to use:
1) Copy **public/data/** into your project's /public/data/.
2) Replace your current **/public/service-worker.js** with this one (version v1.3.0).
3) Deploy, then in Chrome DevTools → Application → Service Workers: Unregister old, Clear storage, reload.
4) Your app can fetch:
   - GET /data/index.json             (for the list)
   - GET /data/<id>.json              (for details)
5) SW precaches all /data/<id>.json so first-run works offline.

If your bootstrap code expects *only* /data/index.json (with full details),
point it to /data/full-index.json instead.
