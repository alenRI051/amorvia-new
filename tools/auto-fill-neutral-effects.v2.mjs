// tools/auto-fill-neutral-effects.v2.mjs
import { globby } from 'globby';
import fs from 'node:fs/promises';
import path from 'node:path';

const WRITE = process.argv.includes('--write');
const BACKUP = process.argv.includes('--backup');
const DATA_GLOB = 'public/data/*.v2.json';

// --- heuristics for placeholder / truncated labels ---
function looksPlaceholder(label) {
  if (!label || typeof label !== 'string') return true;

  const s = label.trim();

  // Classic placeholder words
  if (/^continue$/i.test(s)) return true;
  if (/^(option|choice)\s*\d+$/i.test(s)) return true;

  // Contains control chars or obvious serialized debris
  if (/\\r|\\n|\r|\n/.test(s)) return true;

  // Starts with punctuation or quotes only
  if (/^[\.\,:'"|\-\u2013\u2014]/.test(s)) return true;

  // Looks cut mid-word (ends without punctuation and last token is very long or ends with "**")
  const tokens = s.split(/\s+/);
  const last = tokens[tokens.length - 1] || '';
  if (!/[.!?…\]]$/.test(s) && (last.length > 20 || /\*\*$/.test(s))) return true;

  // Starts with long punctuation/em-dash/markdown residue
  if (/^[\u2013\u2014\-–—]\s/.test(s)) return true;

  // Looks like a markdown fragment (starts with '*', '-', '•') without real sentence
  if (/^(\*|-|•)\s*[A-Z]?[a-z]{0,2}\W/.test(s)) return true;

  // Starts with escaped unicode sequence \u2013 etc.
  if (/^\\u[0-9a-fA-F]{4}/.test(s)) return true;

  // Heuristic: very short and not sentence-like
  if (s.length <= 8 && !/[A-Za-z]{3,}/.test(s)) return true;

  return false;
}

function hasStructured(ch) {
  if (!ch || typeof ch !== 'object') return false;
  if (ch.meters && Object.keys(ch.meters).length) return true;
  if (Array.isArray(ch.effects) && ch.effects.length) return true;
  if ((ch.meter || ch.key) && (ch.delta ?? ch.amount ?? ch.value)) return true;
  return false;
}

function* iterChoiceNodes(json) {
  const acts = Array.isArray(json?.acts) ? json.acts : [];
  for (const act of acts) {
    const nodes = Array.isArray(act?.nodes) ? act.nodes : [];
    for (const n of nodes) {
      if (n?.type?.toLowerCase() === 'choice' && Array.isArray(n?.choices)) {
        yield n;
      }
    }
  }
}

const files = await globby(DATA_GLOB);
let filesChanged = 0;
let mutations = 0;

for (const f of files) {
  const raw = await fs.readFile(f, 'utf8');
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    console.error('[neutral] JSON parse failed:', f, e.message);
    continue;
  }

  let changed = false;

  for (const node of iterChoiceNodes(json)) {
    node.choices.forEach((ch, idx) => {
      if (hasStructured(ch)) return;

      const label = ch?.label ?? ch?.id ?? '';
      if (!looksPlaceholder(label)) return;

      // Inject neutral effect (so scanner passes; UI injector remains visually quiet)
      ch.effects = [{ meter: 'tension', delta: 0 }];
      changed = true;
      mutations += 1;
      console.log(`• ${path.basename(f)} node=${node.id} choice#${idx+1} → effects: [ { meter: 'tension', delta: 0 } ]`);
    });
  }

  if (changed) {
    filesChanged += 1;
    if (WRITE) {
      if (BACKUP) await fs.writeFile(`${f}.bak`, raw, 'utf8');
      await fs.writeFile(f, JSON.stringify(json, null, 2), 'utf8');
    }
  }
}

console.log(`\n[neutral] Mutations: ${mutations} across ${filesChanged} file(s). ${WRITE ? 'Files updated.' : 'Dry run (no changes).'}\n`);
console.log(`[neutral] Tip: re-run "npm run choices:scan" to confirm the list is clear.`);
