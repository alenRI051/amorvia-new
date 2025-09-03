Amorvia Repo Cleanup Patch
==========================

This patch removes duplicate files under `public/` (and extra SW copies) so the root paths are the single source of truth.

What it does
------------
- Deletes **public/** duplicates for HTML, CSS, JS, assets, data, configs, and SW.
- Keeps **root** copies (e.g., /index.html, /css, /js, /assets, /data, /sw.js, /manifest.json, /vercel.json).
- Removes extra `sw-register.js` copies so only the **root** one remains (as referenced in index.html).

How to apply
------------
Run from the repo root:

  1) Create a safety branch and tag (optional but recommended)
     git checkout -b chore/cleanup-public-dupes
     git tag pre-cleanup-$(date +%Y%m%d-%H%M%S)

  2) Run the cleanup script
     bash tools/apply-cleanup.sh

  3) Review the diff
     git status
     git diff --staged

  4) Commit & push
     git commit -m "chore: consolidate on root; remove public/* duplicates; keep single SW + configs"
     git push -u origin chore/cleanup-public-dupes

If something looks off:
-----------------------
- Restore with the tag:
  git reset --hard pre-cleanup-YYYYMMDD-HHMMSS

Notes
-----
- The script is **idempotent** and checks file presence before deleting.
- It only removes files that were identified as duplicates in your audit.
- It won’t touch any files that exist only in `public/` without a root counterpart.
