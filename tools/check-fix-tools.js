const fs = require('fs');
const files = [
  'tools/migrate-steps-to-nodes.v2.mjs',
  'tools/normalize-text-and-ids.mjs',
  'tools/ensure-min-choices.v2.mjs',
  'tools/one-shot-fix.mjs',
  'tools/add-missing-node-ids.mjs'
];
let ok = true;
for (const f of files) {
  if (!fs.existsSync(f)) { console.error('[fix:schemas] Missing', f); ok = false; }
}
if (!ok) process.exit(1);
console.log('[fix:schemas] All tools present.');