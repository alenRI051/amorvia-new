import { readFile, writeFile } from 'node:fs/promises';
import { globby } from 'globby';
import crypto from 'node:crypto';

const files = await globby(['public/data/*.v2.json']);

const ALLOWED_TYPES = new Set(['line','choice','goto','end']);

function genId(seed, idx) {
  return (seed + '_' + idx + '_' + crypto.createHash('md5').update(seed + ':' + idx).digest('hex').slice(0,6));
}

function pickText(t) {
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object') {
    return t.hr || t.en || '';
  }
  return '';
}

for (const f of files) {
  const raw = await readFile(f, 'utf-8');
  let data;
  try { data = JSON.parse(raw); } catch { continue; }
  if (!Array.isArray(data.acts)) continue;

  let mutated = false;
  data.version = data.version || '1.0.0';

  for (let ai=0; ai<data.acts.length; ai++) {
    const act = data.acts[ai];
    if (!act) continue;

    // migrate steps -> nodes if needed
    if (Array.isArray(act.steps) && !Array.isArray(act.nodes)) {
      act.nodes = act.steps.map((step, si) => {
        if (typeof step === 'string') {
          return { id: genId(act.id || ('act'+ai), si), type: 'goto', to: step, text: '' };
        }
        const node = { ...step };
        // id
        if (!node.id) node.id = genId(act.id || ('act'+ai), si);
        // type normalization
        let t = (node.type || '').toLowerCase();
        if (!t || !ALLOWED_TYPES.has(t)) {
          if (t === 'choice') {
            t = 'choice';
          } else if (t === 'transition') {
            // becomes goto if has next/to, else end
            t = (node.next || node.to) ? 'goto' : 'end';
          } else if (t === 'narration' || t === 'event') {
            t = 'line';
          } else if (t === 'ending') {
            t = 'end';
          } else {
            t = 'line';
          }
        }
        node.type = t;
        // next -> to
        if (node.next && !node.to) { node.to = node.next; delete node.next; }
        // text normalization
        node.text = pickText(node.text);
        // normalize choices
        if (Array.isArray(node.choices)) {
          for (const c of node.choices) {
            if (!c) continue;
            if (c.next && !c.to) { c.to = c.next; delete c.next; }
            if (typeof c.label === 'object') {
              c.label = c.label?.hr || c.label?.en || 'Continue';
            }
          }
        }
        return node;
      });
      delete act.steps;
      mutated = true;
    } else if (Array.isArray(act.nodes)) {
      // normalize existing nodes
      for (let si=0; si<act.nodes.length; si++) {
        const node = act.nodes[si];
        if (!node) continue;
        let changed = false;
        if (!node.id) { node.id = genId(act.id || ('act'+ai), si); changed = true; }
        let t = (node.type || '').toLowerCase();
        if (!ALLOWED_TYPES.has(t)) {
          if (t === 'choice') t = 'choice';
          else if (t === 'transition') t = (node.next || node.to) ? 'goto' : 'end';
          else if (t === 'narration' || t === 'event') t = 'line';
          else if (t === 'ending') t = 'end';
          else t = 'line';
          node.type = t; changed = true;
        }
        if (node.next && !node.to) { node.to = node.next; delete node.next; changed = true; }
        const newText = pickText(node.text);
        if (newText !== node.text) { node.text = newText; changed = true; }
        if (Array.isArray(node.choices)) {
          for (const c of node.choices) {
            if (!c) continue;
            if (c.next && !c.to) { c.to = c.next; delete c.next; changed = true; }
            if (typeof c.label === 'object') {
              c.label = c.label?.hr || c.label?.en || 'Continue'; changed = true;
            }
          }
        }
        mutated = mutated || changed;
      }
    }
  }

  if (mutated) {
    await writeFile(f, JSON.stringify(data, null, 2), 'utf-8');
    console.log('migrated v2:', f);
  }
}
