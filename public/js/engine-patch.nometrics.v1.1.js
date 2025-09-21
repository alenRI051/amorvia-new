// engine-patch.nometrics.v1.1.js
// Remove legacy inline metrics like "trust40", "tension: 20", "childStress=15" from dialog output.
(function () {
  'use strict';

  // Match tokens with optional punctuation, allow 'child stress' variants, and optional <br> wrappers.
  const RX_INLINE = /(?:^|[\s>])(trust|tension|child\s*stress|childStress)\s*[:=]?\s*\d+\s*(?=<|[\s<]|$)/gi;

  function cleanText(s) {
    if (typeof s !== 'string') return s;
    // Strip inline tokens
    let out = s.replace(RX_INLINE, (m, g1, off, str) => {
      // Preserve leading separator if it's a tag boundary; otherwise remove entirely
      return m.startsWith('>') ? '>' : ' ';
    });
    // Collapse extra whitespace and repeated <br>
    out = out.replace(/(?:<br>\s*){2,}/gi, '<br>')
             .replace(/\s{2,}/g, ' ')
             .replace(/^\s+|\s+$/g, '');
    return out;
  }

  function wrapMethod(obj, name) {
    const fn = obj && obj[name];
    if (typeof fn !== 'function' || fn.__noMetricsWrapped) return;
    obj[name] = function (...args) {
      if (typeof args[0] === 'string') args[0] = cleanText(args[0]);
      if (typeof args[1] === 'string') args[1] = cleanText(args[1]);
      return fn.apply(this, args);
    };
    obj[name].__noMetricsWrapped = true;
  }

  function wrapEngine() {
    const eng = window.Amorvia || window.amorviaEngine;
    if (!eng) { setTimeout(wrapEngine, 200); return; }

    ['say','print','write','append','addLine','addDialog','appendDialog','renderDialog','showText','setScene','showScene']
      .forEach((name) => wrapMethod(eng, name));

    ['ui','view','dialog'].forEach((k) => eng[k] && [
      'say','print','write','append','addLine','addDialog','appendDialog','render','renderDialog','show'
    ].forEach((name) => wrapMethod(eng[k], name)));

    const dialog = document.getElementById('dialog');
    if (dialog) {
      const mo = new MutationObserver(() => {
        dialog.innerHTML = cleanText(dialog.innerHTML);
      });
      mo.observe(dialog, { childList:true, subtree:true });
    }
  }

  (function hookDomWriters() {
    const insertHTML = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function (pos, html) {
      if (this.id === 'dialog' && typeof html === 'string') {
        html = cleanText(html);
      }
      return insertHTML.call(this, pos, html);
    };
  })();

  (document.readyState === 'loading')
    ? document.addEventListener('DOMContentLoaded', wrapEngine)
    : wrapEngine();
})();