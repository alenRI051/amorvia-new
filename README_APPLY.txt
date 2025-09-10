Amorvia Reset UI Bundle
=======================
Generated: 2025-09-10T19:33:23.310192Z

Adds a toolbar button and Alt+R shortcut to clear UI prefs and reload.

Files:
- index.html (adds "Reset UI" button and includes reset-ui.js)
- js/addons/reset-ui.js

Apply:
unzip -o amorvia-reset-ui-bundle.zip -d .
git add index.html js/addons/reset-ui.js
git commit -m "feat(a11y): add Reset UI button (clears localStorage, Alt+R)"
git push
