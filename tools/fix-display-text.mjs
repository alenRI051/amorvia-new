// tools/fix-display-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import glob from 'glob';

const DISPLAY_KEYS = ['text', 'label', 'prompt', 'title', 'description', 'desc'];

function coalesceDisplay(obj) {
  for (const k of DISPLAY_KEYS) if (typeof obj?.[k] === 'string' && obj[k].trim()) return obj[k].trim();
  return null;
}

function fixFile(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);

  let changed = false;
  (json.acts || []).forEach((act) => {
    (act.steps || []).forEach((step) => {
      const disp = coalesceDisplay(step);
      if (!step.text && disp) {
        step.text = disp;
        changed = true;
      }
      // also normalize choices just in case
      (step.choices || []).forEach((c) => {
        if (!c.label) {
          const cDisp = coalesceDisplay(c);
          if (cDisp) {
            c.label = cDisp;
            changed = true;
          }
        }
      });
    });
  });

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
    console.log('[fix-display-text] Updated', file);
  } else {
    console.log('[fix-display-text] OK       ', file);
  }
}

const pattern = process.argv[2] || 'public/data/*.v2.json';
for (const file of glob.sync(pattern, { nodir: true })) fixFile(path.resolve(file));
