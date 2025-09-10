Amorvia High-Contrast Toggle Bundle
===================================
Generated: 2025-09-10T19:26:51.415524Z

This bundle adds a High Contrast toggle button and persistent mode:
- Updates index.html (adds button)
- Adds /js/addons/high-contrast.js
- Extends /css/a11y-fixes.css with .hc rules

Apply:
unzip -o amorvia-high-contrast-toggle-bundle.zip -d .
git add index.html js/addons/high-contrast.js css/a11y-fixes.css
git commit -m "feat(a11y): High Contrast toggle (persistent via localStorage)"
git push

Usage:
- Click "High Contrast" in the toolbar or press Alt+H to toggle.
- Preference is saved in localStorage (key: amorvia:contrast).
