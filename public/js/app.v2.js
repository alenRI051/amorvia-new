
// app.v2.js - Amorvia v2 Loader + Scenario Picker + HUD hook (NO 5s TIMEOUT)
// -------------------------------------------------------------------------
// - Fetches /data/v2-index.json and populates scenario picker
// - Wires to ScenarioEngine (supports loadScenario / LoadScenario + start)
// - Loads raw v2 JSON and lets engine handle graph/acts flattening
// - Keeps URL ?scenario=<id> in sync with picker
// - Persists last selection in localStorage
// - Shows simple status badge
// - Calls AmorviaHUD.update(state.meters) after each scenario change (if available)
// - IMPORTANT CHANGE: waitForEngine() no longer rejects after 5000ms. It just keeps polling
//   until ScenarioEngine is available, so there is no "ScenarioEngine not ready after 5000ms" error.

(function () {
  "use strict";

  const STORAGE_KEYS = {
    MODE: "amorvia:mode",
    LAST_SCENARIO: "amorvia:lastScenarioId",
  };

  const SELECTORS = {
    toolbar: "[data-amorvia-toolbar]",
    picker: "[data-scenario-picker]",
    badge: "[data-amorvia-status]",
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

  function setStatus(text, tone) {
    const badge = $(SELECTORS.badge);
    if (!badge) return;
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

  // NEW: waitForEngine without hard timeout.
  // It just keeps polling until ScenarioEngine appears.
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

  // Emit canonical Amorvia event so compat/ensure-graph-hook can
  // handle v2 -> graph conversion and ScenarioEngine wiring.
  const ev = new CustomEvent("amorvia:select-scenario", {
    detail: { id },
  });
  window.dispatchEvent(ev);

  // Give the engine a moment to process the event, then sync HUD + badge.
  setTimeout(() => {
    try {
      syncHUDMeters();
      setStatus(STATUS.READY, "ok");
    } catch (e) {
      console.warn("[Amorvia] HUD sync after scenario load failed:", e);
      setStatus(STATUS.READY, "ok");
    }
  }, 80);
}

  // ------------------ Scenario picker UI ------------------


  function ensureToolbar() {
    let toolbar = $(SELECTORS.toolbar);
    if (toolbar && toolbar.isConnected) return toolbar;

    toolbar = createEl("div", "amor-toolbar", { "data-amorvia-toolbar": "true" });

    // You can style .amor-toolbar yourself in CSS.
    toolbar.style.display = "flex";
    toolbar.style.alignItems = "center";
    toolbar.style.gap = "0.5rem";
    toolbar.style.position = "relative";
    toolbar.style.zIndex = "30";

    // Try to attach at top of main app container or body
    const host =
      document.querySelector("#app") ||
      document.querySelector("main") ||
      document.body;

    host.insertBefore(toolbar, host.firstChild);
    return toolbar;
  }

  function buildPickerUI() {
    const toolbar = ensureToolbar();

    // Scenario label
    const label = createEl("label", "amor-picker-label");
    label.textContent = "Scenario:";

    const select = createEl("select", "amor-picker-select", {
      "data-scenario-picker": "true",
    });

    // Status badge
    const badge = createEl("span", "amor-status-badge", {
      "data-amorvia-status": "true",
    });
    badge.textContent = STATUS.LOADING;

    toolbar.appendChild(label);
    toolbar.appendChild(select);
    toolbar.appendChild(badge);

    select.addEventListener("change", (ev) => {
      const newId = ev.target.value;
      if (!newId) return;
      loadScenarioById(newId);
    });
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
