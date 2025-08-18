Amorvia Dev Kit - 2025-08-18

What this includes
- public/index.html            - v1 and v2 UI markup, Mode selector
- public/css/ui.patch.css      - minimal styles
- public/js/bootstrap.js       - relative imports, char/bg wiring, health logs
- public/js/app.v2.js          - v2 UI glue
- public/js/engine/scenarioEngine.js - tiny engine
- public/js/app.js             - v1 stub (exports init())
- public/data/v2-index.json    - index of v2 scenarios
- public/data/co-parenting-with-bipolar-partner.v2.json - sample v2 scenario
- public/scenario.v2.schema.json - JSON Schema for v2
- public/sw.js                 - offline caching (data and static)
- public/sw-register.js        - SW registration
- vercel.json                  - routes + headers

How to use
1) Copy these files into your project, preserving paths.
2) DevTools -> Application -> check "Bypass for network", hard reload once.
3) Switch modes with the Mode select:
   - v2: HUD + choices
   - v1: list + Prev/Next (replace public/js/app.js with your real v1 when ready)
4) Offline: turn off network, reload. Data and static files should still work.

Notes
- JS/JSON files are ASCII only (no BOM). If you ever see "Invalid or unexpected token at 1:1", fetch the URL and check the first char code is 47.
- Data endpoints under /data are set to must-revalidate; SW controls caching for offline.
- Update sw.js VERSION to force a refresh after big changes.
