Amorvia root bundle — offline-ready

Files included:
- index.html (SW registration fixed & root-relative URLs)
- service-worker.js (offline caching)
- sw-register.js (clean UTF-8)
- offline.html (fallback)
- vercel.json (headers merged)

How to use:
1) Upload/replace these files at the **root** of your repo (same level as index.html).
2) Deploy to Vercel.
3) In Chrome DevTools → Application → Service Workers: unregister old SW, Clear storage, reload.
4) Test offline: Network tab → Offline → refresh; UI should still load (or offline.html if first load).
