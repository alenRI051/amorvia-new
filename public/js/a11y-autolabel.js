// a11y-autolabel.js — runtime helpers to satisfy Lighthouse A11y checks
(function(){
  const byId = id => document.getElementById(id);
  const ensureRole = (el, role) => el && !el.getAttribute('role') && el.setAttribute('role', role);
  const label = (el, text) => el && !el.getAttribute('aria-label') && el.setAttribute('aria-label', text);

  window.addEventListener('DOMContentLoaded', () => {
    // Main landmarks
    const main = document.getElementById('main');
    ensureRole(main, 'main');

    const stage = document.querySelector('.stage');
    if (stage) {
      stage.setAttribute('role', 'region');
      stage.setAttribute('aria-labelledby', 'sceneTitle');
    }

    // Images alt text
    const left = byId('leftImg'); if (left && !left.alt) left.alt = 'Left character';
    const right = byId('rightImg'); if (right && !right.alt) right.alt = 'Right character';
    const bg = byId('bgImg'); if (bg && bg.alt === '') bg.alt = 'Background';

    // Controls labels fallbacks (in case labels missing or detached by future edits)
    const map = [
      ['bgSelect', 'Background selection'],
      ['leftSelect', 'Left character'],
      ['rightSelect', 'Right character'],
      ['modeSelect', 'Mode switcher'],
      ['scenarioPicker', 'Scenario picker']
    ];
    map.forEach(([id, text]) => label(byId(id), text));

    // Ensure dialog is live region
    const dialog = byId('dialog');
    if (dialog && !dialog.getAttribute('aria-live')) dialog.setAttribute('aria-live','polite');
  }, { once:true });
})();
