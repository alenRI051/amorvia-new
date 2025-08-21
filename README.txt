Amorvia — Tabs Re-parent Guard Patch — 2025-08-21

This version keeps the anchor, inserts tabs AFTER it, and if tabs already exist it moves them under the anchor (no duplicates).

Install
1) Replace /public/js/addons/extras-tabs.js with the file in this zip.
2) Reload once. If the SW caches, import with '?t='+Date.now() one time.

Checks (Console)
  localStorage.getItem('amorvia:mode');            // "v2"
  !!document.getElementById('scenarioListV2');     // true
  !!document.querySelector('#labsTabs');           // true
  document.getElementById('scenarioPicker').nextElementSibling?.id === 'scenarioListV2' // anchor placement
  document.getElementById('scenarioListV2').nextElementSibling?.classList.contains('av-wrap') // tabs right after anchor
