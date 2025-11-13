
// app.v2.js - Amorvia v2 Loader + Scenario Picker (existing UI) + HUD hook (NO TIMEOUT)
// ------------------------------------------------------------------------------------
// - Uses the existing #scenarioPicker in #titleAndList (no extra toolbar)
// - Fetches /data/v2-index.json and populates that picker
// - Wires to ScenarioEngine (supports loadScenario / LoadScenario + start)
// - Loads raw v2 JSON and lets engine handle flattening/graph
// - Keeps URL ?scenario=<id> in sync with picker
// - Persists last selection in localStorage
// - Shows simple status badge inside the #titleAndList row
// - Calls AmorviaHUD.update(state.meters) after each scenario change (if available)
// - waitForEngine() keeps polling until ScenarioEngine is available (no 5s timeout)

(function () {
  "use strict";

  const STORAGE_KEYS = {
    MODE: "amorvia:mode",
    LAST_SCENARIO: "amorvia:lastScenarioId",
  };

  const SELECTORS = {
    picker: "#scenarioPicker",
    badge: "[data-amorvia-status]",
    badgeContainer: "#titleAndList .row",
  };

  const STATUS = {
    READY: "Ready",
    LOADING: "Loading…",
    ERROR: "Error",
  };

  const state = {
    index: null,
    currentScenarioId: null,
    engine: null,
  };

  // ------------------ Utility helpers ------------------

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function createEl(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    }
    return el;
  }

  function safeJsonFetch(url) {
    return fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-store",
      },
    }).then((res) => {
      if (!res.ok) {
        throw new Error("HTTP " + res.status + " for " + url);
      }
      return res.json();
    });
  }

  function ensureStatusBadge() {
    let badge = $(SELECTORS.badge);
    if (badge && badge.isConnected) return badge;

    const container = $(SELECTORS.badgeContainer) || $("#titleAndList");
    if (!container) return null;

    badge = createEl("span", "amor-status-badge", {
      "data-amorvia-status": "true",
    });
    badge.textContent = STATUS.LOADING;
    container.appendChild(badge);
    return badge;
  }

  function setStatus(text, tone) {
    let badge = $(SELECTORS.badge);
    if (!badge || !badge.isConnected) {
      badge = ensureStatusBadge();
      if (!badge) return;
    }
    badge.textContent = text;
    badge.dataset.tone = tone || "";
  }

  function updateUrlScenarioParam(id) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("scenario", id);
    } else {
      url.searchParams.delete("scenario");
    }
    window.history.replaceState({}, "", url.toString());
  }

  function getScenarioFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("scenario");
    } catch {
      return null;
    }
  }

  function saveLastScenario(id) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SCENARIO, id || "");
    } catch {
      // ignore
    }
  }

  function loadLastScenario() {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.LAST_SCENARIO);
      return v || null;
    } catch {
      return null;
    }
  }

  // ------------------ Engine wiring ------------------

  function getEngine() {
    if (state.engine) return state.engine;

    // Try a few common globals
    const candidates = [
      window.ScenarioEngine,
      window.scenarioEngine,
      window.engine,
    ].filter(Boolean);

    if (candidates.length > 0) {
      state.engine = candidates[0];
      return state.engine;
    }

    return null;
  }

  // Wait for engine with no hard timeout (dev-friendly)
  function waitForEngine() {
    return new Promise((resolve) => {
      (function loop() {
        const eng = getEngine();
        if (eng && (eng.loadScenario || eng.LoadScenario)) {
          resolve(eng);
          return;
        }
        setTimeout(loop, 100);
      })();
    });
  }

  // Call this after any engine action that might change meters
  function syncHUDMeters() {
    try {
      if (typeof AmorviaHUD === "undefined") return;
      const eng = getEngine();
      if (!eng || !eng.state) return;
      const meters = eng.state.meters || {};
      AmorviaHUD.update(meters);
    } catch (e) {
      console.warn("[AmorviaHUD] sync error:", e);
    }
  }

  // ------------------ Scenario loading ------------------

  function pickSafeScenarioId() {
    if (!state.index || !Array.isArray(state.index.scenarios)) return null;
    if (!state.index.scenarios.length) return null;
    return state.index.scenarios[0].id || state.index.scenarios[0].slug || null;
  }

  function loadScenarioById(id) {
    if (!id) {
      console.warn("[Amorvia] loadScenarioById called with empty id");
      return;
    }

    setStatus(STATUS.LOADING, "loading");
    state.currentScenarioId = id;
    saveLastScenario(id);
    updateUrlScenarioParam(id);

    const picker = $(SELECTORS.picker);
    if (picker) {
      picker.value = id;
    }

    const path = "/data/" + id + ".v2.json";

    return waitForEngine()
      .then((eng) => {
        return safeJsonFetch(path).then((rawScenario) => ({ eng, rawScenario }));
      })
      .then(({ eng, rawScenario }) => {
        const loader = eng.loadScenario || eng.LoadScenario;
        if (typeof loader !== "function") {
          throw new Error("ScenarioEngine has no loadScenario/LoadScenario");
        }

        // Let the engine handle internal normalization; we just pass raw v2 JSON
        loader.call(eng, rawScenario);

        // Start the engine if it exposes start()
        if (typeof eng.start === "function") {
          try {
            eng.start();
          } catch (e) {
            console.warn("[Amorvia] engine.start() threw:", e);
          }
        } else {
          console.warn("[Amorvia] ScenarioEngine has no start() method; assuming it auto-renders.");
        }

        syncHUDMeters();
        setStatus(STATUS.READY, "ok");
      })
      .catch((err) => {
        console.error("[Amorvia] Failed to load scenario", id, err);
        setStatus(STATUS.ERROR, "error");
      });
  }

  // ------------------ Scenario picker UI ------------------

  function buildPickerUI() {
    ensureStatusBadge();

    const select = $(SELECTORS.picker);
    if (!select) {
      console.warn("[Amorvia] No #scenarioPicker found; picker UI disabled.");
      return;
    }

    if (!select.dataset.amorviaBound) {
      select.addEventListener("change", (ev) => {
        const newId = ev.target.value;
        if (!newId) return;
        loadScenarioById(newId);
      });
      select.dataset.amorviaBound = "1";
    }
  }

  function populatePicker() {
    const select = $(SELECTORS.picker);
    if (!select || !state.index || !Array.isArray(state.index.scenarios)) return;

    select.innerHTML = "";

    state.index.scenarios.forEach((s) => {
      const opt = document.createElement("option");
      const id = s.id || s.slug;
      opt.value = id;
      opt.textContent = s.title || id || "(untitled)";
      select.appendChild(opt);
    });
  }

  function chooseInitialScenarioId() {
    const fromUrl = getScenarioFromUrl();
    if (fromUrl) return fromUrl;

    const fromStorage = loadLastScenario();
    if (fromStorage) return fromStorage;

    return pickSafeScenarioId();
  }

  // ------------------ Index loading ------------------

  function loadIndex() {
    setStatus(STATUS.LOADING, "loading");

    return safeJsonFetch("/data/v2-index.json")
      .then((idx) => {
        state.index = idx;
        populatePicker();

        const initialId = chooseInitialScenarioId();
        if (initialId) {
          const select = $(SELECTORS.picker);
          if (select) {
            select.value = initialId;
          }
          return loadScenarioById(initialId);
        } else {
          setStatus(STATUS.READY, "ok");
        }
      })
      .catch((err) => {
        console.error("[Amorvia] Failed to load v2 index", err);
        setStatus(STATUS.ERROR, "error");
      });
  }

  // ------------------ Wire choice clicks -> HUD sync ------------------

  function wireChoiceListener() {
    const choicesEl = document.getElementById("choices");
    if (!choicesEl) return;

    choicesEl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      // Daj engine-u da prvo odradi svoje, onda syncaj meter-e
      setTimeout(() => {
        try {
          syncHUDMeters();
        } catch (e) {
          console.warn("[Amorvia] HUD sync after choice failed:", e);
        }
      }, 10);
    });
  }

  // ------------------ Init ------------------

  function init() {
    buildPickerUI();
    loadIndex();
    wireChoiceListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.AmorviaApp = {
    state,
    reloadIndex: loadIndex,
    loadScenarioById,
    syncHUDMeters,
  };
})();
