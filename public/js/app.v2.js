
(function () {
  "use strict";

  // Basic state
  const state = {
    currentScenarioId: null,
    engine: null,
  };

  const SELECTORS = {
    picker: "#scenarioPicker",
  };

  // Get engine instance
  function getEngine() {
    if (state.engine) return state.engine;
    const eng = window.ScenarioEngine || window.engine || window.scenarioEngine;
    if (eng) state.engine = eng;
    return state.engine;
  }

  // Fetch JSON no-cache
  function fetchJson(url) {
    return fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" }
    }).then(r => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  // Convert v2 to graph
  function toGraph(raw) {
    if (typeof window.v2ToGraph === "function") {
      return window.v2ToGraph(raw);
    }
    throw new Error("v2ToGraph not available");
  }

  function syncHUD() {
    try {
      if (typeof AmorviaHUD === "undefined") return;
      const eng = getEngine();
      if (!eng || !eng.state) return;
      AmorviaHUD.update(eng.state.meters || {});
    } catch (e) {
      console.warn("[HUD sync failed]", e);
    }
  }

  function loadScenarioById(id) {
    if (!id) return;

    state.currentScenarioId = id;

    const picker = document.querySelector(SELECTORS.picker);
    if (picker) picker.value = id;

    const path = "/data/" + id + ".v2.json";

    fetchJson(path)
      .then(raw => {
        const graph = toGraph(raw);
        const eng = getEngine();
        if (!eng) throw new Error("ScenarioEngine missing");

        if (typeof eng.loadScenario !== "function") {
          throw new Error("Engine missing loadScenario()");
        }
        eng.loadScenario(graph);

        if (typeof eng.start === "function") {
          eng.start(graph.start || graph.startId || graph.entry || null);
        }

        setTimeout(syncHUD, 50);
      })
      .catch(err => {
        console.error("[FORCE LOADER] failed:", err);
      });
  }

  function buildPicker() {
    const picker = document.querySelector(SELECTORS.picker);
    if (!picker) return;

    picker.addEventListener("change", ev => {
      loadScenarioById(ev.target.value);
    });
  }

  function init() {
    buildPicker();

    // Auto-load initial scenario from URL if present
    const url = new URL(window.location.href);
    const sid = url.searchParams.get("scenario");
    if (sid) {
      loadScenarioById(sid);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.AmorviaApp = {
    loadScenarioById,
    syncHUD,
    state
  };
})();
