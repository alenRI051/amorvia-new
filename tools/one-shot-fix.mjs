import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';

const ALLOWED = new Set(['line','choice','goto','end']);

function pickText(t){ if(typeof t==='string') return t; if(t&&typeof t==='object') return t.hr||t.en||''; return ''; }
function normType(t, node){
  t = (t||'').toLowerCase();
  if (ALLOWED.has(t)) return t;
  if (t === 'transition') return (node?.to || node?.next) ? 'goto' : 'end';
  if (t === 'narration' || t === 'event') return 'line';
  if (t === 'ending') return 'end';
  return 'line';
}
function fallbackTo(nodes, idx, node){
  return node?.to || nodes[idx+1]?.id || nodes[0]?.id || node?.id || null;
}

const files = await globby(['public/data/*.v2.json']);

let changed = 0;
for (const f of files) {
  let raw; try { raw = await readFile(f, 'utf-8'); } catch { continue; }
  let data; try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts)) continue;

  let mutated = false;

  for (const act of data.acts) {
    // steps -> nodes
    if (Array.isArray(act.steps)) {
      if (!Array.isArray(act.nodes)) act.nodes = [];
      for (const step of act.steps) {
        if (typeof step === 'string') {
          act.nodes.push({ id: `auto_${Math.random().toString(36).slice(2,8)}`, type:'goto', text:'', to: step });
          mutated = true;
        } else if (step && typeof step === 'object') {
          const node = { ...step };
          if (node.next && !node.to) { node.to = node.next; delete node.next; mutated = true; }
          node.type = normType(node.type, node);
          node.text = pickText(node.text);
          if (Array.isArray(node.choices)) {
            for (const c of node.choices) {
              if (!c) continue;
              if (c.next && !c.to) { c.to = c.next; delete c.next; mutated = true; }
              if (typeof c.label === 'object') c.label = c.label?.hr || c.label?.en || 'Continue';
              if (!c.to) c.to = node.to || null;
            }
          }
          act.nodes.push(node);
          mutated = true;
        }
      }
      delete act.steps;
      mutated = true;
    }
    if (!Array.isArray(act.nodes)) continue;

    // normalize nodes
    for (let i=0;i<act.nodes.length;i++) {
      const n = act.nodes[i];
      if (!n) continue;
      if (n.next && !n.to) { n.to = n.next; delete n.next; mutated = true; }
      const t = normType(n.type, n);
      if (t !== n.type) { n.type = t; mutated = true; }
      const txt = pickText(n.text);
      if (txt !== n.text) { n.text = txt; mutated = true; }
      if (n.type === 'choice') {
        if (!Array.isArray(n.choices)) n.choices = [];
        n.choices = n.choices.map(c => {
          if (!c) return c;
          if (c.next && !c.to) { c.to = c.next; delete c.next; mutated = true; }
          if (typeof c.label === 'object') { c.label = c.label?.hr || c.label?.en || 'Continue'; mutated = true; }
          if (!c.to) { c.to = fallbackTo(act.nodes, i, n); mutated = true; }
          return c;
        });
        if (n.choices.length < 2) {
          const to = fallbackTo(act.nodes, i, n);
          n.choices.push({ id:'auto_continue', label:'Continue', to });
          mutated = true;
        }
      }
    }
  }

  if (mutated) {
    await writeFile(f, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[fix] updated', f);
    changed++;
  }
}
console.log('[fix] files changed:', changed);
