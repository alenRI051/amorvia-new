# Amorvia `/api/track` — ESM Import Fix

Fixes `ERR_MODULE_NOT_FOUND` on Vercel by:
- Moving helpers under `api/_lib/`
- Using ESM-friendly imports with explicit `.js` extension:
  `import { rateLimit } from './_lib/rateLimit.js'`

Includes robust JSON parsing, tiny rate limit, and JSONL to `/tmp`.

Env vars:
- `TRACK_SALT` (required)
- `TRACK_RATE_LIMIT` (optional, default 60/5min)
