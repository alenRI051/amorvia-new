# Amorvia `/api/track` — Debug Build

This build adds **robust body parsing** and **extra console logs** so you can see exactly what Vercel receives.

## Deploy
1. Drop files in repo root.
2. Set env vars:
   - `TRACK_SALT` (required)
   - `TRACK_RATE_LIMIT` (optional, default 60/5min)
3. Deploy and watch function logs while testing:
   - Vercel dashboard → Functions → /api/track

## Client test
Run in your browser console:
```js
fetch('/api/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ event: 'debug_test', data: { at: Date.now() } }),
  keepalive: true
}).then(r => r.json()).then(console.log).catch(console.error);
```

## Notes
- Logs show whether `req.body` was object/string/undefined and the final JSON line written.
- Logging goes to `/tmp/amorvia-tracks-YYYY-MM-DD.jsonl` (ephemeral). Switch to Blob/Postgres for persistence later.
