// Keyboard shortcuts: Alt+H (toggle HC), Alt+R (Reset UI with confirm).
(function () {
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing) return;

    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const key = (e.key || '').toLowerCase();
      if (key === 'h' && window.amorviaHighContrast) {
        e.preventDefault();
        window.amorviaHighContrast.toggle();
      } else if (key === 'r' && window.amorviaResetUI) {
        e.preventDefault();
        if (confirm('Reset UI now? This will clear Amorvia UI prefs and reload.')) {
          window.amorviaResetUI.run();
        }
      }
    }
  });
})();