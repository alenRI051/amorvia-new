Amorvia — Character Preloads + CLS Tweaks Patch
-----------------------------------------------

This patch:
- Preloads the two character SVGs so they start downloading immediately.
- Sets default `src` on the left/right character images (no late pop-in).
- Adds optional CLS tweaks via `css/cls-tweaks.css` to reserve space and stabilize UI.

Apply:
1) Replace `/public/index.html` with the one in this patch (or merge the <link rel="preload"> and default src changes).
2) Add `/public/css/cls-tweaks.css` and keep the `<link>` in the <head> (already included in this index.html).
3) Deploy, then re-run Lighthouse on https://amorvia.eu/.

Notes:
- The selects still control character art; the defaults match the initial <img src>, so there’s no mismatch.
- If you later change default characters, update both the <select> values and the two default <img src> paths.
