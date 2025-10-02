// tools/apply-effects-map.v2.mjs
// Apply curated effects to specific choice nodes across v2 scenario files.
// - Idempotent: won't overwrite existing structured effects.
// - Use: `npm run choices:apply-map` (dry run)
//        `npm run choices:apply-map:write` (persist + .bak)

import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const BACKUP = process.argv.includes('--backup');

const DATA = 'public/data/*.v2.json';

// ------------------------------------------------------------------
// EFFECTS MAP
// file -> nodeId -> [ { idx: <0-based choice index>, effects:[{meter,delta}...] }, ... ]
//
// NOTES:
// • We only inject effects if a choice currently has NO structured meters/effects.
// • Extend this map as you finalize more content.
// ------------------------------------------------------------------
const PATCHES = {
  // --- Option B: meaningful deltas for the last outstanding warning ---
  // co-parenting.v2.json – node a1c1, choice#1 (index 0)
  // Intended: constructive, plan-forward option -> builds trust, reduces tension.
  'co-parenting.v2.json': {
    'a1c1': [
      { idx: 0, effects: [
        { meter: 'trust',   delta: 5 },
        { meter: 'tension', delta: -3 }
      ] }
      // choice#2 was already handled by the neutral filler (tension:0) earlier
    ]
  },

  // --- Previously suggested safe patches you can keep/adjust as needed ---
  'co-parenting-with-bipolar-partner.v2.json': {
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
  }
};

// ------------------------------------------------------------------
// Helpers
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

function hasStructured(ch) {
  if (!ch || typeof ch !== 'object') return false;
  if (ch.meters && Object.keys(ch.meters).length) return true;
  if (Array.isArray(ch.effects) && ch.effects.length) return true;
  if ((ch.meter || ch.key) && (ch.delta ?? ch.amount ?? ch.value)) return true;
  return false;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
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

      if (hasStructured(ch)) continue; // respect existing authored data

      ch.effects = patch.effects;
      mutations += 1;
      changed = true;
      console.log(`• ${base} node=${node.id} choice#${patch.idx + 1} → effects:`, patch.effects);
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
