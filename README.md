# Amorvia `/api/track` — Vercel Blob Logger

Durable logging to **Vercel Blob** (one JSON file per event).

## Setup
1. In Vercel → Storage → Blob: create a **Read-Write Token**.
2. Add env var in your project:
   - `BLOB_READ_WRITE_TOKEN` = the token
   - `TRACK_SALT` = random secret (hashing IPs)
   - (optional) `TRACK_RATE_LIMIT` = events per 5min window (default 60)
3. Deploy.

## How it stores data
- Each event is uploaded as a private blob:
  `events/YYYY-MM-DD/<ISO>-<rand>.json`
- Immutable object per event, avoids append issues.

## Listing / exporting later
You can list blobs by prefix (e.g., `events/2025-09-12`) using `@vercel/blob` `list()` API in a separate admin route to export CSV/JSONL when needed.
