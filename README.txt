Amorvia Metrics Endpoint
Date: 2025-08-19

This bundle wires a lightweight metrics pipeline:
- Client: public/js/metrics.js (sendBeacon/fetch keepalive)
- Server: api/track.js (Vercel Serverless) — logs to function logs

Install
1) Copy 'api/track.js' into your project root (creating the 'api' folder if missing).
2) Copy 'public/js/metrics.js' into your project.
3) Ensure your vercel.json includes rewrites for /api (it should look like):
   {
     "version": 2,
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
4) In your HTML (index.html), load metrics.js (e.g., below bootstrap):
   <script src="/js/metrics.js" defer></script>

Use in code (optional helpers):
- window.AmorviaMetrics.scenarioStart(scenarioId)
- window.AmorviaMetrics.choiceMade(scenarioId, actId, nodeId, index, label)
- window.AmorviaMetrics.lineNext(scenarioId, actId, nodeId)
- window.AmorviaMetrics.actEnd(scenarioId, actId, deltas)
- window.AmorviaMetrics.saveSlot(name) / loadSlot(name)

Notes
- Events are logged to Vercel function logs. Replace logEvent() to write to a DB later.
- The server whitelists event names and caps payload sizes; do not send PII.
