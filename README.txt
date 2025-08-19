Amorvia Icons Pack — 2025-08-19

This fixes the Manifest icon error by providing valid PNGs.

Files (drop into your repo):
- public/icons/icon-192.png
- public/icons/icon-512.png
- public/icons/icon-192-maskable.png
- public/icons/icon-512-maskable.png
- manifest.patch.json (example manifest content for the 'icons' section)

How to apply:
1) Copy the PNGs into /public/icons/ in your project.
2) Ensure your manifest.json has an 'icons' array like in manifest.patch.json.
3) In index.html, keep: <link rel="manifest" href="/manifest.json">
4) Deploy. Then test in DevTools → Application → Manifest:
   - The icons should preview without errors.
   - No 'Download error or resource isn't a valid image' messages.

Tip: Safari/Apple touch icon (optional)
<link rel="apple-touch-icon" href="/icons/icon-192.png">
