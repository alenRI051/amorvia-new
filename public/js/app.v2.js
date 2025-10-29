/*
 * Amorvia — app.v2.js (Continuum Fix v9.7.2p+)
 *
 * Goals in this drop-in file:
 *  - Robust engine autoload (supports ScenarioEngine.{loadScenario|LoadScenario} + start)
 *  - Accept raw v2 scenarios OR precompiled graph; auto-hydrate engine.state.nodes
 *  - Safe start node resolver (skips placeholders / "End of Act" sentinels)
 *  - Dialog progression across acts (cross-act goto + next-act fallback)
 *  - HUD sync: animated meters (trust, tension, childStress) + act/progress
 *  - Choice label hint injection from effects (e.g. [+Trust / -Tension])
 *  - Service worker cache bust helpers (force no-store fetch for data/index)
 *
 * Drop this file over /public/js/app.v2.js
 */

(() => {
  const CONFIG = {
    indexPath: "/public/data/v2-index.json",
    schemaVersion: 2,
    meters: ["trust", "tension", "childStress"],
    startNodeCandidates: ["start", "intro", "act1-start", "act-1-start"],
    noStore: true,
    debug: true,
  };

  const log = (...args) => CONFIG.debug && console.log("[Amorvia]", ...args);
  const warn = (...args) => console.warn("[Amorvia]", ...args);
  const err = (...args) => console.error("[Amorvia]", ...args);

  // ---- Fetch helpers with cache-bust --------------------------------------
  async function fetchJSON(url, opts = {}) {
    const o = { ...opts };
    o.headers = { ...(opts.headers || {}) };
    if (CONFIG.noStore) {
      o.cache = "no-store";
      o.headers["Cache-Control"] = "no-store, max-age=0";
      // add a devcache buster query
      const u = new URL(url, location.origin);
      u.searchParams.set("v", String(Date.now()));
      url = u.toString();
    }
    const res = await fetch(url, o);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
  }

  // ---- Engine wait --------------------------------------------------------
  async function waitForEngine(timeoutMs = 8000) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeoutMs) {
      const e = window.ScenarioEngine || window.engine || window.E;
      if (e && (typeof e.loadScenario === "function" || typeof e.LoadScenario === "function") && typeof e.start === "function") {
        return e;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error("ScenarioEngine not ready (loadScenario/LoadScenario + start not found)");
  }

  // ---- Index loader -------------------------------------------------------
  async function resolveScenarioPathById(id) {
    try {
      const index = await fetchJSON(CONFIG.indexPath);
      if (Array.isArray(index)) {
        const hit = index.find(x => x && (x.id === id || x.slug === id));
        if (hit && hit.path) return hit.path;
      } else if (index && index.entries) {
        const hit = index.entries.find(x => x && (x.id === id || x.slug === id));
        if (hit && hit.path) return hit.path;
      }
    } catch (e) {
      warn("Could not read v2-index.json; will try default path", e);
    }
    // default fallback
    return `/public/data/${id}.v2.json`;
  }

  // ---- Shape guards + hydration ------------------------------------------
  function isGraphShape(x) {
    return x && (Array.isArray(x.nodes) || Array.isArray(x.graph) || (x.nodes && typeof x.nodes === "object")) && x.version !== 2;
  }

  function isV2Raw(x) {
    return x && (x.version === 2 || x.schemaVersion === 2 || x.meters || x.acts);
  }

  function flattenV2ToNodes(raw) {
    // Accept acts[*].nodes OR acts[*].steps OR top-level nodes
    const nodes = [];
    if (Array.isArray(raw.nodes)) return raw.nodes.slice();

    if (Array.isArray(raw.acts)) {
      for (let ai = 0; ai < raw.acts.length; ai++) {
        const act = raw.acts[ai];
        if (Array.isArray(act.nodes)) {
          for (const n of act.nodes) nodes.push({ ...n, _actIndex: ai });
        } else if (Array.isArray(act.steps)) { // raw-steps fallback renderer
          let i = 0;
          for (const step of act.steps) {
            nodes.push({
              id: step.id || `act${ai + 1}-step${++i}`,
              type: step.type || "dialog",
              text: step.text || step.label || step.title || "",
              choices: step.choices || [],
              goto: step.goto,
              _actIndex: ai,
            });
          }
        }
      }
    }
    return nodes;
  }

  function addChoiceMeterHints(choice) {
    // Inject readable hints like [+Trust / -Tension]
    const effects = choice.effects || choice.meters || choice.effect || {};
    const deltas = [];
    for (const m of CONFIG.meters) {
      const v = effects[m];
      if (typeof v === "number" && v !== 0) {
        deltas.push(`${v > 0 ? "+" : ""}${v} ${m}`);
      }
    }
    if (deltas.length) {
      const hint = ` [${deltas.join(" / ")}]`;
      if (!choice._labelOriginal) choice._labelOriginal = choice.label || choice.text || "";
      const base = choice._labelOriginal || choice.label || choice.text || "";
      choice.label = `${base}${hint}`;
    }
    return choice;
  }

  function normalizeNodes(raw) {
    let nodes = [];
    if (isV2Raw(raw)) {
      nodes = flattenV2ToNodes(raw);
    } else if (isGraphShape(raw)) {
      if (Array.isArray(raw.nodes)) nodes = raw.nodes.slice();
      else if (Array.isArray(raw.graph)) nodes = raw.graph.slice();
      else nodes = Object.values(raw.nodes || {});
    }
    // Ensure id and choices array; inject hints
    const map = new Map();
    for (const n of nodes) {
      if (!n || !n.id) continue;
      if (!Array.isArray(n.choices)) n.choices = [];
      n.choices = n.choices.map(c => addChoiceMeterHints({ ...c }));
      map.set(n.id, n);
    }
    return { list: nodes, map };
  }

  // ---- Safe start node resolver ------------------------------------------
  function findSafeStartNodeId(nodes, raw) {
    const byId = new Map(nodes.map(n => [n.id, n]));

    // 1) Explicit start
    if (raw && raw.startNode && byId.has(raw.startNode)) return raw.startNode;

    // 2) Common candidates
    for (const c of CONFIG.startNodeCandidates) {
      if (byId.has(c)) return c;
    }

    // 3) First non-placeholder dialog node
    for (const n of nodes) {
      const isEnd = /end\s*of\s*act/i.test(n.title || n.label || n.text || "") || /end/i.test(n.type || "");
      const hasText = (n.text && n.text.trim().length > 0);
      if (!isEnd && (n.type === "dialog" || hasText)) return n.id;
    }

    // 4) Fallback to first node id
    return nodes[0]?.id || null;
  }

  // ---- Act / flow helpers -------------------------------------------------
  function isActEndNode(n) {
    if (!n) return false;
    if (/end\s*of\s*act/i.test(n.title || n.text || n.label || "")) return true;
    if (n.type && /actEnd|end/i.test(n.type)) return true;
    return false;
  }

  function nextActStartId(nodes, currentActIdx) {
    if (currentActIdx == null) return null;
    const targetAct = currentActIdx + 1;
    for (const n of nodes) {
      if (n._actIndex === targetAct) {
        // prefer explicit act-start
        if (/^act\d+-start$/i.test(n.id) || /start/i.test(n.id)) return n.id;
      }
    }
    // otherwise first node of the act
    for (const n of nodes) {
      if (n._actIndex === targetAct) return n.id;
    }
    return null;
  }

  // ---- HUD: animated meters ----------------------------------------------
  function animateBar(el, to, ms = 350) {
    if (!el) return;
    const now = performance.now();
    const from = parseFloat(el.dataset.value || "0");
    const target = Math.max(0, Math.min(100, to));
    const start = now;
    function step(t) {
      const k = Math.min(1, (t - start) / ms);
      const v = from + (target - from) * k;
      el.style.width = v + "%";
      el.dataset.value = String(v);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateHUD(state) {
    try {
      const m = state.meters || {};
      const metersPct = {};
      for (const k of CONFIG.meters) {
        const val = typeof m[k] === "number" ? m[k] : 0;
        const pct = Math.max(0, Math.min(100, val));
        metersPct[k] = pct;
        const bar = document.querySelector(`[data-meter="${k}"] .bar`);
        animateBar(bar, pct);
        const label = document.querySelector(`[data-meter="${k}"] .value`);
        if (label) label.textContent = String(val);
      }
      const actEl = document.querySelector("[data-hud=act]");
      if (actEl && state.actIndex != null) actEl.textContent = `Act ${state.actIndex + 1}`;
    } catch (e) {
      warn("HUD update skipped:", e);
    }
  }

  // ---- Engine driver ------------------------------------------------------
  function buildEngineState(nodes, startId, raw) {
    const initialMeters = {};
    for (const m of CONFIG.meters) initialMeters[m] = 0;
    return {
      nodes,
      byId: new Map(nodes.map(n => [n.id, n])),
      currentId: startId,
      actIndex: (nodes.find(n => n.id === startId)?._actIndex) ?? 0,
      meters: { ...initialMeters, ...(raw?.meters || {}) },
      history: [],
    };
  }

  function applyEffects(state, choice) {
    const eff = choice.effects || choice.meters || {};
    for (const k of CONFIG.meters) {
      const v = eff[k];
      if (typeof v === "number") state.meters[k] = (state.meters[k] || 0) + v;
    }
  }

  function gotoNode(state, targetId) {
    if (!state.byId.has(targetId)) {
      warn("goto unknown node:", targetId);
      return false;
    }
    state.history.push(state.currentId);
    state.currentId = targetId;
    const node = state.byId.get(targetId);
    if (node && node._actIndex != null) state.actIndex = node._actIndex;
    return true;
  }

  function renderNode(node) {
    // Minimal renderer hooks — assumes existing DOM structure from HUD v9.7.2-polish
    const dialogEl = document.querySelector("[data-ui=dialog]");
    const speakerEl = document.querySelector("[data-ui=speaker]");
    const choicesEl = document.querySelector("[data-ui=choices]");

    if (dialogEl) dialogEl.textContent = node.text || node.label || node.title || "";
    if (speakerEl) speakerEl.textContent = node.speaker || node.role || node.actor || "";

    if (choicesEl) {
      choicesEl.innerHTML = "";
      if (Array.isArray(node.choices) && node.choices.length) {
        for (const c of node.choices) {
          const btn = document.createElement("button");
          btn.className = "choice";
          btn.textContent = c.label || c.text || "Continue";
          btn.addEventListener("click", () => window.__amorvia_onChoice(c));
          choicesEl.appendChild(btn);
        }
      } else {
        // auto-continue if no explicit choices
        const btn = document.createElement("button");
        btn.className = "choice solo";
        btn.textContent = "Continue";
        btn.addEventListener("click", () => window.__amorvia_onChoice({ goto: node.goto }));
        choicesEl.appendChild(btn);
      }
    }
  }

  function computeNextId(state, node, choice) {
    // Priority: choice.goto -> node.goto -> act-end -> next-act-start
    const pick = (x) => typeof x === "string" && x.trim().length > 0 ? x.trim() : null;

    const fromChoice = pick(choice && (choice.goto || choice.target));
    if (fromChoice) return fromChoice;

    const fromNode = pick(node && (node.goto || node.next));
    if (fromNode) return fromNode;

    if (isActEndNode(node)) {
      const nid = nextActStartId(state.nodes, node._actIndex);
      if (nid) return nid;
    }

    // As a very last resort, go to the next sequential node in same act
    const idx = state.nodes.findIndex(n => n.id === node.id);
    if (idx >= 0 && idx + 1 < state.nodes.length) {
      const cand = state.nodes[idx + 1];
      if (cand && (cand._actIndex == null || cand._actIndex === node._actIndex)) return cand.id;
    }
    return null;
  }

  // ---- Boot sequence ------------------------------------------------------
  async function boot(defaultScenarioId) {
    try {
      const engine = await waitForEngine();
      log("Engine ready");

      const scenarioId = defaultScenarioId || (window.__SCENARIO_ID__ || "dating-after-breakup-with-child-involved");
      const path = await resolveScenarioPathById(scenarioId);
      log("Loading scenario:", scenarioId, "->", path);
      const raw = await fetchJSON(path);

      const { list: nodes } = normalizeNodes(raw);
      if (!nodes.length) throw new Error("Scenario has no nodes after normalization");

      const startId = findSafeStartNodeId(nodes, raw);
      if (!startId) throw new Error("Unable to find a start node");

      const state = buildEngineState(nodes, startId, raw);

      // Expose bindings
      window.__amorvia_state = state;

      window.__amorvia_onChoice = (choice) => {
        const s = window.__amorvia_state;
        const cur = s.byId.get(s.currentId);
        applyEffects(s, choice || {});
        updateHUD(s);
        const nextId = computeNextId(s, cur, choice || {});
        if (!nextId) {
          warn("No next node from:", cur);
          return;
        }
        gotoNode(s, nextId);
        renderNode(s.byId.get(s.currentId));
        updateHUD(s);
      };

      // Initial mount
      renderNode(state.byId.get(state.currentId));
      updateHUD(state);

      // Let the engine know we loaded (if it uses hooks)
      try {
        (engine.loadScenario || engine.LoadScenario).call(engine, raw);
        engine.start && engine.start();
      } catch (e) {
        // Non-fatal — our in-file driver will still render
        warn("Engine hooks failed (non-fatal):", e);
      }
    } catch (e) {
      err("Boot failed:", e);
      const dialogEl = document.querySelector("[data-ui=dialog]");
      if (dialogEl) dialogEl.textContent = `Boot error: ${e.message}`;
    }
  }

  // Auto-boot
  document.addEventListener("DOMContentLoaded", () => boot());
})();

