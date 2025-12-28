// app.v2.js – Amorvia V2 Mini-Engine + Scenario Picker + HUD hook
// ---------------------------------------------------------------
// Works directly with *.v2.json v2 scenarios. Relies on:
//  - fetch-normalize-entry.v2.patch.js to ensure acts[*].nodes[] + start/entry.
// Does NOT use a global ScenarioEngine.
// It manages a tiny in-memory engine: current node + meters.
(function bootAdvancedMode() {
  const params = new URLSearchParams(window.location.search);
  const urlAdvanced = params.get("advanced"); // "1" enables

  // Persisted user choice (power users)
  const saved = localStorage.getItem("amorvia:advanced"); // "1" | "0" | null

  // Default for playtest: OFF (0), unless URL explicitly enables it
  const advanced = (urlAdvanced === "1")
    ? "1"
    : (saved === "1" ? "1" : "0");

  document.documentElement.setAttribute("data-advanced", advanced);
})();

(function () {
  "use strict";

  // HUD mode: "feedback" (Impulse HUD)
  try { document.documentElement.dataset.hudmode = "feedback"; } catch (e) {}


  const STORAGE_KEYS = {
    LAST_SCENARIO: "amorvia:v2mini:lastScenarioId",
  };

  const SELECTORS = {
    picker: "#scenarioPicker",
    actBadge: "#actBadge",
    sceneTitle: "#sceneTitle",
    dialog: "#dialog",
    choices: "#choices",
    statusBadge: "[data-amorvia-status]",
    statusContainer: "#titleAndList .row",
  };

  const STATUS = {
    READY: "Ready",
    LOADING: "Loading…",
    ERROR: "Error",
  };

  // Background wiring
  const BG_SELECTORS = {
    select: "#bgSelect",
    img: "#bgImg",
  };

  const BACKGROUNDS = {
    default: "/assets/backgrounds/room.svg",
    hallway: "/assets/backgrounds/hallway.svg",
    cafe: "/assets/backgrounds/cafe.svg",
    // Future-safe:
    // kitchen: "/assets/backgrounds/kitchen.svg",
    // park: "/assets/backgrounds/park.svg",
  };

  // Fallback per-scenario overrides (used if scenario.ui.backgrounds is absent)
  const SCENE_BG_OVERRIDES = {
    "step-parenting-conflicts": {
      act1: "hallway",
      // act2: "default",
      // act3: "default",
    },
  };

  const BG_STATE = {
    loaded: false,
  };

  function applyBackgroundIndex(data) {
    if (!data || !Array.isArray(data.backgrounds)) return;

    const select = $(BG_SELECTORS.select);
    const imgEl = $(BG_SELECTORS.img);
    const currentSrc = imgEl ? imgEl.getAttribute("src") : null;

    // Extend BACKGROUNDS map from index
    data.backgrounds.forEach((bg) => {
      if (!bg || !bg.id || !bg.src) return;
      BACKGROUNDS[bg.id] = bg.src;
    });

    if (select) {
      // Rebuild the dropdown
      select.innerHTML = "";
      data.backgrounds.forEach((bg) => {
        if (!bg || !bg.src) return;
        const opt = document.createElement("option");
        opt.value = bg.src;
        opt.textContent = bg.label || bg.id || bg.src;
        select.appendChild(opt);
      });

      // Try to preserve currently active background, if it exists
      if (currentSrc) {
        const hasMatch = Array.from(select.options).some(
          (opt) => opt.value === currentSrc
        );
        if (hasMatch) {
          select.value = currentSrc;
        }
      }
    }

    BG_STATE.loaded = true;
  }

  function loadBackgroundIndex() {
    // Non-fatal; just logs on failure and keeps hard-coded defaults
    return fetchJsonNoStore("/data/backgrounds.v1.json")
      .then((data) => {
        applyBackgroundIndex(data);
      })
      .catch((err) => {
        console.warn("[AmorviaMini] Failed to load backgrounds index:", err);
      });
  }

  const state = {
    index: null,
    scenario: null,
    nodeById: Object.create(null),
    actsById: Object.create(null),
    currentNodeId: null,
    meters: { trust: 0, tension: 0, childStress: 0 },
    currentScenarioId: null,
    lastActId: null,
  };

  // ------------ DOM helpers ------------

  function $(sel) {
    return document.querySelector(sel);
  }

  function createEl(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    }
    return el;
  }

  function ensureStatusBadge() {
    let badge = $(SELECTORS.statusBadge);
    if (badge && badge.isConnected) return badge;

    const container =
      $(SELECTORS.statusContainer) || document.querySelector("#titleAndList");
    if (!container) return null;

    badge = createEl("span", "amor-status-badge", {
      "data-amorvia-status": "true",
    });
    badge.textContent = STATUS.LOADING;
    container.appendChild(badge);
    return badge;
  }

  function setStatus(text, tone) {
    let badge = $(SELECTORS.statusBadge);
    if (!badge || !badge.isConnected) badge = ensureStatusBadge();
    if (!badge) return;
    badge.textContent = text;
    badge.dataset.tone = tone || "";
  }

  function updateUrlScenarioParam(id) {
    if (!window.history || !window.history.replaceState) return;
    let url;
    try {
      url = new URL(window.location.href);
    } catch (e) {
      return;
    }
    if (id) url.searchParams.set("scenario", id);
    else url.searchParams.delete("scenario");
    window.history.replaceState({}, "", url.toString());
  }

  function saveLastScenario(id) {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SCENARIO, id || "");
    } catch (e) {
      console.warn("[AmorviaMini] Failed to save last scenario:", e);
    }
  }

  function loadLastScenario() {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.LAST_SCENARIO);
      return v || null;
    } catch (e) {
      return null;
    }
  }

  function getScenarioFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("scenario");
    } catch (e) {
      return null;
    }
  }

  // ------------ Fetch helpers ------------

  function fetchJsonNoStore(url) {
    return fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    }).then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
      return res.json();
    });
  }

  // ------------ HUD ------------

  function syncHUD() {
    try {
      if (typeof AmorviaHUD === "undefined") return;
      AmorviaHUD.update({
        trust: state.meters.trust || 0,
        tension: state.meters.tension || 0,
        childStress: state.meters.childStress || 0,
      });
    } catch (e) {
      console.warn("[AmorviaMini] HUD sync failed:", e);
    }
  }

  function applyEffects(effects) {
    if (!effects) return;
    const src = effects.meters || effects;
    if (!src || typeof src !== "object") return;
    ["trust", "tension", "childStress"].forEach((key) => {
      const delta = src[key];
      if (typeof delta === "number" && !Number.isNaN(delta)) {
        if (typeof state.meters[key] !== "number") state.meters[key] = 0;
        state.meters[key] += delta;
      }
    });
  }



