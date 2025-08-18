Amorvia — Upgrade Pack (update toast, iOS icon, precache scaffold)

Files:
- public/sw-register.js      → shows "new version available" reload prompt
- public/service-worker.js    → optional SCENES precache list
- public/robots.txt, public/sitemap.xml (optional)
- index-head-patch.html       → snippet to paste inside <head>

Apply:
1) Replace /public/sw-register.js and /public/service-worker.js.
2) Add this inside <head> of /public/index.html:
   <link rel="apple-touch-icon" href="/icons/icon-192.png">
3) (Optional) Keep robots.txt & sitemap.xml.
4) (Optional) Precache known scenes: edit SCENES in service-worker.js and bump SW_VERSION.
Then redeploy and hard-reload (unregister old SW + clear storage).

