Amorvia A11y 100 Pack
=====================
Files:
  - public/css/a11y-fixes.css       (contrast, focus, skip-link visibility)
  - public/js/a11y-autolabel.js     (landmarks, aria labels, alt text)

How to apply:
  1) Unzip into your repo root:
     unzip -o amorvia-a11y-100-pack.zip -d .

  2) In public/index.html, include the CSS and JS:
     <link rel="stylesheet" href="/css/a11y-fixes.css"/>
     <script src="/js/a11y-autolabel.js" defer></script>

  3) Commit & deploy:
     git add public/css/a11y-fixes.css public/js/a11y-autolabel.js public/index.html
     git commit -m "a11y: contrast + focus styles, aria helpers"
     git pull --rebase origin main
     git push

  4) Re-run Lighthouse. Accessibility should tick up to 100.