// ------------ HUD Impulse (feedback-only) ------------

let hudImpulseTimer = null;

function ensureHudImpulseMount() {
  if (document.getElementById("hudImpulse")) return;

  const mount = document.createElement("div");
  mount.id = "hudImpulse";
  mount.className = "hud-impulse";
  mount.setAttribute("aria-live", "polite");

  mount.innerHTML = `
    <div class="hud-impulse__left">Impact</div>
    <div class="hud-impulse__chips" id="hudImpulseChips"></div>
  `;

  // Prefer: insert directly under the dialog (above choices)
  const dialog =
    document.querySelector("#dialog") ||
    document.querySelector("[data-role='dialog']") ||
    document.querySelector(".dialog") ||
    document.querySelector("#story") ||
    document.querySelector(".story");

  const choices =
    document.querySelector("#choices") ||
    document.querySelector("[data-role='choices']") ||
    document.querySelector(".choices");

  if (dialog && dialog.isConnected) {
    dialog.insertAdjacentElement("afterend", mount);
    return;
  }

  if (choices && choices.isConnected) {
    choices.insertAdjacentElement("beforebegin", mount);
    return;
  }

  // Fallback
  const host =
    document.querySelector("#app") ||
    document.querySelector("main") ||
    document.body;

  host.appendChild(mount);
}


function showHudImpulse(deltas) {
  if (!deltas) return;

  // Only show if something actually changed
  const hasAny =
    !!(deltas.trust || deltas.tension || deltas.childStress);
  if (!hasAny) return;

  ensureHudImpulseMount();

  const box = document.getElementById("hudImpulse");
  const chips = document.getElementById("hudImpulseChips");
  if (!box || !chips) return;

  const items = [
    { key: "trust", label: "Trust", val: Number(deltas.trust) || 0, goodUp: true },
    { key: "tension", label: "Tension", val: Number(deltas.tension) || 0, goodUp: false },
    { key: "childStress", label: "Child", val: Number(deltas.childStress) || 0, goodUp: false },
  ];

  chips.innerHTML = "";

  for (const it of items) {
    const v = it.val;

    let cls = "neu", arr = "~", txt = "unchanged";
    if (v !== 0) {
      // For tension/childStress: lower is better
      const improved = it.goodUp ? (v > 0) : (v < 0);
      cls = improved ? "pos" : "neg";
      arr = improved ? "↑" : "↓";
      txt = improved ? "improved" : "worsened";
    }

    const chip = document.createElement("div");
    chip.className = `hud-chip ${cls}`;
    chip.innerHTML = `<span class="arr">${arr}</span> <b>${it.label}</b> <span style="opacity:.75">${txt}</span>`;
    chips.appendChild(chip);
  }

  box.classList.remove("is-off");
  box.classList.add("is-on");

  if (hudImpulseTimer) clearTimeout(hudImpulseTimer);
  hudImpulseTimer = setTimeout(() => {
    box.classList.add("is-off");
    setTimeout(() => box.classList.remove("is-on", "is-off"), 220);
  }, 3000);
}

