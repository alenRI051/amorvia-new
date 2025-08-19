Amorvia — Themed Tabs (hover/active) — 2025-08-19

Files:
- public/js/addons/extras-tabs.js  (themed, no inline styles, role=tablist tabs)
- public/css/addons.css            (styles for tabs, list items, toggle)

Install:
1) Copy these files into your project, preserving paths:
   - /public/js/addons/extras-tabs.js
   - /public/css/addons.css
2) Ensure your bootstrap loads the addon for v2 (you already have this):
   await import('/js/addons/extras-tabs.js')
   (The addon itself injects a <link rel="stylesheet" href="/css/addons.css"> so you don't need to edit HTML.)
3) Deploy and reload once (auto-refresh SW).

Notes:
- Tabs use ARIA roles and support keyboard navigation (← → / ↑ ↓).
- Focus states respect your global :focus-visible.
- Colors tuned for your dark theme (#0f172a / #0f172a family).
