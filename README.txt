Amorvia — Performance Patch
===========================

What changed
- Background is now a real <img> (`#bgImg`) so the browser can treat it as LCP and prioritize it.
- Preload for the hero image with `fetchpriority="high"`.
- Async stylesheet load to reduce render-blocking (noscript fallback kept).
- Bootstrap updated to set `bgImg.src` and warm `/data/index.json`.

How to apply
1) Replace your `/public/index.html` with the one in this patch (or merge the <img> + preload changes).
2) Replace `/public/js/bootstrap.js`.
3) Deploy.
4) Run Lighthouse against **https://amorvia.eu/** (avoid the `www.` redirect).

Optional
- Optimize `/public/assets/backgrounds/room.svg` with SVGO for a little extra win.
- If you run Lighthouse in CI, append `?nosw=1` to avoid SW noise.

