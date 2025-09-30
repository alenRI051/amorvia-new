import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const files = await globby(['public/data/*.v2.json']);

let patched = 0;
for (const f of files) {
  let raw; try { raw = await readFile(f, 'utf-8'); } catch { continue; }
  let data; try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts)) continue;

  let mutated = false;
  for (let ai = 0; ai < data.acts.length; ai++) {
    const act = data.acts[ai];
    const actId = act?.id || `act${ai}`;
    if (!Array.isArray(act.nodes)) continue;
    for (let ni = 0; ni < act.nodes.length; ni++) {
      const n = act.nodes[ni];
      if (!n) continue;
      if (!n.id) {
        n.id = `${actId}_node_${ni}`;
        mutated = true;
      }
    }
  }

  if (mutated) {
    await writeFile(f, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[ids] patched', f);
    patched++;
  }
}
console.log('[ids] files patched:', patched);
