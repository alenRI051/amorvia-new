# Amorvia Toolbar: High Contrast + Reset UI

This drop-in pack adds two buttons to the top toolbar:
- **High Contrast** — toggles a high-contrast theme for accessibility.
- **Reset UI** — clears Amorvia UI preferences and reloads the page (fresh defaults).

> Default behavior: **High Contrast is OFF on every new page load** (no persistence),
even if a previous session enabled it.

## Files

```
/js/addons/toolbar-buttons.js
/js/addons/high-contrast-toggle.js
/js/addons/reset-ui.js
/public/css/high-contrast.css
```

## Quick Install

1) Copy the files into your project keeping the same paths:
```
/js/addons/toolbar-buttons.js
/js/addons/high-contrast-toggle.js
/js/addons/reset-ui.js
/public/css/high-contrast.css
```

2) Include the CSS in your HTML (usually in `index.html` or your main layout):
```html
<link rel="stylesheet" href="/public/css/high-contrast.css">
```

3) Include the scripts *after* your base UI loads (ideally near the end of `<body>` or after your app mounts):
```html
<script src="/js/addons/high-contrast-toggle.js"></script>
<script src="/js/addons/reset-ui.js"></script>
<script src="/js/addons/toolbar-buttons.js"></script>
```

No other wiring is required — the buttons will auto‑mount to an existing top toolbar if found, or create a small top bar placeholder.

## Notes

- **No persistence**: High contrast state is intentionally not stored. Each page load starts in normal mode.
- **Reset scope**: The Reset button clears keys beginning with `amorvia:` plus a few safe, common UI keys, then performs a hard reload with a cache‑bust.
- **Toolbar detection**: The script prefers to mount into an existing toolbar (`#topbar`, `.toolbar`, `header .toolbar`, `[data-amorvia-toolbar]`). If none found, it injects a minimal fixed header so you always see the buttons.
- **Service Worker**: Since you have a SW in production, the reload uses a query param to help bust cache. If needed, also do a manual hard refresh (Ctrl/Cmd+Shift+R).

## Customization

- To change which `localStorage` keys are cleared by Reset, edit the allowlist in `reset-ui.js`.
- To tweak styles, edit `public/css/high-contrast.css` and the small inline styles in `toolbar-buttons.js`.
- To rename the buttons, edit `toolbar-buttons.js` labels.

## Tested Selectors

The toolbar injector checks (in order):
- `#topbar`
- `.toolbar`
- `header .toolbar`
- `[data-amorvia-toolbar]`
- falls back to a minimal injected bar.

---

Made for the Amorvia project 💙