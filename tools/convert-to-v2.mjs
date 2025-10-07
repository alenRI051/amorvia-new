#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const patternArg = args.find(a => a.startsWith('--pattern=')) || '--pattern=public/data/*.v2.json';
const write = args.includes('--write');
const backup = !args.includes('--no-backup');

const pattern = patternArg.split('=')[1];

const DEFAULT_METERS = ['trust','tension','childStress'];
const DEFAULT_METER_OBJ = { trust:0, tension:0, childStress:0 };

function toEffectsObject(effects) {
  // effects may be array [{meter, delta}] or object or missing
  if (!effects) return {};
  if (Array.isArray(effects)) {
    const out = {};
    for (const e of effects) {
      if (!e || typeof e !== 'object') continue;
      const m = e.meter;
      const d = Number(e.delta);
      if (typeof m === 'string' && Number.isFinite(d)) {
        out[m] = (out[m] ?? 0) + d;
      }
    }
    return out;
  }
  if (typeof effects === 'object') return effects;
  return {};
}

function ensureTwoChoices(step) {
  if (!Array.isArray(step.choices)) step.choices = [];
  // Normalize existing choices
  step.choices = step.choices.map((c, idx) => {
    const choice = (typeof c === 'object' && c) ? { ...c } : {};
    if (choice.text && !choice.label) choice.label = choice.text;
    delete choice.text;
    // rename next->to
    if (choice.next !== undefined && choice.to === undefined) choice.to = choice.next;
    delete choice.next;
    // normalize effects
    choice.effects = toEffectsObject(choice.effects);
    // to must be a string (schema); default to "menu" if null/undefined/invalid
    if (choice.to === null || choice.to === undefined || typeof choice.to !== 'string') {
      choice.to = 'menu';
    }
    if (!choice.id) {
      choice.id = `${step.id || 'step'}c${idx+1}`;
    }
    if (!choice.label) choice.label = 'Continue';
    if (!choice.tone) choice.tone = 'neutral';
    return choice;
  });

  // Ensure at least 2 choices
  while (step.choices.length < 2) {
    step.choices.push({
      id: `${step.id || 'step'}c${step.choices.length+1}`,
      label: step.choices.length === 0 ? 'Continue' : 'Return to menu',
      tone: 'neutral',
      effects: {},
      to: step.choices.length === 0 ? (step.to || 'menu') : 'menu'
    });
  }
}

function normalizeScenario(scn, fname) {
  const out = { ...scn };

  // version
  out.version = 2;

  // meters
  if (!out.meters) {
    out.meters = { ...DEFAULT_METER_OBJ };
  } else if (Array.isArray(out.meters)) {
    const obj = {};
    for (const m of out.meters) obj[m] = 0;
    // ensure defaults exist
    for (const m of DEFAULT_METERS) if (!(m in obj)) obj[m] = 0;
    out.meters = obj;
  } else if (typeof out.meters === 'object') {
    for (const m of DEFAULT_METERS) if (!(m in out.meters)) out.meters[m] = 0;
  } else {
    out.meters = { ...DEFAULT_METER_OBJ };
  }

  // acts
  if (!Array.isArray(out.acts)) out.acts = [];
  out.acts = out.acts.map((act, aIdx) => {
    const A = { ...act };
    // migrate nodes -> steps
    if (!A.steps && Array.isArray(A.nodes)) {
      A.steps = A.nodes;
      delete A.nodes;
    }
    // ensure steps array
    if (!Array.isArray(A.steps)) {
      if (A.steps && typeof A.steps === 'object') {
        A.steps = [A.steps];
      } else {
        A.steps = [];
      }
    }

    A.steps = A.steps.map((s, sIdx) => {
      const step = (typeof s === 'object' && s) ? { ...s } : { text: String(s) };

      if (!step.id) step.id = `a${aIdx+1}s${sIdx+1}`;

      // migrate fields
      if (step.text === undefined && typeof s === 'string') step.text = s;
      // some old formats might have 'title' only
      if (!step.text && step.title) step.text = step.title;

      // tone optional; keep if present
      // summary not supported by v2 schema → drop
      if (step.summary) delete step.summary;

      // normalize choices
      ensureTwoChoices(step);
      return step;
    });

    // ensure act id/title
    if (!A.id) A.id = `act${aIdx+1}`;
    if (!A.title) A.title = `Act ${aIdx+1}`;
    return A;
  });

  return out;
}

function isAlreadyV2(obj) {
  // quick heuristic: version===2, meters object, steps exist with label/to
  if (obj?.version !== 2) return false;
  if (!obj?.meters || Array.isArray(obj.meters) || typeof obj.meters !== 'object') return false;
  const act = obj?.acts?.[0];
  const step = act?.steps?.[0];
  const choice = step?.choices?.[0];
  return !!(choice && typeof choice.label === 'string' && 'to' in choice && !Array.isArray(choice.effects));
}

const files = glob.sync(pattern, { cwd: process.cwd(), nodir: true });
if (!files.length) {
  console.error(`[convert-to-v2] No files matched: ${pattern}`);
  process.exit(1);
}

let changed = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.warn(`[convert-to-v2] Skipping (invalid JSON): ${f}`);
    continue;
  }
  const before = JSON.stringify(json);
  const already = isAlreadyV2(json);
  const normalized = already ? json : normalizeScenario(json, f);
  const after = JSON.stringify(normalized, null, 2);

  if (before !== after) {
    changed++;
    if (write) {
      if (backup) {
        const bak = `${f}.bak`;
        if (!fs.existsSync(bak)) fs.writeFileSync(bak, raw, 'utf8');
      }
      fs.writeFileSync(f, after + '\n', 'utf8');
      console.log(`[convert-to-v2] Updated ${f}`);
    } else {
      console.log(`[convert-to-v2] Would update ${f} (run with --write)`);
    }
  } else {
    console.log(`[convert-to-v2] No change ${f}`);
  }
}

console.log(`[convert-to-v2] Completed. ${changed} file(s) ${write ? 'updated' : 'would be updated'}.`);
