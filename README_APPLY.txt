Amorvia Final Polish Pack
=========================

Includes:
- vercel.json: tuned cache headers (immutable for assets, no-cache for index/manifest/sw)
- manifest.json: cleaned with any+maskable icons
- docs/head-snippet.html: extra meta tags for SEO/social (og:*, twitter)

How to apply:
unzip -o amorvia-final-polish.zip -d .

git add vercel.json public/manifest.json docs/head-snippet.html
git commit -m "polish: final vercel headers, manifest icons, seo/social meta"
git pull --rebase origin main
git push

Then add the snippet in <head> of index.html where you want OG/Twitter meta.
