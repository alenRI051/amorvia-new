/* Amorvia patch: scenario-entry-fix.js
 * Purpose: Ensure scenarios have a resolvable entry node across loaders.
 * Works with engines expecting top-level start/startNode/entryNode
 * and with engines using startAct + act.start.
 */
(function () {
  function ensureEntryNode(s) {
    if (!s || !Array.isArray(s.acts)) return s;

    // Ensure startAct exists
    if (!s.startAct && s.acts.length) {
      s.startAct = s.acts[0]?.id;
    }

    // Find target act
    let act = s.acts.find((a) => a.id === s.startAct);
    if (!act) act = s.acts[0];

    // Ensure act.start exists
    if (act && !act.start) {
      const keys = act.nodes && typeof act.nodes === 'object' ? Object.keys(act.nodes) : [];
      if (keys.length) act.start = keys[0];
    }

    // Derive candidate start node
    const candidate = s.start || (act && act.start);
    if (candidate) {
      s.start = candidate;
      s.startNode = candidate;
      s.entryNode = candidate;
    }

    return s;
  }

  function wrapLoadScenario(obj, key) {
    const fn = obj && obj[key];
    if (typeof fn !== 'function') return;
    obj[key] = function (...args) {
      const res = fn.apply(this, args);
      if (res && typeof res.then === 'function') {
        return res.then((sc) => ensureEntryNode(sc));
      }
      return ensureEntryNode(res);
    };
  }

  function init() {
    try {
      // Patch global loadScenario if present
      if (window.loadScenario) {
        wrapLoadScenario(window, 'loadScenario');
      }

      // Patch ScenarioEngine.prototype.load if present
      if (window.ScenarioEngine && window.ScenarioEngine.prototype && typeof window.ScenarioEngine.prototype.load === 'function') {
        wrapLoadScenario(window.ScenarioEngine.prototype, 'load');
      }

      // As an extra safety net, patch startScenario if app calls it directly with a scenario object
      if (typeof window.startScenario === 'function') {
        const originalStart = window.startScenario;
        window.startScenario = function (...args) {
          if (args[0] && typeof args[0] === 'object') {
            ensureEntryNode(args[0]);
          }
          return originalStart.apply(this, args);
        };
      }

      window.__amorviaEnsureEntryNode = ensureEntryNode; // expose for diagnostics
      console.info('[AmorviaPatch] scenario-entry-fix loaded');
    } catch (e) {
      console.warn('[AmorviaPatch] scenario-entry-fix failed to initialize', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
