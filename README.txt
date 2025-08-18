Amorvia UI Patch

This index.html guarantees all required DOM elements exist for both modes:
- v1: #search, #scenarioList, #prevBtn, #nextBtn
- v2: #scenarioPicker, #restartAct, #hud, #choices
and shared elements: #bgImg, #leftImg, #rightImg, #actBadge, #sceneTitle, #dialog, selectors.

How to apply:
1) Copy public/index.html and public/css/ui.patch.css into your repo (preserve paths).
2) Ensure /js/bootstrap.js is the "clean" relative-import version (no /js/js path).
3) Bypass the service worker once (Application -> Bypass for network) and hard-reload.
4) Switch modes with the Mode select and confirm:
   - v2 shows HUD meters and choices
   - v1 shows list with Prev/Next
