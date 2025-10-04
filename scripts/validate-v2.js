// /scripts/validate-v2.js  (ESM compatible)
// Validate Amorvia v2 scenarios + v2-index.json
// Usage: node scripts/validate-v2.js

import { readdirSync, readFileSync, statSync } from "fs";
import { join, resolve, sep } from "path";

const ROOT = resolve(".");
const DATA_DIR = join(ROOT, "public", "data");
const INDEX_PATH = join(DATA_DIR, "v2-index.json");

// --- helpers ---------------------------------------------------------------
const ok = (msg) => console.log(`✅ ${msg}`);
const warn = (msg) => console.warn(`⚠️  ${msg}`);
const err = (msg) => console.error(`❌ ${msg}`);

const fileExists = (p) => {
  try { statSync(p); return true; } catch { return false; }
};

const isObjMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// --- load index ------------------------------------------------------------
let index;
try {
  index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
} catch (e) {
  err(`Could not read ${INDEX_PATH}: ${e.message}`);
  process.exit(1);
}

if (!Array.isArray(index.scenarios)) {
  err(`Index must have "scenarios" array.`);
  process.exit(1);
}

// --- collect scenarios on disk --------------------------------------------
const allScenarioFiles = readdirSync(DATA_DIR).filter(
  (f) => f.endsWith(".v2.json") && f !== "v2-index.json"
);

// --- validations -----------------------------------------------------------
let failed = false;
const DIFFICULTIES = new Set(["easy", "normal", "medium", "hard", "info"]);

function validateScenarioFile(absPath) {
  const name = absPath.replace(`${DATA_DIR}${sep}`, "");
  let j;
  try { j = JSON.parse(readFileSync(absPath, "utf8")); }
  catch (e) { err(`${name}: invalid JSON (${e.message})`); failed = true; return; }

  const errors = [];

  // top-level
  if (!j.id) errors.push("missing id");
  if (!Array.isArray(j.acts) || j.acts.length === 0) errors.push("acts[] missing/empty");

  // entry fields (make patches unnecessary)
  if (!j.startAct) errors.push("missing startAct");
  if (!j.start) errors.push("missing start");
  if (!j.startNode) errors.push("missing startNode");
  if (!j.entryNode) errors.push("missing entryNode");
  if (!j.entry || !j.entry.actId || !j.entry.nodeId) errors.push("missing entry {actId,nodeId}");

  // validate acts & steps map
  if (Array.isArray(j.acts) && j.acts.length) {
    const startAct = j.acts.find(a => a.id === j.startAct) || j.acts[0];
    if (!startAct) errors.push(`cannot find startAct '${j.startAct}' in acts[]`);

    for (const act of j.acts) {
      if (!act.id) errors.push("act missing id");
      if (!act.start) errors.push(`act ${act.id} missing start`);
      const steps = act.steps;
      if (!isObjMap(steps)) {
        errors.push(`act ${act.id} steps must be an object map (keys = step ids)`);
      } else {
        if (!steps[act.start]) errors.push(`act ${act.id} start '${act.start}' not found in steps`);
        // basic shape of each step
        for (const [sid, node] of Object.entries(steps)) {
          if (!node || node.id !== sid) errors.push(`act ${act.id} step key '${sid}' must contain { id: '${sid}', ... }`);
          if (!Array.isArray(node.choices)) errors.push(`act ${act.id} step '${sid}' missing choices[]`);
          else {
            for (const ch of node.choices) {
              if (!ch || !ch.id) errors.push(`act ${act.id} step '${sid}' choice missing id`);
              if (!("next" in ch)) errors.push(`act ${act.id} step '${sid}' choice '${ch.id}' missing next (can be null)`);
            }
          }
        }
      }
    }
  }

  if (errors.length) {
    failed = true;
    err(`${name}: ${errors.join("; ")}`);
  } else {
    ok(name);
  }
  return { id: j.id, actsCount: j.acts?.length ?? 0 };
}

const diskSummaries = new Map();
for (const f of allScenarioFiles) {
  const abs = join(DATA_DIR, f);
  const summary = validateScenarioFile(abs);
  if (summary && summary.id) diskSummaries.set(summary.id, summary);
}

// --- validate index entries ------------------------------------------------
for (const entry of index.scenarios) {
  const pathRel = entry.path;
  const entryId = entry.id;
  const idxErrors = [];

  if (!entryId) idxErrors.push("missing id");
  if (!pathRel) idxErrors.push("missing path");

  // Check file exists
  const absPath = pathRel ? join(DATA_DIR, pathRel.replace(/^data\//, "")) : null;
  if (absPath && !fileExists(absPath)) idxErrors.push(`path file not found: ${pathRel}`);

  // Difficulty enum
  if (entry.difficulty && !DIFFICULTIES.has(entry.difficulty)) {
    idxErrors.push(`invalid difficulty '${entry.difficulty}'`);
  }

  // Tags shape
  if (entry.tags && !Array.isArray(entry.tags)) {
    idxErrors.push("tags must be an array");
  }

  // 🚫 No meters for v2 entries (prevents HUD duplicates)
  if (entry.meters) idxErrors.push("remove 'meters' from v2 index entries");

  // acts count cross-check (best effort; only if file loaded above)
  const disk = diskSummaries.get(entryId);
  if (disk && typeof entry.acts === "number" && disk.actsCount && entry.acts !== disk.actsCount) {
    idxErrors.push(`acts count mismatch: index=${entry.acts} vs file=${disk.actsCount}`);
  }

  if (idxErrors.length) {
    failed = true;
    err(`v2-index: entry '${entryId || "(no id)"}' → ${idxErrors.join("; ")}`);
  } else {
    ok(`v2-index: ${entryId}`);
  }
}

// --- summary ---------------------------------------------------------------
if (failed) {
  err("Validation failed.");
  process.exit(1);
} else {
  ok("All checks passed.");
}
