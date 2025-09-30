import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { globby } from 'globby';
import Ajv from 'ajv';

const args = new Set(process.argv.slice(2));
const isCI = args.has('--ci');

const SCHEMA_PATH = path.resolve('public/schema/scenario.v2.schema.json');
const DATA_GLOB = 'public/data/*.v2.json';

async function loadJSON(p) {
  const raw = await readFile(p, 'utf-8');
  return JSON.parse(raw);
}

(async () => {
  try {
    const schema = await loadJSON(SCHEMA_PATH);
    const ajv = new Ajv({ strict: false, allErrors: true, allowUnionTypes: true });
    const validate = ajv.compile(schema);

    const files = await globby([DATA_GLOB], { absolute: false });
    if (files.length === 0) {
      console.log(`[schema-lint] No files matched ${DATA_GLOB}`);
      process.exit(0);
    }

    let errorCount = 0;
    for (const f of files) {
      const data = await loadJSON(f);
      const ok = validate(data);
      if (!ok) {
        errorCount += 1;
        console.log(`\n✖ ${f}`);
        for (const err of validate.errors ?? []) {
          console.log(`  • ${err.instancePath || '(root)'} ${err.message}`);
          if (err.params) {
            const p = { ...err.params };
            // avoid noisy long prints
            if (p.allowedValues && Array.isArray(p.allowedValues)) {
              p.allowedValues = p.allowedValues.slice(0, 6);
            }
            console.log(`    params: ${JSON.stringify(p)}`);
          }
        }
      } else if (!isCI) {
        console.log(`✔ ${f}`);
      }
    }

    if (errorCount > 0) {
      console.log(`\n[schema-lint] Failed: ${errorCount} file(s) invalid.`);
      process.exit(1);
    } else {
      console.log(`\n[schema-lint] Success: all files valid.`);
    }
  } catch (e) {
    console.error('[schema-lint] Error:', e.message);
    process.exit(2);
  }
})();
