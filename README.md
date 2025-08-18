# Lighthouse CI (Desktop) for Amorvia

This workflow runs Lighthouse against your production site and **always appends `?nosw=1`** to avoid Service Worker effects.
It produces **JSON + HTML** reports as a build artifact.

## What's included
- `.github/workflows/lighthouse.yml` — triggers on push to `main`, on PRs, nightly, and manual dispatch.
- `tools/run-lighthouse.sh` — runs Lighthouse via `npx` and saves reports to `./lighthouse/report.{json,html}`.

## Change test URL
By default, it tests `https://amorvia.eu/?nosw=1`. To test a different URL:
- Edit the `SITE_URL` env in the workflow file, or
- Override in a manual run by changing the `SITE_URL` env before dispatching.

## Local run
You can also run locally (Chrome required):
```bash
bash tools/run-lighthouse.sh
# Reports in ./lighthouse/
```

## Notes
- `?nosw=1` assumes your app **skips SW registration** when this param is present (or when `navigator.webdriver` is true). If you haven’t added that yet, I can provide a tiny patch.
- The workflow uses `npx` so you don't need to add devDependencies.
