import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'public/data/sample-scenario.v2.json';

function pickFallbackTo(actNodes, nodeIndex) {
  // prefer next node in same act, else first node id, else null
  const next = actNodes[nodeIndex + 1];
  if (next?.id) return next.id;
  const first = actNodes[0];
  return first?.id || null;
}

(async () => {
  try {
    const raw = await readFile(FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.acts) || !Array.isArray(data.acts[0]?.nodes)) {
      console.log('[sample-fix] Unexpected structure, aborting.');
      process.exit(1);
    }
    const nodes = data.acts[0].nodes;
    // Find all choice nodes and ensure each choice has `to` (map `next` -> `to` if needed)
    let mutated = false;
    nodes.forEach((node, idx) => {
      if (node?.type !== 'choice') return;
      if (!Array.isArray(node.choices)) node.choices = [];
      node.choices.forEach((c) => {
        if (!c) return;
        if (c.next && !c.to) { c.to = c.next; delete c.next; mutated = true; }
        if (!c.to) {
          c.to = node.to || pickFallbackTo(nodes, idx) || node.id;
          mutated = true;
        }
        if (typeof c.label === 'object') {
          c.label = c.label?.hr || c.label?.en || 'Continue';
          mutated = true;
        }
      });
      // ensure at least 2 choices
      if (node.choices.length < 2) {
        const to = node.to || pickFallbackTo(nodes, idx) || node.id;
        node.choices.push({ id: 'auto_continue', label: 'Continue', to });
        mutated = true;
      }
    });

    if (mutated) {
      await writeFile(FILE, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[sample-fix] Patched:', FILE);
    } else {
      console.log('[sample-fix] No changes needed.');
    }
  } catch (e) {
    console.error('[sample-fix] Error:', e.message);
    process.exit(2);
  }
})();
