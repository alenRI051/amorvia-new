Amorvia — PUBLIC static bundle (Vercel)

Move your existing **css/**, **js/**, and **assets/** into **public/**.

Vercel Project Settings → Build & Development:
- Framework preset: Other (Static)
- Build Command: (empty)
- Output Directory: public
- Install Command: (empty)

After deploy:
- DevTools → Application → Service Workers: Unregister old, Clear storage, reload.
- Test Offline: Network → Offline → refresh.
