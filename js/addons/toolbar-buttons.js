// Inject "High Contrast" and "Reset UI" buttons into the top toolbar.
(function() {
  function findToolbar() {
    const selectors = ['#topbar','.toolbar','header .toolbar','[data-amorvia-toolbar]'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function ensureFallbackBar() {
    let bar = document.querySelector('.amorvia-a11y-toolbar');
    if (bar) return bar;
    bar = document.createElement('div');
    bar.className = 'amorvia-a11y-toolbar';
    Object.assign(bar.style, {
      position: 'fixed', top: '8px', right: '8px', zIndex: 99999,
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', background: 'rgba(20,20,20,0.85)',
      border: '1px solid #666', borderRadius: '12px',
      backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
    });
    document.body.appendChild(bar);
    return bar;
  }

  function makeButton(label, onClick, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.title = title || label;
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function mountButtons(into) {
    const hcBtn = makeButton('High Contrast', () => { window.amorviaHighContrast && window.amorviaHighContrast.toggle(); }, 'Toggle high-contrast mode (does not persist across reloads)');
    const resetBtn = makeButton('Reset UI', () => { window.amorviaResetUI && window.amorviaResetUI.run(); }, 'Clear UI preferences and reload with cache-bust');

    const container = document.createElement('div');
    container.style.display = 'flex'; container.style.alignItems = 'center'; container.style.gap = '8px';
    container.appendChild(hcBtn); container.appendChild(resetBtn);

    if (into !== document.body) {
      const wrapper = document.createElement('div');
      wrapper.style.marginLeft = 'auto';
      wrapper.appendChild(container);
      into.appendChild(wrapper);
    } else {
      into.appendChild(container);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toolbar = findToolbar();
    if (toolbar) { mountButtons(toolbar); } else { mountButtons(ensureFallbackBar()); }
  });
})();