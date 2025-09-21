
(() => {
  const byText = (label) =>
    [...document.querySelectorAll('button, [role="button"]')]
      .find(b => (b.textContent || '').trim().toLowerCase() === label.toLowerCase());

  const hcBtn = byText('High Contrast') || document.getElementById('hcBtn');
  if (hcBtn && !hcBtn.__hcBound) {
    hcBtn.__hcBound = true;
    hcBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('amorvia:hc-toggled', { detail: { toggle: true } }));
      document.documentElement.classList.toggle('high-contrast');
    });
  }

  const restartBtn = document.getElementById('restartAct') || byText('Restart Act');
  if (restartBtn && !restartBtn.__restartBound) {
    restartBtn.__restartBound = true;
    restartBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('amorvia:restart-act'));
      const hud = document.getElementById('hud');
      if (hud && !hud.__touched) hud.textContent = '';
    });
  }
})();
