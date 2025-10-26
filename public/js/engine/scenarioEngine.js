/* js/engine/scenarioEngine.js
   Amorvia – robust scenario loader with schema shims (v2-friendly)
*/

export async function loadScenario(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch scenario: ${res.status}`);
  const raw = await res.json();

  const scn = normalizeScenario(raw);
  const entryId = getEntryNodeId(scn);

  if (!entryId || !scn.nodeMap[entryId]) {
    throw new Error(`Scenario has no entry node (resolved id: ${String(entryId)})`);
  }
  applyUIMode(); // ensures body.v2 if v2 requested

  return scn;
}

/* ---------- Normalization (handles old keys: content/line/lines, etc.) ---------- */

function normalizeScenario(raw) {
  const scn = { ...raw };

  // Collect nodes from either `nodes` or per-act `steps`
  const nodeList = [];
  const pushNode = (n) => {
    if (!n) return;
    // Allow step ids as strings in acts
    if (typeof n === "string") {
      nodeList.push({ id: n });
      return;
    }
    nodeList.push(n);
  };

  if (Array.isArray(scn.nodes)) scn.nodes.forEach(pushNode);
  if (Array.isArray(scn.acts)) {
    scn.acts.forEach((act) => {
      if (Array.isArray(act.steps)) act.steps.forEach(pushNode);
    });
  }

  // Deduplicate by id, last write wins
  const byId = {};
  for (const node of nodeList) {
    if (!node || !node.id) continue;
    byId[node.id] = harmonizeNode(node);
  }

  // Rebuild canonical arrays
  scn.nodes = Object.values(byId);
  scn.nodeMap = byId;

  // Ensure meters shape exists
  scn.meters = scn.meters || { trust: 0, tension: 0, childStress: 0 };
  scn.meterOrder = scn.meterOrder || ["trust", "tension", "childStress"];

  // HUD/UI defaults
  scn.ui = scn.ui || {};
  scn.ui.hud = scn.ui.hud || {};
  if (typeof scn.ui.hud.animate === "undefined") scn.ui.hud.animate = true;
  // Back-compat
  scn.ui.hud.animated = true;

  scn.ui.dialog = scn.ui.dialog || { defaultSpeaker: "Narrator" };

  return scn;
}

function harmonizeNode(rawNode) {
  const node = { ...rawNode };

  // Speaker fallback
  node.speaker = node.speaker || "Narrator";

  // Text fallback across legacy keys
  node.text =
    pickFirst(node.text, node.content, node.line) ??
    (Array.isArray(node.lines) ? node.lines.join("\n") : "");

  // Choices normalization
  const srcChoices = Array.isArray(node.choices) ? node.choices : [];
  node.choices = srcChoices.map((c, idx) => {
    const cc = { ...c };
    cc.label = pickFirst(cc.label, cc.text, cc.title, cc.caption, "Continue");
    cc.text = pickFirst(cc.text, cc.label, "");
    // Normalize jumps (support next/to/target/then)
    cc.next = pickFirst(cc.next, cc.to, cc.target, cc.then, null);
    // Effects: accept either flat or meters; always expose meters for HUD
    if (cc.effects && typeof cc.effects === "object") {
      if (!cc.effects.meters) {
        const { trust, tension, childStress } = cc.effects;
        if (
          typeof trust !== "undefined" ||
          typeof tension !== "undefined" ||
          typeof childStress !== "undefined"
        ) {
          cc.effects = {
            ...cc.effects,
            meters: {
              trust: trust ?? 0,
              tension: tension ?? 0,
              childStress: childStress ?? 0,
            },
          };
        }
      }
    }
    return cc;
  });

  return node;
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.length) return v;
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/* ---------- Entry node resolution across variants ---------- */
export function getEntryNodeId(scn) {
  // Most common keys
  const keys = [
    "entry",
    "entryNodeId",
    "entryId",
    "start",
    "startNodeId",
    "root",
    "rootId",
  ];
  for (const k of keys) {
    if (typeof scn[k] === "string" && scn[k]) return scn[k];
  }

  // Node with entry:true
  const flagged = scn.nodes?.find((n) => n && n.entry === true);
  if (flagged?.id) return flagged.id;

  // First node in act1 if present
  const act1 = scn.acts?.find((a) => a && /^act1$/i.test(a.id || ""));
  if (act1 && Array.isArray(act1.steps) && act1.steps.length) {
    const first = act1.steps[0];
    return typeof first === "string" ? first : first?.id;
  }

  // Fallback: first node in nodes
  return scn.nodes?.[0]?.id || null;
}

/* ---------- Mode handling: ensure v2 class is present if requested ---------- */
export function applyUIMode() {
  try {
    const url = new URL(window.location.href);
    const urlMode = url.searchParams.get("mode");
    const lsMode = localStorage.getItem("amorvia:mode");
    const mode = (urlMode || lsMode || "v2").toLowerCase();
    document.body.classList.toggle("v2", mode === "v2");
    localStorage.setItem("amorvia:mode", mode);

    // Optional scenario param stickiness
    const scn = url.searchParams.get("scenario");
    if (scn) localStorage.setItem("amorvia:scenario", scn);
  } catch {
    /* no-op in non-browser environments */
  }
}

/* ---------- Simple renderer helpers (example) ---------- */
export function renderNode(node, { dialogEl, choicesEl }) {
  if (!node) return;

  const safeText = (node.text || "").trim();
  dialogEl.textContent = safeText.length ? safeText : " ";

  // Clear choices
  while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild);

  (node.choices || []).forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = c.label || "Continue";
    btn.dataset.next = c.next || "";
    choicesEl.appendChild(btn);
  });
}
