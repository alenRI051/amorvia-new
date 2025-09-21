# Amorvia Mini-Pack v9.3.4

**Date:** 2025-09-21

Refined layout to match the screenshot issues:
- Title bar with **High contrast** + **Reset UI** aligned to the right.
- Scenario **dropdown + Restart Act** in one row, scenario list below, all **under the title**.
- Proper spacing before the stage; characters remain above background.

Included:
- `index.html` (integrated topBar + scenario block; removed old duplicate button wiring)
- `css/styles.css` (layering, spacing, high-contrast)
- `js/ui-toggles.v9.3.4.js` (contrast/reset/restart with fallbacks)

How to deploy:
1) Drop files into web root and overwrite.
2) Remove legacy includes that duplicate contrast/toolbar handling.
3) If caching persists, hard refresh or bust SW.
