// tools/rehint-choices.v2.mjs
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');    // actually modify files
const BACKUP = args.has('--backup');  // write .bak alongside
const DATA_GLOB = 'public/data/*.v2.json';

const METER_LABELS = { trust: 'Trust', tension: 'Tension', childStress: 'Child Stress' };

function getChoiceDeltas(choice) {
  const totals = { trust: 0, tension: 0, childStress: 0 };
  const add = (k, v) => {
    const key = String(k || '').trim();
    if (!key) return;
    const norm =
      key in totals ? key :
      key.toLowerCase() === 'childstress' ? 'childStress' :
      key.toLowerCase();
    if (norm in totals) {
      const n = Number(v);
      if (!Number.isNaN(n) && n !== 0) totals[norm] += n;
    }
  };

  if (choice && typeof choice.meters === 'object') {
    for (const [k, v] of Object.entries(choice.meters)) add(k, v);
  }
  if (Array.isArray(choice?.effects)) {
    for (const e of choice.effects) {
      if (!e) continue;
      add(e.meter ?? e.key, e.delta ?? e.amount ?? e.value);
    }
  }
  if (choice?.meter || choice?.key) add(choice.meter ?? choice.key, choice.delta ?? choice.amount ?? choice.value);
  return totals;
}

function formatHint(totals) {
  const parts = [];
  for (const k of Object.keys(METER_LABELS)) {
    const v = totals[k];
    if (!v) continue;
    const sign = v > 0 ? '+' : '';
    parts.push(`${sign}${v} ${METER_LABELS[k]}`);
  }
  return parts.length ? ` [${parts.join(', ')}]` : ''; // Brackets for persisted text
}

function* iterChoiceNodes(json) {
  const acts = Array.isArray(json?.acts) ? json.acts : [];
  for (const act of acts) {
    const nodes = Array.isArray(act?.nodes) ? act.nodes : [];
    for (const n of nodes) {
      if (n?.type?.toLowerCase() === 'choice' && Array.isArray(n?.choices)) {
        yield { actId: act.id, node: n };
      }
    }
  }
}

const files = await globby(DATA_GLOB);
let changedFiles = 0;
let totalMutations = 0;

for (const f of files) {
  const raw = await fs.readFile(f, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    console.error('[rehint] JSON parse failed:', f, e.message);
    continue;
  }

  let mutated = false;
  for (const { actId, node } of iterChoiceNodes(json)) {
    node.choices.forEach((ch, idx) => {
      const deltas = getChoiceDeltas(ch);
      const hint = formatHint(deltas);
      if (!hint) return;

      const base = ch.label ?? ch.id ?? '';
      // Idempotency: if label already ends with this hint, skip
      if (typeof base === 'string' && base.endsWith(hint)) return;

      const newLabel = `${base}${hint}`.trim();
      if (newLabel !== base) {
        ch.label = newLabel;
        mutated = true;
        totalMutations += 1;
        console.log(`• ${path.basename(f)} node=${node.id} choice#${idx+1} -> "${newLabel}"`);
      }
    });
  }

  if (mutated) {
    changedFiles += 1;
    if (WRITE) {
      if (BACKUP) await fs.writeFile(`${f}.bak`, raw, 'utf8');
      await fs.writeFile(f, JSON.stringify(json, null, 2), 'utf8');
    }
  }
}

console.log(`\n[rehint] Mutations: ${totalMutations} across ${changedFiles} file(s). ${WRITE ? 'Files updated.' : 'Dry run (no changes).'}`);
console.log(`[rehint] Use "--write --backup" to persist with backups.`);
