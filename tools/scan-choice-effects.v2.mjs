// tools/scan-choice-effects.v2.mjs
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_GLOB = 'public/data/*.v2.json';

function hasEffects(choice) {
  if (!choice || typeof choice !== 'object') return false;
  if (choice.meters && Object.keys(choice.meters).length) return true;
  if (Array.isArray(choice.effects) && choice.effects.length) return true;
  if ((choice.meter || choice.key) && (choice.delta ?? choice.amount ?? choice.value)) return true;
  return false;
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
let totalChoices = 0;
let missing = 0;

for (const f of files) {
  const raw = await fs.readFile(f, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    console.error('[scan] JSON parse failed:', f, e.message);
    continue;
  }

  const problems = [];
  for (const { actId, node } of iterChoiceNodes(json)) {
    node.choices.forEach((ch, idx) => {
      totalChoices += 1;
      if (!hasEffects(ch)) {
        problems.push({
          nodeId: node.id, idx, label: ch?.label ?? ch?.id ?? '(no label)'
        });
      }
    });
  }

  if (problems.length) {
    missing += problems.length;
    console.log(`\n⚠ ${path.basename(f)} – missing effects on ${problems.length} choice(s):`);
    problems.forEach(p => {
      console.log(`  • node=${p.nodeId} choice#${p.idx+1} "${p.label}"`);
    });
  }
}

console.log(`\n[scan] Done. Choices scanned: ${totalChoices}. Missing effects: ${missing}.`);
if (!missing) console.log('✅ All choices have effects/meters.');
