Amorvia — SW Version Lock Patch — 2025-08-21

Goal
- Use ONE version string for: service worker cache keys AND JS dynamic imports.
- Ensures normal reload (no Ctrl+F5) picks up new tabs/UI immediately.

Files
- /public/version.json                      (single source of truth)
- /public/sw-register.js                    (registers SW with ?v=version, sets window.__AMORVIA_VERSION__)
- /public/service-worker.js                 (reads version from scriptURL, versioned caches, auto-activate)
- /public/js/bootstrap.js                   (uses same version for dynamic imports)

Install
1) Copy files into your project, preserving paths (replace existing sw-register.js, service-worker.js, bootstrap.js).
2) Keep <script src="/sw-register.js" defer></script> in your HTML (already present).
3) Deploy.

How it works
- sw-register.js fetches /version.json, exposes window.__AMORVIA_VERSION__, registers /service-worker.js?v=<ver>.
- The SW derives its VERSION from scriptURL (?v=...), names caches with that version, cleans old caches, and claims clients.
- bootstrap.js imports all dynamic JS with ?v=<same ver> so URLs change alongside SW.

Update flow
- To roll a new release, bump "version" in /public/version.json (e.g., "beta-2025-08-21-02").
- Deploy. On the next visit, the SW and dynamic imports use the new version; old caches are dropped automatically.

Sanity checks (Console)
  // After page load:
  window.__AMORVIA_VERSION__                     // -> "beta-2025-08-21-01"
  navigator.serviceWorker.controller !== null    // -> true (controlled by SW)
  caches.keys().then(k=>console.log(k))          // -> ["amorvia-static-...", "amorvia-rt-..."]
