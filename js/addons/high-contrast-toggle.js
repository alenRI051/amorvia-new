// High Contrast toggle (no persistence).
// Now dispatches 'amorvia:hc-toggled' event on changes.
(function() {
  const HC_CLASS = 'hc';

  function setHighContrast(enabled) {
    const body = document.body;
    if (!body) return;
    const prev = body.classList.contains(HC_CLASS);
    body.classList.toggle(HC_CLASS, !!enabled);
    const now = body.classList.contains(HC_CLASS);
    if (prev !== now) {
      document.dispatchEvent(new CustomEvent('amorvia:hc-toggled', { detail: { on: now } }));
    }
  }

  // expose globally for toolbar-buttons.js and shortcuts
  window.amorviaHighContrast = {
    toggle() {
      const body = document.body;
      if (!body) return;
      const next = !body.classList.contains(HC_CLASS);
      setHighContrast(next);
    },
    on() { setHighContrast(true); },
    off() { setHighContrast(false); },
    isOn() { return document.body.classList.contains(HC_CLASS); }
  };

  // ensure OFF at startup (explicit)
  document.addEventListener('DOMContentLoaded', () => setHighContrast(false));
})();