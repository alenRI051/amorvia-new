// Usage:
//   node tools/ensure-start-node.mjs public/data/co-parenting-with-bipolar-partner.v2.json
// or run without args to patch that default file.

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_FILE = 'public/data/co-parenting-with-bipolar-partner.v2.json';
const file = process.argv[2] || DEFAULT_FILE;

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

(async () => {
  const raw = await readFile(file, 'utf-8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.acts) || data.acts.length === 0) {
    data.acts = [ { id: 'act1', title: 'Act 1', nodes: [ { id: 'start', type: 'end', text: 'Empty scenario.' } ] } ];
    await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[ensure-start] created minimal act & start:', file);
    process.exit(0);
  }

  let mutated = false;
  for (const act of data.acts) {
    if (!Array.isArray(act.nodes) || act.nodes.length === 0) {
      act.nodes = [ { id: 'start', type: 'end', text: 'Empty act.' } ];
      mutated = true;
      continue;
    }

    // normalize all nodes
    for (const n of act.nodes) {
      const t = normType(n.type, n);
      if (t !== n.type) { n.type = t; mutated = true; }
      const txt = pickText(n.text);
      if (txt !== n.text) { n.text = txt; mutated = true; }
    }

    const first = act.nodes[0];
    if (first.id !== 'start') {
      const startNode = {
        id: 'start',
        type: 'goto',
        text: '',
        to: first.id
      };
      act.nodes.unshift(startNode);
      mutated = true;
    } else if (first.type === 'end') {
      // If start exists but is end, try to point it to next node
      const nxt = act.nodes[1];
      if (nxt?.id) {
        first.type = 'goto';
        first.to = nxt.id;
        first.text = first.text || '';
        mutated = true;
      }
    } else if (!first.to && first.type !== 'choice' && act.nodes[1]?.id) {
      first.to = act.nodes[1].id;
      mutated = true;
    }
  }

  if (mutated) {
    await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[ensure-start] patched:', file);
  } else {
    console.log('[ensure-start] no changes needed:', file);
  }
})().catch(e => {
  console.error('[ensure-start] error:', e.message);
  process.exit(1);
});