function snapshotMeters() {
  return {
    trust: Number(state.meters.trust) || 0,
    tension: Number(state.meters.tension) || 0,
    childStress: Number(state.meters.childStress) || 0,
  };
}

function diffMeters(before, after) {
  return {
    trust: (after.trust - before.trust),
    tension: (after.tension - before.tension),
    childStress: (after.childStress - before.childStress),
  };
}


  // ------------ Rendering helpers ------------

  function computeStartNodeId(scn) {
    if (!scn) return null;
    return (
      scn.startNodeId ||
      scn.start ||
      scn.entryNodeId ||
      scn.entryId ||
      (scn.entry && scn.entry.nodeId) ||
      null
    );
  }

  function buildLookupTables(scn) {
    state.nodeById = Object.create(null);
    state.actsById = Object.create(null);

    // Always index acts first (if present)
    if (Array.isArray(scn.acts)) {
      scn.acts.forEach((act) => {
        if (!act) return;
        const actId = act.id || act.title || "";
        if (actId) state.actsById[actId] = act;

        const nodes = Array.isArray(act.nodes) ? act.nodes : [];
        nodes.forEach((node) => {
          if (!node || !node.id) return;
          if (!node.act) node.act = actId;
          state.nodeById[node.id] = node;
        });
      });
    }

    // If scenario has a flat nodes[] array, merge/override
    if (Array.isArray(scn.nodes)) {
      scn.nodes.forEach((node) => {
        if (!node || !node.id) return;
        if (node.act && !state.actsById[node.act]) {
          state.actsById[node.act] = { id: node.act, title: node.act };
        }
        state.nodeById[node.id] = node;
      });
    }
  }

  // Apply background, using scenario.ui.backgrounds first, then overrides
  function applyBackgroundForNode(node) {
    if (!node) return;

    const bgImg = $(BG_SELECTORS.img);
    if (!bgImg) return;

    const bgSelect = $(BG_SELECTORS.select);
    let src = BACKGROUNDS.default;

    const scenarioId = state.currentScenarioId;
    const scn = state.scenario || {};
    const ui = scn.ui || {};
    const cfg = ui.backgrounds || null;

    if (cfg) {
      // Scenario-level config wins if present
      if (typeof cfg.default === "string" && cfg.default) {
        src = cfg.default;
      }
      const actId = node.act || null;
      if (
        actId &&
        cfg.act &&
        typeof cfg.act === "object" &&
        Object.prototype.hasOwnProperty.call(cfg.act, actId)
      ) {
        const keyOrPath = cfg.act[actId];
        if (typeof keyOrPath === "string" && keyOrPath) {
          // Allow either a key into BACKGROUNDS or a full path
          if (BACKGROUNDS[keyOrPath]) {
            src = BACKGROUNDS[keyOrPath];
          } else {
            src = keyOrPath;
          }
        }
      }
    } else if (scenarioId && SCENE_BG_OVERRIDES[scenarioId]) {
      // Fallback map if no scenario-level backgrounds configured
      const perScenario = SCENE_BG_OVERRIDES[scenarioId];
      const actId = node.act || null;
      if (actId && perScenario[actId]) {
        const key = perScenario[actId];
        if (BACKGROUNDS[key]) {
          src = BACKGROUNDS[key];
        }
      }
    }

    // Update <img id="bgImg">
    if (bgImg.getAttribute("src") !== src) {
      bgImg.setAttribute("src", src);
    }

    // If the dropdown knows about this value, sync it too
    if (bgSelect) {
      const hasOption = Array.from(bgSelect.options || []).some(function (opt) {
        return opt.value === src;
      });
      if (hasOption) {
        bgSelect.value = src;
      }
    }
  }

  function renderCurrentNode() {
    const node = state.nodeById[state.currentNodeId];
    const dialogEl = $(SELECTORS.dialog);
    const choicesEl = $(SELECTORS.choices);
    const actBadge = $(SELECTORS.actBadge);
    const sceneTitle = $(SELECTORS.sceneTitle);

    if (!dialogEl || !choicesEl) {
      console.warn("[AmorviaMini] Missing dialog or choices element.");
      return;
    }

    if (!node) {
      dialogEl.textContent = "(Scenario ended.)";
      while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild);
      if (actBadge) actBadge.textContent = "Act -";
      return;
    }

    // Background for this node (scenario + act aware)
    applyBackgroundForNode(node);

    // Act badge
