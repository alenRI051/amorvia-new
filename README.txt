Amorvia v2 loader patch — 20250822-191124

Files included:
- public/js/bootstrap.js     → ensures compat hook loads *after* app.v2.js
- public/js/app.v2.js        → hardens loadScenarioById with ensureGraph()

How to apply:
1) Replace your site's /public/js/bootstrap.js with this one, OR replicate the same import order.
2) Replace /public/js/app.v2.js with this one, OR copy the loadScenarioById function into your file.
3) Make sure /public/js/compat/v2-to-graph.js exists (from previous bundle).
4) Hard refresh once (Shift+Reload). If using a Service Worker, you can force update in console:
   const reg = await navigator.serviceWorker.getRegistration(); await reg?.update();
5) Test in console:
   typeof window.ensureGraphLoadById  // should be "function" (if the hook is present)
   await AmorviaV2.loadScenarioById('co-parenting-with-bipolar-partner');
