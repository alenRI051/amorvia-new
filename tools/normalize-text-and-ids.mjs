import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

function pickText(t){ if(typeof t==='string') return t; if(t&&typeof t==='object') return t.hr||t.en||''; return ''; }

const files = await globby(['public/data/*.v2.json']);
let count = 0;
for (const f of files) {
  const raw = await readFile(f, 'utf-8');
  let data; try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts)) continue;
  let mutated = false;
  for (const act of data.acts) {
    if (!Array.isArray(act.nodes)) continue;
    for (const n of act.nodes) {
      if (!n) continue;
      if (n.next && !n.to) { n.to = n.next; delete n.next; mutated = true; }
      const nt = pickText(n.text);
      if (nt !== n.text) { n.text = nt; mutated = true; }
      if (Array.isArray(n.choices)) {
        for (const c of n.choices) {
          if (c?.next && !c.to) { c.to = c.next; delete c.next; mutated = true; }
          if (typeof c?.label === 'object') { c.label = c.label?.hr || c.label?.en || 'Continue'; mutated = true; }
        }
      }
    }
  }
  if (mutated) { await writeFile(f, JSON.stringify(data, null, 2), 'utf-8'); console.log('normalized:', f); count++; }
}
console.log('normalized files:', count);
