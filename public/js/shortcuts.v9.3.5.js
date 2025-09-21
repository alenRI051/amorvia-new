
// shortcuts.v9.3.5.js — Keyboard shortcuts (H, R, Shift+R)
(function(){
  function onKey(e){
    const tag = (e.target && e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.isComposing) return;
    if (e.key === 'h' || e.key === 'H') {
      document.getElementById('highContrastBtn')?.click();
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') {
      if (e.shiftKey) {
        document.getElementById('resetUiBtn')?.click();
      } else {
        document.getElementById('restartAct')?.click();
      }
      e.preventDefault();
    }
  }
  window.addEventListener('keydown', onKey);
})();
