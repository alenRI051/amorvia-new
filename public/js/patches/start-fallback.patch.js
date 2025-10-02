/* Amorvia patch: start-fallback.patch.js
 * Purpose: If a scenario throws "no entry node", reconstruct a valid entry
 * from startAct/acts[*].start (or first node) and retry once.
 */
(function () {
  function ensureEntryNode(s) {
    if (!s || !Array.isArray(s.acts)) return s;

    // Ensure startAct
    if (!s.startAct && s.acts.length) s.startAct = s.acts[0].id;

    // Find act
    let act = s.acts.find(a => a.id === s.startAct) || s.acts[0];

    // Ensure act.start
    if (act && !act.start) {
      const keys = act.nodes && typeof act.nodes === 'object' ? Object.keys(act.nodes) : [];
      if (keys.length) act.start = keys[0];
    }

    const candidate = s.start || (act && act.start);
    if (candidate) {
      s.start = candidate;
      s.startNode = candidate;
      s.entryNode = candidate;
    }
    return s;
  }

  // Patch a function on an object to post-process scenario before start
  function wrapStart(obj, key) {
    const fn = obj && obj[key];
    if (typeof fn !== 'function') return false;

    obj[key] = async function (...args) {
      try {
        return await fn.apply(this, args);
      } catch (e) {
        // Only retry on entry-related errors
        const msg = (e && e.message) ? e.message.toLowerCase() : '';
        if (!/no entry node|entry|start node/.test(msg)) throw e;

        // Try to extract the scenario object if it was passed; otherwise pull last loaded
        let scenario = args[0] && typeof args[0] === 'object' ? args[0] : (window.__lastLoadedScenario || null);
        if (!scenario && this && this.scenario) scenario = this.scenario;

        if (scenario) {
          console.warn('[AmorviaPatch] Retrying start with reconstructed entry…');
          ensureEntryNode(scenario);
          // second attempt
          return await fn.apply(this, args);
        }
        throw e;
      }
    };
    return true;
  }

  function init() {
    // Try patching common surfaces
    let patched = false;

    // 1) App-level start function (if exposed)
    if (wrapStart(window, 'startScenario')) patched = true;

    // 2) ScenarioEngine instance/prototype methods
    if (window.ScenarioEngine && window.ScenarioEngine.prototype) {
      patched = wrapStart(window.ScenarioEngine.prototype, 'start') || patched;
      patched = wrapStart(window.ScenarioEngine.prototype, 'startScenario') || patched;
      // Capture last loaded scenario for retry
      const origLoad = window.ScenarioEngine.prototype.load;
      if (typeof origLoad === 'function') {
        window.ScenarioEngine.prototype.load = async function (...args) {
          const s = await origLoad.apply(this, args);
          window.__lastLoadedScenario = s;
          return s;
        };
      }
    }

    // 3) Global loadScenario hook (if present and returns a scenario)
    if (typeof window.loadScenario === 'function') {
      const orig = window.loadScenario;
      window.loadScenario = async function (...args) {
        const s = await orig.apply(this, args);
        window.__lastLoadedScenario = s;
        return s;
      };
    }

    console.info('[AmorviaPatch] start-fallback.patch ' + (patched ? 'active' : 'loaded (no targets found)'));
    // expose for diagnostics
    window.__amorviaEnsureEntryNode = ensureEntryNode;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
