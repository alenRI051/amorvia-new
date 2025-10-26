/* js/engine/scenarioEngine.js
   Amorvia – robust loader with schema shims so no node renders as "(…)"
*/

export async function loadScenario(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch scenario: ${res.status}`);
  const raw = await res.json();

  const scn = normalizeScenario(raw);
  const entryId = getEntryNodeId(scn);
  if (!entryId || !scn.nodeMap[entryId]) {
    throw new Error(`Scenario has no entry node (resolved: ${String(entryId)})`);
  }

  applyUIMode(); // guarantees body.v2 if requested
  return scn;
}

/* -------------------------------- Normalize Scenario -------------------------------- */

function normalizeScenario(raw) {
  const scn = { ...raw };

  // Gather nodes from global nodes and per-act steps
  const nodeList = [];
  const pushNode = (n) => {
    if (!n) return;
    if (typeof n === "string") nodeList.push({ id: n });
    else nodeList.push(n);
  };

  if (Array.isArray(scn.nodes)) scn.nodes.forEach(pushNode);
  if (Array.isArray(scn.acts)) {
    scn.acts.forEach((act) => Array.isArray(act.steps) && act.steps.forEach(pushNode));
  }

  // Deduplicate by id (last write wins)
  const nodeMap = {};
  for (const n of nodeList) {
    if (!n || !n.id) continue;
    nodeMap[n.id] = harmonizeNode(n);
  }

  scn.nodes = Object.values(nodeMap);
  scn.nodeMap = nodeMap;

  // Ensure meters & UI defaults
  scn.meters = scn.meters || { trust: 0, tension: 0, childStress: 0 };
  scn.meterOrder = scn.meterOrder || ["trust", "tension", "childStress"];
  scn.ui = scn.ui || {};
  scn.ui.hud = scn.ui.hud || {};
  if (typeof scn.ui.hud.animate === "undefined") scn.ui.hud.animate = true;
  scn.ui.hud.animated = true;
  scn.ui.dialog = scn.ui.dialog || { defaultSpeaker: "Narrator" };

  // Backfill entry pointers for engines that require them
  const entryId = getEntryNodeId(scn);
  scn.entry = scn.entry || entryId;
  scn.entryNodeId = scn.entryNodeId || entryId;
  scn.start = scn.start || entryId;
  scn.startNodeId = scn.startNodeId || entryId;

  return scn;
}

function harmonizeNode(rawNode) {
  const node = { ...rawNode };

  // Speaker default
  node.speaker = node.speaker || "Narrator";

  // Text fallback across legacy keys (so renderer never sees empty text)
  node.text =
    pickText(node.text, node.content, node.line, node.description, node.title, node.caption) ??
    (Array.isArray(node.lines) ? node.lines.join("\n") : "");

  // Choices
  const srcChoices = Array.isArray(node.choices) ? node.choices : [];
  node.choices = srcChoices.map((c) => {
    const cc = { ...c };
    cc.label = pickText(cc.label, cc.text, cc.title, cc.caption, "Continue") || "Continue";
    cc.text = pickText(cc.text, cc.label, cc.title, "");
    cc.next = pickText(cc.next, cc.to, cc.target, cc.then, null);

    // Normalize effects → effects.meters
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

function pickText(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim().length) return v;
  }
  return undefined;
}

/* ------------------------------ Entry Node Resolution ------------------------------ */

export function getEntryNodeId(scn) {
  const keys = ["entry", "entryNodeId", "entryId", "start", "startNodeId", "root", "rootId"];
  for (const k of keys) {
    if (typeof scn[k] === "string" && scn[k]) return scn[k];
  }
  const flagged = scn.nodes?.find((n) => n && n.entry === true);
  if (flagged?.id) return flagged.id;

  const act1 = scn.acts?.find((a) => a && /^act1$/i.test(a.id || ""));
  if (act1?.steps?.length) {
    const first = act1.steps[0];
    return typeof first === "string" ? first : first?.id;
  }
  return scn.nodes?.[0]?.id || null;
}

/* ------------------------------------ UI Mode ------------------------------------- */

export function applyUIMode() {
  try {
    const url = new URL(window.location.href);
    const urlMode = url.searchParams.get("mode");
    const lsMode = localStorage.getItem("amorvia:mode");
    const mode = (urlMode || lsMode || "v2").toLowerCase();
    document.body.classList.toggle("v2", mode === "v2");
    localStorage.setItem("amorvia:mode", mode);

    const scn = url.searchParams.get("scenario");
    if (scn) localStorage.setItem("amorvia:scenario", scn);
  } catch {
    /* non-browser env */
  }
}

/* ----------------------------- Minimal Render Helpers ----------------------------- */
/* If your UI already has its own renderer, you can ignore these helpers.
   They are safe: they will never output "(…)" because text is guaranteed above.
*/
export function renderNode(node, { dialogEl, choicesEl }) {
  if (!node) return;

  dialogEl.textContent = (node.text || "").trim() || " "; // non-empty to keep height
  while (choicesEl.firstChild) choicesEl.removeChild(choicesEl.firstChild);

  (node.choices || []).forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = c.label || "Continue";
    btn.dataset.next = c.next || "";
    choicesEl.appendChild(btn);
  });
}
