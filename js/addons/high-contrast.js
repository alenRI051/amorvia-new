// /js/addons/high-contrast.js — toggleable, persistent high-contrast mode
const KEY = 'amorvia:contrast';
const btn = document.getElementById('contrastToggle');
const root = document.documentElement;

function apply(state) {
  const on = state === 'high';
  root.classList.toggle('hc', on);
  if (btn) btn.setAttribute('aria-pressed', String(on));
}

function getInitial() {
  // persisted setting wins; otherwise honor user preference if available
  const saved = localStorage.getItem(KEY);
  if (saved) return saved;
  const prefers = window.matchMedia && (window.matchMedia('(prefers-contrast: more)').matches || window.matchMedia('(prefers-contrast: high)').matches);
  return prefers ? 'high' : 'normal';
}

function toggle() {
  const next = root.classList.contains('hc') ? 'normal' : 'high';
  localStorage.setItem(KEY, next);
  apply(next);
}

apply(getInitial());

if (btn) btn.addEventListener('click', toggle);
window.addEventListener('keydown', (e) => {
  if (e.altKey && (e.key === 'h' || e.key === 'H')) {
    e.preventDefault();
    toggle();
  }
});
