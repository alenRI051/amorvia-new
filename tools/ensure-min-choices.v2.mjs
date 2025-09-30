import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const files = await globby(['public/data/*.v2.json']);

for (const f of files) {
  const raw = await readFile(f, 'utf-8');
  let data; try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts)) continue;

  let mutated = false;
  for (const act of data.acts) {
    if (!Array.isArray(act.nodes)) continue;
    for (const node of act.nodes) {
      if (node?.type === 'choice') {
        const ch = Array.isArray(node.choices) ? node.choices : [];
        if (ch.length < 2) {
          const first = ch[0] || {};
          const to = first.to || node.to || node.id || null;
          const fallback = {
            id: (first.id ? first.id + '_alt' : 'auto_continue'),
            label: typeof first.label === 'string' ? first.label : 'Continue',
            to
          };
          node.choices = [ first, fallback ].filter(Boolean);
          mutated = true;
        }
      }
    }
  }
  if (mutated) { await writeFile(f, JSON.stringify(data, null, 2), 'utf-8'); console.log('patched min choices:', f); }
}
