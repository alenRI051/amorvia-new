# Amorvia Mini-Pack v9.3 (layout + a11y + /api/track stub + /admin logs)

**Date:** 2025-09-21

This mini-pack contains:
- Toolbar buttons (High Contrast, Reset UI, Restart Act) and fixed stacking for characters vs. background.
- High-contrast CSS and UI reset on every page load (configurable).
- Client-side fix to ensure scenarios list sits under `Amorvia – Multiact Title`.
- `/api/track` stub (single file: `api/track.ts`) — avoids duplicate `.js/.ts` issue.
- Minimal `/admin/logs` page to visualize events produced by the tracker (works with the stub or with a real backend later).
- Service Worker cache-bust helper.

> Per project notes: This keeps `/api/track.ts` as the only file. When you wire a real endpoint, update `TRACK_ENDPOINT` in `public/js/track-client.js` or replace `api/track.ts` with backend logic.

## Files & where they go

Place/merge these into your repo root:

```
api/track.ts
admin/logs.html
public/css/amorvia-a11y.css
public/js/ui-toggles.js
public/js/track-client.js
public/js/sw-bust.js
public/index.toolbar-snippet/toolbar.html
```

### 1) Include toolbar in your main page(s)

Add (once) right after your `<body>` open tag (or in the top toolbar area):

```html
<!-- Amorvia toolbar (v9.3) -->
<div id="amorvia-toolbar" class="amorvia-toolbar">
  <button id="btn-high-contrast" type="button">High contrast</button>
  <button id="btn-reset-ui" type="button">Reset UI</button>
  <button id="btn-restart-act" type="button">Restart act</button>
</div>
```

Then include scripts/css near the end of `<body>` (order matters — toggles after client):

```html
<link rel="stylesheet" href="/public/css/amorvia-a11y.css" />
<script src="/public/js/sw-bust.js"></script>
<script src="/public/js/track-client.js"></script>
<script src="/public/js/ui-toggles.js" defer></script>
```

### 2) Ensure scenarios list sits under the title

The CSS fix in `amorvia-a11y.css` sets a safe stacking context and clears overlaps. If you have custom layout CSS, ensure:

```
#characters-layer { z-index: 2; position: absolute; bottom: 10px; }
#background-layer { z-index: 1; }
#title-and-list { position: relative; z-index: 3; }
```

Adjust the `bottom:` to taste.

### 3) Service Worker cache busting

If a SW is installed, call `window.amorviaBustSW()` after deploy (or use `?devcache=0` once).
Hard refresh (`Ctrl/Cmd+Shift+R`) still recommended in production.

### 4) /api/track stub

- GET: returns last 200 events (in-memory per instance).
- POST: accept JSON `{ type, payload, ts }`. It logs to console and stores in memory map by day.
- This is enough for local dev; for production, replace logic with real storage (KV/DB) or set `TRACK_ENDPOINT` to your backend URL and skip the stub.

### 5) /admin/logs

Visit `/admin/logs.html` while developing to see events live. It polls every 5s.

---

## Changelog v9.3
- Fix: characters always appear above background; scenarios list no longer hidden.
- Add: Top toolbar with High Contrast / Reset UI / Restart Act.
- Add: A11y high-contrast theme and focus outlines.
- Add: SW cache-bust helper.
- Add: Minimal tracking and admin logs viewer.
