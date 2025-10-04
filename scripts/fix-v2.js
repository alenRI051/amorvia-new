// /scripts/fix-v2.js  (ESM)
// One-shot fixer for Amorvia v2 scenarios + index.
// Usage:
//   node scripts/fix-v2.js           # dry-run
//   node scripts/fix-v2.js --write   # apply changes

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(".");
const DATA_DIR = join(ROOT, "public", "data");
const INDEX_PATH = join(DATA_DIR, "v2-index.json");
const WRITE = process.argv.includes("--write");

const ok   = (m) => console.log(`✅ ${m}`);
const info = (m) => console.log(`ℹ️  ${m}`);
const warn = (m) => console.warn(`⚠️  ${m}`);
const err  = (m) => console.error(`❌ ${m}`);

const fileExists = (p) => { try { statSync(p); return true; } catch { return false; } };
const isObjMap   = (v) => v && typeof v === "object" && !Array.isArray(v);

// ---------- helpers --------------------------------------------------------

/** minimal deterministic id */
function autoId(prefix, seed) {
  const s = String(seed || Math.random()).replace(/[^a-z0-9]+/gi, "").slice(-6) || Math.floor(Math.random()*1e6).toString(36);
  return `${prefix}_${s}`;
}

/** ensure steps object map; convert from steps[] or nodes/nodes[] if needed */
function normalizeSteps(act) {
  if (isObjMap(act.steps) && Object.keys(act.steps).length) return act.steps;

  if (Array.isArray(act.steps) && act.steps.length) {
    const map = {};
    for (const node of act.steps) if (node?.id) map[node.id] = node;
    act.steps = map; delete act.nodes; return act.steps;
  }

  if (isObjMap(act.nodes) && Object.keys(act.nodes).length) {
    act.steps = act.nodes; delete act.nodes; return act.steps;
  }

  if (Array.isArray(act.nodes) && act.nodes.length) {
    const map = {};
    for (const node of act.nodes) if (node?.id) map[node.id] = node;
    act.steps = map; delete act.nodes; return act.steps;
  }

  act.steps = {}; return act.steps;
}

/** first key of object map */
function firstKey(obj) {
  const k = obj && typeof obj === "object" ? Object.keys(obj) : [];
  return k.length ? k[0] : null;
}

/** ensure an 'end' step exists; returns its id */
function ensureEndStep(act) {
  // common end ids we might already have
  const known = ["end", "endA", "endB", "endC", "a1_end", "a2_end", "a3_end", "a4_end", "a5_end"];
  for (const k of Object.keys(act.steps)) {
    if (known.includes(k) || /^end/i.test(k)) return k;
  }
  const id = (act.id ? `${act.id}_end` : "end");
  if (!act.steps[id]) {
    act.steps[id] = {
      id,
      text: "Scenario segment ends here.",
      choices: [{ id: "E", label: "Finish", effects: [], next: null }]
    };
  }
  return id;
}

/** ensure each step has at least one choice; and sanitize choices */
function normalizeChoices(act) {
  const endId = ensureEndStep(act);

  for (const [sid, step] of Object.entries(act.steps)) {
    if (!Array.isArray(step.choices) || step.choices.length === 0) {
      // Create a safe default choice to end the act
      step.choices = [{
        id: "E",
        label: "Continue",
        effects: [],
        next: endId
      }];
      continue;
    }

    // Sanitize existing choices
    step.choices = step.choices.map((ch, idx) => {
      const out = ch || {};
      if (!out.id) out.id = autoId("auto_c", `${sid}_${idx}`);
      if (!("next" in out)) out.next = endId; // safe default
      if (!("effects" in out)) out.effects = [];
      if (!("label" in out)) out.label = "Continue";
      return out;
    });
  }
}

/** Fill per-act start and top-level entry */
function ensureEntryFields(j) {
  // per act
  for (const act of j.acts) {
    if (!act.start) {
      const fk = firstKey(act.steps);
      if (fk) act.start = fk;
    }
  }
  // top-level
  const act = j.acts.find(a => a.id === j.startAct) || j.acts[0];
  const nodeId = j.start || act?.start || firstKey(act?.steps);
  if (!j.startAct && act?.id) j.startAct = act.id;
  if (!j.start && nodeId) j.start = nodeId;
  if (!j.startNode && nodeId) j.startNode = nodeId;
  if (!j.entryNode && nodeId) j.entryNode = nodeId;
  if (!j.entry || !j.entry.actId || !j.entry.nodeId) {
    j.entry = { actId: j.startAct || act?.id || null, nodeId: j.start || nodeId || null };
  }
}

// ---------- main fixers ----------------------------------------------------

function fixScenario(j, filename) {
  let changed = false;

  // Ensure acts array
  if (!Array.isArray(j.acts) || j.acts.length === 0) {
    warn(`${filename}: has no acts[] — skipping`);
    return { changed, summary: { id: j.id || filename, actsCount: 0 } };
  }

  // Ensure act ids
  j.acts.forEach((a, i) => { if (!a.id) { a.id = `act${i + 1}`; changed = true; } });

  for (const act of j.acts) {
    const before = JSON.stringify(act.steps);
    // Steps to object-map
    normalizeSteps(act);
    // Choices / end nodes
    normalizeChoices(act);
    // Per-act start
    if (!act.start) {
      const fk = firstKey(act.steps);
      if (fk) act.start = fk;
    }
    if (JSON.stringify(act.steps) !== before) changed = true;
  }

  const beforeTop = JSON.stringify([j.startAct, j.start, j.startNode, j.entryNode, j.entry]);
  ensureEntryFields(j);
  if (JSON.stringify([j.startAct, j.start, j.startNode, j.entryNode, j.entry]) !== beforeTop) changed = true;

  return { changed, summary: { id: j.id, actsCount: j.acts.length } };
}

function run() {
  // Load index
  let index = null;
  try { index = JSON.parse(readFileSync(INDEX_PATH, "utf8")); }
  catch (e) { err(`Cannot read ${INDEX_PATH}: ${e.message}`); process.exit(1); }

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith(".v2.json") && f !== "v2-index.json");
  const summaries = new Map();

  let changedAny = false;

  for (const f of files) {
    const path = join(DATA_DIR, f);
    let j;
    try { j = JSON.parse(readFileSync(path, "utf8")); }
    catch (e) { err(`${f}: invalid JSON (${e.message})`); continue; }

    const { changed, summary } = fixScenario(j, f);
    summaries.set(summary.id || f, summary);

    if (changed) {
      changedAny = true;
      if (WRITE) {
        writeFileSync(path, JSON.stringify(j, null, 2), "utf8");
        ok(`${f} — fixed & saved`);
      } else {
        info(`${f} — would fix`);
      }
    } else {
      ok(`${f} — ok`);
    }
  }

  // Sync index: remove meters; fix acts count
  let idxChanged = false;
  for (const entry of index.scenarios) {
    if ("meters" in entry) { delete entry.meters; idxChanged = true; }
    const s = summaries.get(entry.id);
    if (s && typeof entry.acts === "number" && s.actsCount && entry.acts !== s.actsCount) {
      entry.acts = s.actsCount;
      idxChanged = true;
      info(`v2-index: updated acts for '${entry.id}' → ${s.actsCount}`);
    }
  }
  if (idxChanged) {
    if (WRITE) {
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf-8");
      ok(`v2-index.json — updated`);
    } else {
      info(`v2-index.json — would update`);
    }
  }

  if (!WRITE) console.log("\nDry run complete. Add --write to apply changes.");
  if (!changedAny && !idxChanged) ok("No changes needed.");
}

run();
