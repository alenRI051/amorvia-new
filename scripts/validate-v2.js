// scripts/validate-v2.js
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const dir = './public/data';
const files = readdirSync(dir).filter(f => f.endsWith('.v2.json'));

let failed = false;

for (const f of files) {
  const p = join(dir, f);
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const errs = [];

  if (!j.startAct) errs.push('missing startAct');
  if (!j.start) errs.push('missing start');
  if (!j.entry || !j.entry.actId || !j.entry.nodeId) errs.push('missing entry {actId,nodeId}');

  if (!Array.isArray(j.acts) || !j.acts.length) errs.push('acts[] missing');
  else {
    const a0 = j.acts.find(a => a.id === j.startAct) || j.acts[0];
    if (!a0) errs.push('cannot find startAct in acts[]');
    else {
      if (!a0.start) errs.push(`act ${a0.id} missing start`);
      const steps = a0.steps;
      const isObjMap = steps && typeof steps === 'object' && !Array.isArray(steps);
      if (!isObjMap) errs.push(`act ${a0.id} steps must be an object map`);
      if (isObjMap && !steps[a0.start]) errs.push(`act ${a0.id} start '${a0.start}' not found in steps`);
    }
  }

  if (errs.length) {
    failed = true;
    console.error(`❌ ${f}: ${errs.join('; ')}`);
  } else {
    console.log(`✅ ${f}`);
  }
}

process.exit(failed ? 1 : 0);
