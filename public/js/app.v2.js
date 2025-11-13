
// app.v2.js – Amorvia V2 Mini-Engine + Scenario Picker + HUD hook
// ---------------------------------------------------------------
// This version does NOT rely on a global ScenarioEngine.
// It works directly with flattened *.v2.json scenarios that contain `nodes`.
// Responsibilities:
//  - Load /data/v2-index.json and populate #scenarioPicker
//  - Load /data/<id>.v2.json for the chosen scenario
//  - Manage simple state: current node + meters (trust, tension, childStress)
//  - Render dialog + choices into #dialog and #choices
//  - Handle choice clicks → move to next node
//  - Update #actBadge + #sceneTitle
//  - Sync HUD via AmorviaHUD.update({ trust, tension, childStress })
//
// It is intentionally conservative and only uses fields we know exist in v2:
//  - scenario.start / startNodeId / entryId / entry / entryNodeId
//  - node.id / node.text / node.act / node.choices[*].id/label/text/next/to/effects
//  - scenario.acts[*] with { id, title }
//  - scenario.meters (initial values)
//
(function () {
  "use strict";

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

  const state = {
    index: null,
    scenario: null,
    nodeById: Object.create(null),
    actsById: Object.create(null),
    currentNodeId: null,
    meters: { trust: 0, tension: 0, childStress: 0 },
    currentScenarioId: null,
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

    const container = $(SELECTORS.statusContainer) || $("#titleAndList");
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
    if (!badge || !badge.isConnected) {
      badge = ensureStatusBadge();
    }
    if (!badge) return;
    badge.textContent = text;
    badge.dataset.tone = tone || "";
  }

  function updateUrlScenarioParam(id) {
    if (!window.history || !window.history.replaceState) return;
    const url = new URL(window.location.href);
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
    } catch {
      return null;
    }
  }

  function getScenarioFromUrl() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get("scenario");
    } catch {
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

  // ------------ Rendering ------------

  function computeStartNodeId(scn) {
    if (!scn) return null;
    return (
      scn.startNodeId ||
      scn.start ||
      scn.entryNodeId ||
      scn.entryId ||
      scn.entry ||
      null
    );
  }

  function buildLookupTables(scn) {
    state.nodeById = Object.create(null);
    (scn.nodes || []).forEach((n) => {
      if (n && n.id) state.nodeById[n.id] = n;
    });

    state.actsById = Object.create(null);
    (scn.acts || []).forEach((a) => {
      if (a && a.id) state.actsById[a.id] = a;
    });
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

    // Update act badge
    if (actBadge) {
      const actMeta = node.act && state.actsById[node.act];
      if (actMeta && actMeta.title) actBadge.textContent = actMeta.title;
      else if (node.act) actBadge.textContent = node.act;
      else actBadge.textContent = "Act -";
    }

    // Update scene title (scenario title)
    if (sceneTitle) {
      sceneTitle.textContent = state.scenario?.title || "Scenario";
    }

    // Dialog text (simple for now; speaker can be added later)
    dialogEl.textContent = (node.text || "").trim() || " ";

    // Choices
    while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild);
    (node.choices || []).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.textContent = c.label || c.text || "Continue";
      if (c.id) btn.dataset.choiceId = c.id;
      btn.dataset.next = c.to || c.next || "";
      choicesEl.appendChild(btn);
    });

    // Apply any node-level effects on enter
    if (node.effects) {
      applyEffects(node.effects);
      syncHUD();
    }
  }

  function gotoNode(nextId, choiceId) {
    const node = state.nodeById[state.currentNodeId];
    if (!node) return;

    // Apply choice-level effects first
    if (choiceId) {
      const choice = (node.choices || []).find((c) => c.id === choiceId);
      if (choice && choice.effects) applyEffects(choice.effects);
    }

    // Node-level effects are applied on renderCurrentNode()

    // Move to next
    const targetId = nextId || (node.choices || [])[0]?.to || (node.choices || [])[0]?.next;
    if (!targetId) {
      console.warn("[AmorviaMini] No next node id for", node.id);
      return;
    }

    state.currentNodeId = targetId;
    renderCurrentNode();
    syncHUD();
  }

  function wireChoiceClicks() {
    const choicesEl = $(SELECTORS.choices);
    if (!choicesEl || choicesEl.dataset.amorviaMiniBound === "1") return;

    choicesEl.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button.choice");
      if (!btn) return;
      const nextId = btn.dataset.next || "";
      const choiceId = btn.dataset.choiceId || null;
      gotoNode(nextId, choiceId);
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
          scn.meters || {}
        );
        buildLookupTables(scn);
        const startId = computeStartNodeId(scn);
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
      select.addEventListener("change", (ev) => {
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
      opt.value = id;
      opt.textContent = s.title || id || "(untitled)";
      select.appendChild(opt);
    });
  }

  function pickInitialScenarioId() {
    const fromUrl = getScenarioFromUrl();
    if (fromUrl) return fromUrl;

    const fromStorage = loadLastScenario();
    if (fromStorage) return fromStorage;

    if (state.index && Array.isArray(state.index.scenarios) && state.index.scenarios.length) {
      return state.index.scenarios[0].id || state.index.scenarios[0].slug || null;
    }
    return null;
  }

  function loadIndex() {
    ensureStatusBadge();
    setStatus(STATUS.LOADING, "loading");

    return fetchJsonNoStore("/data/v2-index.json")
      .then((idx) => {
        state.index = idx;
        buildPickerUI();
        populatePicker();

        const initialId = pickInitialScenarioId();
        if (initialId) {
          const select = $(SELECTORS.picker);
          if (select) select.value = initialId;
          return loadScenarioById(initialId);
        } else {
          setStatus(STATUS.READY, "ok");
        }
      })
      .catch((err) => {
        console.error("[AmorviaMini] Failed to load v2 index", err);
        setStatus(STATUS.ERROR, "error");
      });
  }

  // ------------ Init ------------

  function init() {
    loadIndex();
    wireChoiceClicks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.AmorviaMini = {
    state,
    loadScenarioById,
    syncHUD,
    loadIndex,
  };
})();
