// High Contrast toggle (no persistence).
// Default is OFF on every load.
(function() {
  const HC_CLASS = 'hc';

  function setHighContrast(enabled) {
    const body = document.body;
    if (!body) return;
    body.classList.toggle(HC_CLASS, !!enabled);
    // Deliberately DO NOT store any state.
  }

  // expose globally for toolbar-buttons.js
  window.amorviaHighContrast = {
    toggle() { document.body.classList.toggle(HC_CLASS); },
    on() { setHighContrast(true); },
    off() { setHighContrast(false); },
    isOn() { return document.body.classList.contains(HC_CLASS); }
  };

  // ensure OFF at startup (explicit)
  document.addEventListener('DOMContentLoaded', () => setHighContrast(false));
})();