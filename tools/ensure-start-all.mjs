// Ensure every scenario in public/data/*.v2.json has a proper start node in act1
// Usage: node tools/ensure-start-all.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const files = await globby(['public/data/*.v2.json']);

function normType(t, node){
  const allowed = new Set(['line','choice','goto','end']);
  t = (t||'').toLowerCase();
  if (allowed.has(t)) return t;
  if (t === 'transition') return (node?.to ? 'goto' : 'end');
  if (t === 'narration' || t === 'event') return 'line';
  if (t === 'ending') return 'end';
  return 'line';
}
function pickText(t){ if(typeof t==='string') return t; if(t&&typeof t==='object') return t.hr||t.en||''; return ''; }

let patched = 0;
for (const f of files) {
  const raw = await readFile(f, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts) || data.acts.length === 0) continue;

  const act = data.acts[0];
  if (!Array.isArray(act.nodes) || act.nodes.length === 0) continue;

  // Normalize node types/text for safety
  let mutated = false;
  for (const n of act.nodes) {
    const t = normType(n.type, n);
    if (t !== n.type) { n.type = t; mutated = true; }
    const txt = pickText(n.text);
    if (txt !== n.text) { n.text = txt; mutated = true; }
  }

  const hasStart = act.nodes.some(n => n.id === 'start');
  if (!hasStart) {
    const first = act.nodes[0];
    act.nodes.unshift({ id:'start', type:'goto', text:'', to:first.id || null });
    mutated = true;
  } else {
    // If start exists but doesn't lead anywhere, point to next node
    const s = act.nodes.find(n=>n.id==='start');
    if (s && s.type !== 'choice' && !s.to && act.nodes[1]?.id) {
      s.type = 'goto';
      s.to = act.nodes[1].id;
      s.text = s.text || '';
      mutated = true;
    }
  }

  if (mutated) {
    await writeFile(f, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[ensure-start-all] patched', f);
    patched++;
  }
}
console.log('[ensure-start-all] files patched:', patched);
