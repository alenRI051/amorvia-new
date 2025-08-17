// Markdown → data/scenarios.json migrator
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT_JSON = path.join(__dirname, '..', 'data', 'scenarios.json');

function parseFile(md) {
  const lines = md.split(/\r?\n/);
  let title = null;
  const acts = [];
  let current = null;

  const push = () => { if (current && current.steps.length) acts.push(current); current = null; };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# ')) { title = line.replace(/^#\s+/, '').trim(); continue; }
    if (line.startsWith('## ')) { push(); current = { title: line.replace(/^##\s+/, '').trim() || 'Act', steps: [] }; continue; }
    if (line.startsWith('- ')) { if (!current) current = { title: 'Act 1', steps: [] }; current.steps.push(line.replace(/^-+\s*/, '').trim()); continue; }
  }
  push();
  if (!title) throw new Error('Missing scenario title (# ...)');
  if (!acts.length) throw new Error('No acts/steps found');

  return {
    id: title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''),
    title,
    acts
  };
}

function main(){
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.toLowerCase().endsWith('.md')).sort();
  if (!files.length) { console.log('No .md files in tools/content'); process.exit(0); }

  const scenarios = [];
  for (const f of files) {
    const md = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8');
    try {
      const s = parseFile(md);
      scenarios.push(s);
      console.log(`Parsed ${f} → ${s.title} (${s.acts.length} acts)`);
    } catch (e) {
      console.error(`Skipping ${f}: ${e.message}`);
    }
  }
  const out = { scenarios };
  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', OUTPUT_JSON);
}

main();
