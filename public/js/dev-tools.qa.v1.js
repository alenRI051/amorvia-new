
/*! Amorvia Dev Tools QA v1.0
 *  - Alt+D → print stage/canvas diagnostics
 *  - Alt+R → re-apply canvas cap (helpful after CSS hot reloads)
 *  - window.AmorviaQA.print() and .enforce() are available
 */
(function () {
  function vh() {
    return Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
  }

  function enforce() {
    const canvas = document.querySelector('.stage .canvas');
    if (!canvas) return false;
    const hVar = getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim();
    const hPx = parseFloat(hVar) || 0;
    const vhCap = Math.floor(vh() * 0.50); // 50vh
    const cap = Math.min(hPx || 9999, vhCap || 9999);
    canvas.style.setProperty('height', cap + 'px', 'important');
    canvas.style.setProperty('max-height', cap + 'px', 'important');
    canvas.style.setProperty('min-height', cap + 'px', 'important');
    canvas.style.setProperty('overflow', 'hidden', 'important');
    return true;
  }

  function print() {
    const stage  = document.querySelector('.stage');
    const canvas = document.querySelector('.stage .canvas');
    if (!canvas) { console.warn('[AmorviaQA] Canvas not found.'); return false; }
    const cs = getComputedStyle(canvas);
    console.table({
      ts: new Date().toLocaleTimeString(),
      viewportH: Math.max(innerHeight, document.documentElement.clientHeight),
      '--stage-max-h': getComputedStyle(document.documentElement).getPropertyValue('--stage-max-h').trim(),
      'inline.height': canvas.style.height || '(none)',
      'inline.maxHeight': canvas.style.maxHeight || '(none)',
      'inline.minHeight': canvas.style.minHeight || '(none)',
      'cs.height': cs.height,
      'cs.minHeight': cs.minHeight,
      'cs.maxHeight': cs.maxHeight,
      'clientHeight': canvas.clientHeight,
      'stage.minHeight': stage?.style.minHeight || '(none)',
    });
    return true;
  }

  window.AmorviaQA = { print, enforce };

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyD') {
      e.preventDefault(); print();
    } else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR') {
      e.preventDefault(); enforce(); print();
    }
  });

  // Auto announce
  setTimeout(() => {
    console.log('%c[AmorviaQA] Ready. Alt+D = diagnostics, Alt+R = re-apply cap', 'color:#10b981');
  }, 0);
})();
