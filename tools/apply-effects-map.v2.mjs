// tools/apply-effects-map.v2.mjs
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const BACKUP = process.argv.includes('--backup');

const DATA = 'public/data/*.v2.json';

// --- EFFECTS MAP --------------------------------------------------
// file -> nodeId -> [ { idx: 0-based choice index, effects:[{meter,delta}...] }, ... ]
const PATCHES = {
  'co-parenting-with-bipolar-partner.v2.json': {
    // Node id inferred from your scan: a1_choice1
    'a1_choice1': [
      // 1) "Brief, factual summary; ask about medication schedule."
      { idx: 0, effects: [
        { meter: 'trust',   delta: 6 },
        { meter: 'tension', delta: -4 }
      ]},
      // 2) "Vent about frustrations from the week."
      { idx: 1, effects: [
        { meter: 'trust',       delta: -8 },
        { meter: 'tension',     delta: 10 },
        { meter: 'childStress', delta: 4 }
      ]}
    ]
  },

  'example-co-parenting.v2.json': {
    // Node id from your scan: n2
    'n2': [
      // 1) "Stay calm and validate"
      { idx: 0, effects: [
        { meter: 'trust',       delta: 6 },
        { meter: 'tension',     delta: -5 },
        { meter: 'childStress', delta: -2 }
      ]},
      // 2) "Ignore and take the child"
      { idx: 1, effects: [
        { meter: 'trust',       delta: -8 },
        { meter: 'tension',     delta: 10 },
        { meter: 'childStress', delta: 6 }
      ]},
      // 3) "Snap back"
      { idx: 2, effects: [
        { meter: 'trust',       delta: -10 },
        { meter: 'tension',     delta: 12 },
        { meter: 'childStress', delta: 5 }
      ]}
    ]
  },

  'sample-scenario.v2.json': {
    // Node id from your scan: act0_node_1
    'act0_node_1': [
      // 1) "Stay calm"
      { idx: 0, effects: [
        { meter: 'trust',   delta: 4 },
        { meter: 'tension', delta: -3 }
      ]},
      // 2) "Argue back"
      { idx: 1, effects: [
        { meter: 'trust',       delta: -6 },
        { meter: 'tension',     delta: 8 },
        { meter: 'childStress', delta: 3 }
      ]}
    ]
  },

  // --- Extend here as you author more decisions ---
};

// ------------------------------------------------------------------
function* iterChoiceNodes(json) {
  const acts = Array.isArray(json?.acts) ? json.acts : [];
  for (const act of acts) {
    const nodes = Array.isArray(act?.nodes) ? act.nodes : [];
    for (const n of nodes) {
      if (n?.type?.toLowerCase() === 'choice' && Array.isArray(n?.choices)) {
        yield n;
      }
    }
  }
}

const files = await globby(DATA);
let filesPatched = 0;
let mutations = 0;

for (const filepath of files) {
  const base = path.basename(filepath);
  const plan = PATCHES[base];
  if (!plan) continue;

  const raw = await fs.readFile(filepath, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    console.error('[effects-map] JSON parse failed:', base, e.message);
    continue;
  }

  let changed = false;
  for (const node of iterChoiceNodes(json)) {
    const nodePlan = plan[node.id];
    if (!nodePlan) continue;

    for (const patch of nodePlan) {
      const ch = node.choices[patch.idx];
      if (!ch) continue;

      const alreadyStructured =
        (ch.meters && Object.keys(ch.meters).length) ||
        (Array.isArray(ch.effects) && ch.effects.length) ||
        ((ch.meter || ch.key) && (ch.delta ?? ch.amount ?? ch.value));
      if (alreadyStructured) continue;

      ch.effects = patch.effects;
      mutations += 1;
      changed = true;
      console.log(`• ${base} node=${node.id} choice#${patch.idx+1} → effects:`, patch.effects);
    }
  }

  if (changed) {
    filesPatched += 1;
    if (WRITE) {
      if (BACKUP) await fs.writeFile(`${filepath}.bak`, raw, 'utf8');
      await fs.writeFile(filepath, JSON.stringify(json, null, 2), 'utf8');
    }
  }
}

console.log(`\n[effects-map] Mutations: ${mutations} across ${filesPatched} file(s). ${WRITE ? 'Files updated.' : 'Dry run (no changes).'}`);
console.log(`[effects-map] Extend PATCHES for additional nodes when ready.\n`);
