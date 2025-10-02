// tools/extract-effects-from-labels.v2.mjs
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const BACKUP = args.has('--backup');
const DATA_GLOB = 'public/data/*.v2.json';

// tolerant minus detection (normal '-' and Unicode '−')
const MINUS = '\u2212';
const NUM_RE = /([+\-−]?\d+)/; // +5, -4, −6
const BRACKETS_RE = /\[([^\]]+)\]\s*$/; // capture last [...] at end
const SEP_RE = /[,|;]+/; // comma / semicolon / pipe

function normalizeMeterName(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  // common variants & synonyms
  if (s.includes('trust')) return 'trust';
  if (s.includes('tension')) return 'tension';
  if (s.includes('child')) return 'childStress';
  if (s.includes('stress')) return 'childStress';
  if (s.replace(/\s+/g, '') === 'childstress') return 'childStress';
  return null;
}

function parseHintItem(item) {
  // examples:
  //  "Co-parent Trust +8"
  //  "Child Stress −6"
  //  "+5 Trust"
  //  "Tension -3"
  const t = String(item).trim();
  const m = t.match(NUM_RE);
  if (!m) return null;

  const numStr = m[1].replace(MINUS, '-'); // convert Unicode minus to ASCII
  const delta = Number(numStr);
  if (Number.isNaN(delta) || delta === 0) return null;

  // text without the number gives us the meter name candidates
  const name = t.replace(NUM_RE, '').trim();
  const meter = normalizeMeterName(name) || normalizeMeterName(t);
  if (!meter) return null;

  return { meter, delta };
}

function extractEffectsFromLabel(label) {
  if (!label || typeof label !== 'string') return [];
  const m = label.match(BRACKETS_RE);
  if (!m) return [];

  const inside = m[1]; // "Co-parent Trust +8, Co-parent Tension −4"
  const items = inside.split(SEP_RE).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const it of items) {
    const parsed = parseHintItem(it);
    if (parsed) out.push(parsed);
  }
  // compress duplicates of same meter
  const agg = {};
  for (const e of out) {
    agg[e.meter] = (agg[e.meter] || 0) + e.delta;
  }
  return Object.entries(agg).map(([meter, delta]) => ({ meter, delta }));
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
let mutations = 0;
let filesChanged = 0;

for (const f of files) {
  const raw = await fs.readFile(f, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    console.error('[extract] JSON parse failed:', f, e.message);
    continue;
  }

  let changed = false;

  for (const { node } of iterChoiceNodes(json)) {
    node.choices.forEach((ch, idx) => {
      const hasStructured =
        (ch.meters && Object.keys(ch.meters).length) ||
        (Array.isArray(ch.effects) && ch.effects.length) ||
        ((ch.meter || ch.key) && (ch.delta ?? ch.amount ?? ch.value));

      if (hasStructured) return; // nothing to do

      const label = ch.label ?? ch.id ?? '';
      const effects = extractEffectsFromLabel(label);
      if (effects.length) {
        ch.effects = effects;
        changed = true;
        mutations += 1;
        console.log(`• ${path.basename(f)} node=${node.id} choice#${idx+1} → effects:`, effects);
      }
    });
  }

  if (changed) {
    filesChanged += 1;
    if (WRITE) {
      if (BACKUP) await fs.writeFile(`${f}.bak`, raw, 'utf8');
      await fs.writeFile(f, JSON.stringify(json, null, 2), 'utf8');
    }
  }
}

console.log(`\n[extract] Done. Mutations: ${mutations} across ${filesChanged} file(s). ${WRITE ? 'Files updated.' : 'Dry run (no changes).'}\n`);
console.log(`[extract] Tip: run "npm run choices:scan" again to confirm the missing list shrinks.`);