if (actBadge) {
  let actLabel = "Act -";
  let actId = null;

  if (node.act && state.actsById[node.act]) {
    const meta = state.actsById[node.act];
    actId = meta.id || node.act;
    actLabel = meta.title || meta.id || "Act -";
  } else if (node.act) {
    actId = node.act;
    actLabel = node.act;
  }

  // ako se act promijenio, pokreni malu animaciju
  if (actId && actId !== state.lastActId) {
    actBadge.classList.remove("act-change");
    // reflow trik da se resetira animacija
    void actBadge.offsetWidth;
    actBadge.classList.add("act-change");
    state.lastActId = actId;
  }

  actBadge.textContent = actLabel;
}

    // Scene title
    if (sceneTitle) {
  const scn = state.scenario || {};
  const label = node.title || scn.title || "";

  sceneTitle.classList.remove("scene-change");
  void sceneTitle.offsetWidth;
  sceneTitle.textContent = label;
  sceneTitle.classList.add("scene-change");
}

    // Dialog text (v2 uses string; if array sneaks in, join safely)
    const rawText = node.text;
    let textStr = "";
    if (Array.isArray(rawText)) {
      textStr = rawText.join("\n\n");
    } else if (typeof rawText === "string") {
      textStr = rawText;
    }
    dialogEl.textContent = textStr.trim() || " ";

    // Choices
    while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild);
    (node.choices || []).forEach((c) => {
  const btn = document.createElement("button");
  btn.className = "choice";

  const label = c.label || c.text || "Continue";
  btn.textContent = label;
  btn.title = label;

  if (c.id) btn.dataset.choiceId = c.id;
  const nextId = c.to || c.next || "";
  if (nextId) btn.dataset.next = nextId;
  choicesEl.appendChild(btn);
});

    // Node-level effects on enter
    if (node.effects) {
      applyEffects(node.effects);
      syncHUD();
    }
  }

  function gotoNode(nextId, choiceId) {
    const current = state.nodeById[state.currentNodeId];
    if (!current) return;

    // Apply choice effects
    if (choiceId) {
      const choice = (current.choices || []).find(function (c) {
        return c && c.id === choiceId;
      });
      if (choice && choice.effects) applyEffects(choice.effects);
    }

    let targetId = nextId;
    if (!targetId) {
      const first = (current.choices || [])[0] || null;
      if (first) targetId = first.to || first.next || null;
    }
    if (!targetId) {
      console.warn("[AmorviaMini] No next node id for", current.id);
      return;
    }

    state.currentNodeId = targetId;
    renderCurrentNode();
    syncHUD();
  }

  function wireChoiceClicks() {
    const choicesEl = $(SELECTORS.choices);
    if (!choicesEl || choicesEl.dataset.amorviaMiniBound === "1") return;
    choicesEl.addEventListener("click", function (ev) {
      const btn = ev.target.closest("button.choice");
      if (!btn) return;
      const nextId = btn.dataset.next || "";
      const choiceId = btn.dataset.choiceId || null;
        const beforeMeters = snapshotMeters();
      gotoNode(nextId, choiceId);
      const afterMeters = snapshotMeters();
      const deltas = diffMeters(beforeMeters, afterMeters);
      showHudImpulse(deltas);
    });
    choicesEl.dataset.amorviaMiniBound = "1";
  }

  // ------------ Scenario loading ------------

  function loadScenarioById(id) {
    if (!id) return;

    setStatus(STATUS.LOADING, "loading");
    state.currentScenarioId = id;
    saveLastScenario(id);
    updateUrlScenarioParam(id);

    const picker = $(SELECTORS.picker);
    if (picker) picker.value = id;

    const path = "/data/" + id + ".v2.json";

    return fetchJsonNoStore(path)
      .then((scn) => {
        state.scenario = scn || {};
        state.meters = Object.assign(
          { trust: 0, tension: 0, childStress: 0 },
          (scn && scn.meters) || {}
        );
        buildLookupTables(scn || {});
        const startId = computeStartNodeId(scn || {});
        state.currentNodeId = startId;
        renderCurrentNode();
        wireChoiceClicks();
        syncHUD();
        setStatus(STATUS.READY, "ok");
      })
      .catch((err) => {
        console.error("[AmorviaMini] Failed to load scenario", id, err);
        setStatus(STATUS.ERROR, "error");
      });
  }

  // ------------ Picker / index ------------

  function buildPickerUI() {
    const select = $(SELECTORS.picker);
    if (!select) {
      console.warn("[AmorviaMini] No #scenarioPicker found.");
      return;
    }
    if (!select.dataset.amorviaMiniBound) {
      select.addEventListener("change", function (ev) {
        const newId = ev.target.value;
        if (!newId) return;
        loadScenarioById(newId);
      });
      select.dataset.amorviaMiniBound = "1";
    }
  }

  function populatePicker() {
    const select = $(SELECTORS.picker);
    if (!select || !state.index || !Array.isArray(state.index.scenarios)) return;

    select.innerHTML = "";

    state.index.scenarios.forEach((s) => {
      const opt = document.createElement("option");
      const id = s.id || s.slug;
      const title = s.title || id || "(untitled)";
      const difficulty = s.difficulty || "";
      const tags = Array.isArray(s.tags) ? s.tags.join(", ") : "";

      // Value = stable id (used by tests)
      opt.value = id;

      // Visible text MUST stay as pure title so Cypress cy.select()
      // calls like "Co-Parenting with Bipolar Partner" still work.
      opt.textContent = title;

      // Tooltip: difficulty + tags
      const parts = [];
      if (difficulty) parts.push(`Difficulty: ${difficulty}`);
      if (tags) parts.push(`Tags: ${tags}`);
      if (parts.length) {
        opt.title = parts.join(" • ");
        opt.setAttribute("label", title);
      }

      select.appendChild(opt);
    });
  }

  function pickInitialScenarioId() {
    const fromUrl = getScenarioFromUrl();
    if (fromUrl) return fromUrl;
    const fromStorage = loadLastScenario();
    if (fromStorage) return fromStorage;
    if (
      state.index &&
      Array.isArray(state.index.scenarios) &&
      state.index.scenarios.length
    ) {
      const s0 = state.index.scenarios[0];
      return s0.id || s0.slug || null;
    }
    return null;
  }

  function loadIndex() {
    ensureStatusBadge();
    setStatus(STATUS.LOADING, "loading");
    return fetchJsonNoStore("/data/v2-index.json")
      .then((idx) => {
        /* === PLAYTEST FILTER (hide internal scenarios) === */
      const PLAYTEST_HIDE = ["brzi-kontakti"];

      if (idx && Array.isArray(idx.scenarios)) {
        idx.scenarios = idx.scenarios.filter(s => {
          const id = (s.id || s.slug || "").toLowerCase();
          const title = (s.title || "").toLowerCase();
          return (
            !PLAYTEST_HIDE.includes(id) &&
            !title.includes("brzi kontakti")
          );
        });
      }
      /* === END PLAYTEST FILTER === */
        state.index = idx;
        buildPickerUI();
        populatePicker();
        const initialId = pickInitialScenarioId();
        if (initialId) {
          const select = $(SELECTORS.picker);
          if (select) select.value = initialId;
          return loadScenarioById(initialId);
        }
        setStatus(STATUS.READY, "ok");
      })
      .catch((err) => {
        console.error("[AmorviaMini] Failed to load v2 index", err);
        setStatus(STATUS.ERROR, "error");
      });
  }

  // ------------ Init ------------

  function init() {
    loadBackgroundIndex();
    loadIndex();
    wireChoiceClicks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose a tiny API for dev tools / tests
  window.AmorviaMini = {
    state: state,
    loadScenarioById: loadScenarioById,
    loadIndex: loadIndex,
    syncHUD: syncHUD,
  };

  // Aeonic Loom launcher
  var loomBtn = document.getElementById("openLoom");
  if (loomBtn) {
    loomBtn.addEventListener("click", function () {
      try {
        if (window.AeonicLoom && typeof AeonicLoom.load === "function") {
          AeonicLoom.load();
        } else {
          console.warn("[AmorviaMini] AeonicLoom is not available yet.");
        }
      } catch (e) {
        console.error("[AmorviaMini] Aeonic Loom failed:", e);
      }
    });
  }
})();

