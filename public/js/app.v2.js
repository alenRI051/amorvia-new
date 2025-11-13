
(function () {
  "use strict";

  const state = {
    currentScenarioId: null,
    engine: null,
  };

  const SELECTORS = {
    picker: "#scenarioPicker",
  };

  function getEngine() {
    if (state.engine) return state.engine;
    const eng = window.ScenarioEngine || window.engine || window.scenarioEngine;
    if (eng) state.engine = eng;
    return state.engine;
  }

  function waitForEngine(maxMs) {
    const timeout = typeof maxMs === "number" ? maxMs : 5000;
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function loop() {
        const eng = getEngine();
        if (eng) {
          resolve(eng);
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error("ScenarioEngine not found"));
          return;
        }
        setTimeout(loop, 50);
      })();
    });
  }

  function fetchJson(url) {
    return fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" }
    }).then(r => {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  // If v2ToGraph exists, use it; otherwise just pass raw v2 scenario through.
  function toScenario(raw) {
    if (typeof window.v2ToGraph === "function") {
      try {
        return window.v2ToGraph(raw);
      } catch (e) {
        console.warn("[FORCE LOADER] v2ToGraph failed, falling back to raw v2:", e);
        return raw;
      }
    }
    return raw;
  }

  function syncHUD() {
    try {
      if (typeof AmorviaHUD === "undefined") return;
      const eng = getEngine();
      if (!eng || !eng.state) return;
      AmorviaHUD.update(eng.state.meters || {});
    } catch (e) {
      console.warn("[FORCE LOADER] HUD sync failed:", e);
    }
  }

  function startEngine(eng, scenario) {
    if (!eng || typeof eng.start !== "function") return;
    let startId = null;
    if (scenario && typeof scenario === "object") {
      startId =
        scenario.start ||
        scenario.startId ||
        scenario.entry ||
        scenario.entryId ||
        null;
    }
    try {
      if (startId != null) {
        eng.start(startId);
      } else {
        eng.start(); // let engine decide default
      }
    } catch (e) {
      console.warn("[FORCE LOADER] eng.start threw:", e);
    }
  }

  function loadScenarioById(id) {
    if (!id) return;

    state.currentScenarioId = id;

    const picker = document.querySelector(SELECTORS.picker);
    if (picker) picker.value = id;

    const path = "/data/" + id + ".v2.json";
    console.info("[FORCE LOADER] loading", id, "from", path);

    Promise.all([waitForEngine(), fetchJson(path)])
      .then(([eng, raw]) => {
        const scenario = toScenario(raw);
        if (!eng || typeof eng.loadScenario !== "function") {
          throw new Error("ScenarioEngine.loadScenario() missing");
        }
        eng.loadScenario(scenario);
        startEngine(eng, scenario);
        setTimeout(syncHUD, 80);
      })
      .catch(err => {
        console.error("[FORCE LOADER] failed:", err);
      });
  }

  function buildPicker() {
    const picker = document.querySelector(SELECTORS.picker);
    if (!picker) {
      console.warn("[FORCE LOADER] #scenarioPicker not found");
      return;
    }
    if (!picker.dataset.forceLoaderBound) {
      picker.addEventListener("change", ev => {
        loadScenarioById(ev.target.value);
      });
      picker.dataset.forceLoaderBound = "1";
    }
  }

  function init() {
    buildPicker();

    // Auto-load from URL or keep current picker value
    const url = new URL(window.location.href);
    const sid = url.searchParams.get("scenario") ||
                (document.querySelector(SELECTORS.picker) || {}).value ||
                null;
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
    syncHUD: syncHUD,
    state,
  };
})();
