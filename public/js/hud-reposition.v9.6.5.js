// hud-reposition.v9.6.5.js
// Moves #hud just under the title row inside the dialog panel and keeps it there.
(function(){
  'use strict';
  const $ = (s, el=document)=> el.querySelector(s);

  function insertHud(){
    const dialogPanel = document.querySelector('.panel.dialog');
    const hud = document.getElementById('hud');
    if (!dialogPanel || !hud) return false;

    // Find the row that contains the badge + scene title (first .row in dialog panel)
    const titleRow = dialogPanel.querySelector('.row');
    if (!titleRow) return false;

    // Desired position: immediately after titleRow
    const next = titleRow.nextElementSibling;
    if (next !== hud) {
      dialogPanel.insertBefore(hud, next || null);
    }
    // Make sure hud is visible and not clipped
    hud.style.position = 'relative';
    hud.style.zIndex = '10';
    return true;
  }

  // Observe the dialog panel so if engine rewrites, we reinsert HUD
  function keepHudInPlace(){
    const dialogPanel = document.querySelector('.panel.dialog');
    if (!dialogPanel) { setTimeout(keepHudInPlace, 250); return; }

    // Initial insert
    insertHud();

    const mo = new MutationObserver(() => {
      // If HUD is missing or moved, put it back
      const hud = document.getElementById('hud');
      if (!hud || hud.parentElement !== dialogPanel) {
        insertHud();
      } else {
        // Ensure it sits right after the title row
        const titleRow = dialogPanel.querySelector('.row');
        if (titleRow && titleRow.nextElementSibling !== hud) insertHud();
      }
    });
    mo.observe(dialogPanel, { childList:true, subtree:false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', keepHudInPlace);
  } else {
    keepHudInPlace();
  }
})();