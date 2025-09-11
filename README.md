# Amorvia A11y Toolbar — Extras Pack

This pack adds:
1) **Keyboard shortcuts** (Alt+H for High Contrast, Alt+R for Reset UI with confirm)
2) **Custom events** you can hook to `/api/track`:
   - `amorvia:hc-toggled` → `{ on: boolean }`
   - `amorvia:reset`

## Files

```
/js/addons/high-contrast-toggle.js   (updated to dispatch event)
/js/addons/reset-ui.js               (updated to dispatch event)
/js/addons/toolbar-buttons.js        (same as previous bundle)
/js/addons/shortcuts-a11y.js         (NEW Alt+H / Alt+R)
/public/css/high-contrast.css        (same as previous bundle)
/docs/track-hooks.example.js         (example listeners)
```

## Install

1) Copy these files to your project, preserving paths.
2) Add **after** your existing addons (place near end of `<body>`):
```html
<script src="/js/addons/high-contrast-toggle.js"></script>
<script src="/js/addons/reset-ui.js"></script>
<script src="/js/addons/toolbar-buttons.js"></script>
<script src="/js/addons/shortcuts-a11y.js"></script>
```
3) (Optional) Wire tracking by importing `/docs/track-hooks.example.js` or copying its contents into your app init.

## Notes

- Shortcuts ignore keystrokes when focus is in inputs/textarea/contentEditable.
- Reset UI asks `confirm()` before running via the shortcut; toolbar button remains one-click.
- Events are dispatched on `document`, so listeners can be registered anywhere.