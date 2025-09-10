// /js/addons/reset-ui.js — clear UI prefs & reload (Alt+R)
const KEYS = [
  'amorvia:mode',
  'amorvia:contrast',
  // add any additional keys you'd like to clear by default:
  'amorvia:lastScenario',
];

function resetUi(confirmFirst = true) {
  const ok = confirmFirst ? window.confirm('Reset UI preferences and reload?') : true;
  if (!ok) return;
  KEYS.forEach(k => localStorage.removeItem(k));
  // also clear any keys that start with amorvia:
  Object.keys(localStorage).forEach(k => { if (k.startsWith('amorvia:')) localStorage.removeItem(k); });
  location.reload();
}

const btn = document.getElementById('resetUiBtn');
if (btn) btn.addEventListener('click', () => resetUi(true));

window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'r' || e.key === 'R')) {
    e.preventDefault();
    resetUi(false);
  }
});

// expose for debugging
window.AmorviaResetUI = resetUi;
