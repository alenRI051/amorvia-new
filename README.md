\
# Amorvia Offline Pack (Service Worker)

This pack adds **offline caching** to your static site on Vercel.

## Files
- `/service-worker.js` — caching logic
- `/sw-register.js` — small helper to register the SW
- `/offline.html` — fallback page when completely offline

## Integrate

1) **Place files at the web root** (same level as `/index.html`). Your tree should contain:
```
index.html
service-worker.js
sw-register.js
offline.html
css/
js/
assets/
manifest.json
```
2) **Register the SW** in your `index.html` just before `</body>`:
```html
<script src="/sw-register.js"></script>
```
(If you prefer inline, you can paste its contents directly.)

3) **Ensure your manifest scope/start_url** cover root:
```json
{
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone"
}
```

4) **Update `vercel.json` headers** to avoid caching the SW file aggressively and set manifest type:
```json
{
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json; charset=utf-8" }
      ]
    }
  ]
}
```
Merge those with your existing `headers` array.

5) **Tune the precache list** in `service-worker.js` (`PRECACHE_URLS`) if your file names differ.

## How it works
- **Navigations**: network-first with cache fallback to `index.html` or `offline.html`.
- **Static assets** (`/css`, `/js`, `/assets`, `/icons`, manifest, favicon): cache-first.
- **JSON/data**: network-first for freshness, cache fallback when offline.
- Skips `/api/health` and third‑party origins.

Bump `SW_VERSION` to invalidate caches after big releases.
