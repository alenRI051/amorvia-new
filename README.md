# Amorvia `/api/track` — Patched Endpoint

Patched version with:
- Safe JSON body parsing
- Crypto import fix (`import * as crypto from 'crypto'`)
- Logger write wrapped in try/catch (prevents crash)
- Returns 400 for invalid payloads

Deploy on Vercel by dropping into repo root.

Env vars:
- `TRACK_SALT` (required)
- `TRACK_RATE_LIMIT` (optional, default 60/5min)

Files:
- `api/track.ts`
- `lib/rateLimit.ts`
- `lib/logger.ts`
- `package.json`
- `tsconfig.json`
