// engine-patch.nometrics.v1.js
// Purpose: stop legacy "trust/tension/childStress" text from ever being written to #dialog.
(function () {
  'use strict';

  const RX_INLINE = /(?:trust|tension|child\s*stress|childStress)\s*[:=]\s*\d+/gi;

  const cleanText = (s) => typeof s === 'string'
    ? s.replace(RX_INLINE, '').replace(/(?:<br>\s*){2,}/g, '<br>')
    : s;

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