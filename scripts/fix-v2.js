// /scripts/fix-v2.js  (ESM)
// One-shot fixer for Amorvia v2 scenarios + index.
// Usage:
//   node scripts/fix-v2.js           # dry-run (shows what it would change)
//   node scripts/fix-v2.js --write   # applies changes

import { readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(".");
const DATA_DIR = join(ROOT, "public", "data");
const INDEX_PATH = join(DATA_DIR, "v2-index.json");
const WRITE = process.argv.includes("--write");

const ok = (m) => console.log(`✅ ${m}`);
const info = (m) => console.log(`ℹ️  ${m}`);
const warn = (m) => console.warn(`⚠️  ${m}`);
const err = (m) => console.error(`❌ ${m}`);

const fileExists = (p) => {
  try { statSync(p); return true; } catch { return false; }
};
const isObjMap = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Turn steps/nodes into an object map keyed by id */
function normalizeSteps(act) {
  // If already an object map with keys, keep it.
  if (isObjMap(act.steps) && Object.keys(act.steps).length) return act.steps;

  // If steps array -> map
  if (Array.isArray(act.steps) && act.steps.length) {
    const map = {};
    for (const node of act.steps) {
      if (!node || !node.id) continue;
      map[node.id] = node;
    }
    act.steps = map;
    delete act.nodes;
    return act.steps;
  }

  // If nodes object -> use it as steps
  if (isObjMap(act.nodes) && Object.keys(act.nodes).length) {
    act.steps = act.nodes;
    delete act.nodes;
    return act.steps;
  }

  // If nodes array -> map
  if (Array.isArray(act.nodes) && act.nodes.length) {
    const map = {};
    for (const node of act.nodes) {
      if (!node || !node.id) continue;
      map[node.id] = node;
    }
    act.steps = map;
    delete act.nodes;
    return act.steps;
  }

  // Nothing to map
  act.steps = act.steps || {};
  return act.steps;
}

/** Pick first key of an object map */
function firstKey(obj) {
  const k = obj && typeof obj === "object" ? Object.keys(obj) : [];
  return k.length ? k[0] : null;
}

function fixScenario(j, filename) {
  let changed = false;

  // Ensure acts array
  if (!Array.isArray(j.acts) || j.acts.length === 0) {
    warn(`${filename}: has no acts[] — skipping`);
    return { changed, summary: { id: j.id || filename, actsCount: 0 } };
  }

  // Ensure act ids
  j.acts.forEach((a, i) => {
    if (!a.id) { a.id = `act${i + 1}`; changed = true; }
  });

  // Normalize steps and per-act start
  for (const act of j.acts) {
    const beforeKeys = isObjMap(act.steps) ? Object.keys(act.steps).length : Array.isArray(act.steps) ? act.steps.length : 0;
    const steps = normalizeSteps(act);
    const afterKeys = Object.keys(steps).length;
    if (afterKeys !== beforeKeys) changed = true;

    if (!act.start) {
      const fk = firstKey(steps);
      if (fk) { act.start = fk; changed = true; }
    }
  }

  // Compute entry from (startAct || first act) and its start
  let act = j.acts.find(a => a.id === j.startAct) || j.acts[0];
  let nodeId = j.start || act?.start || firstKey(act?.steps);

  // Fill top-level entry fields
  if (!j.startAct && act?.id) { j.startAct = act.id; changed = true; }
  if (!j.start && nodeId) { j.start = nodeId; changed = true; }
  if (!j.startNode && nodeId) { j.startNode = nodeId; changed = true; }
  if (!j.entryNode && nodeId) { j.entryNode = nodeId; changed = true; }
  if (!j.entry || !j.entry.actId || !j.entry.nodeId) {
    j.entry = { actId: j.startAct || act?.id || null, nodeId: j.start || nodeId || null };
    changed = true;
  }

  return { changed, summary: { id: j.id, actsCount: j.acts.length } };
}

function run() {
  // Load index
  let index = null;
  try {
    index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  } catch (e) {
    err(`Cannot read ${INDEX_PATH}: ${e.message}`);
    process.exit(1);
  }

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
      writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
      ok(`v2-index.json — updated`);
    } else {
      info(`v2-index.json — would update`);
    }
  }

  if (!WRITE) {
    console.log("\nDry run complete. Add --write to apply changes.");
  }
  if (!changedAny && !idxChanged) {
    ok("No changes needed.");
  }
}

run();
