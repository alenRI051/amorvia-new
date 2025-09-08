Amorvia SEO + Accessibility Patch
=================================

- Adds <html lang="en">, meta description + keywords
- Adds sr-only labels for form controls
- Ensures img alt text present
- Adds .sr-only CSS utility

How to apply:
unzip -o amorvia-seo-a11y-patch.zip -d .
git add public/index.html public/css/styles-hotfix.css
git commit -m "polish(a11y+seo): labels, lang, meta, sr-only"
git pull --rebase origin main
git push
