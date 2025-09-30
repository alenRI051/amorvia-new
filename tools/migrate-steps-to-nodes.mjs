import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const files = await globby(['public/data/*.v2.json']);

function clone(x){ return JSON.parse(JSON.stringify(x)); }

for (const f of files) {
  const raw = await readFile(f, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch(e){ console.log('skip invalid json', f); continue; }
  if (!Array.isArray(data.acts)) continue;

  let mutated = false;
  for (const act of data.acts) {
    if (Array.isArray(act.steps) && !Array.isArray(act.nodes)) {
      // migrate steps -> nodes
      const nodes = [];
      for (const step of act.steps) {
        if (typeof step === 'string') {
          // wrap bare string step as a simple narration node that transitions to this id
          nodes.push({
            id: `auto_${Math.random().toString(36).slice(2,8)}`,
            type: 'narration',
            text: { en: '', hr: '' },
            next: step
          });
          mutated = true;
          continue;
        }
        const n = clone(step);
        if (Array.isArray(n.choices)) {
          for (const c of n.choices) {
            if (c && c.to && !c.next) {
              c.next = c.to;
              delete c.to;
              mutated = true;
            }
          }
        }
        nodes.push(n);
      }
      act.nodes = nodes;
      delete act.steps;
      mutated = true;
    } else if (Array.isArray(act.steps) && Array.isArray(act.nodes)) {
      // both exist - prefer nodes, drop steps
      delete act.steps;
      mutated = true;
    }
  }

  if (mutated) {
    await writeFile(f, JSON.stringify(data, null, 2), 'utf-8');
    console.log('migrated:', f);
  }
}
