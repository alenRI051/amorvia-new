// Simple Markdown → scenarios.json migrator
// Usage: node tools/migrate.js
const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const OUTPUT_JSON = path.join(__dirname, '..', 'data', 'scenarios.json');

function parseFile(md) {
  const lines = md.split(/\r?\n/);
  let scenarioTitle = null;
  const acts = [];
  let currentAct = null;

  const pushAct = () => {
    if (currentAct && currentAct.steps.length > 0) acts.push(currentAct);
    currentAct = null;
  };

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('# ')) {
      // Scenario title
      scenarioTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }
    if (line.startsWith('## ')) {
      // New act
      pushAct();
      const title = line.replace(/^##\s+/, '').trim();
      currentAct = { title: title || 'Act', steps: [] };
      continue;
    }
    if (line.startsWith('- ')) {
      // Step line
      const step = line.replace(/^-+\s*/, '').trim();
      if (!currentAct) {
        // default Act 1 if user forgot header
        currentAct = { title: 'Act 1', steps: [] };
      }
      if (step) currentAct.steps.push(step);
      continue;
    }
  }
  pushAct();

  if (!scenarioTitle) throw new Error('Missing "# Scenario Title" at top');
  if (acts.length === 0) throw new Error('No acts/steps found — use "## Act ..." and list items "-" for steps');

  return {
    id: scenarioTitle.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''),
    title: scenarioTitle,
    acts
  };
}

function main(){
  if (!fs.existsSync(CONTENT_DIR)) fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.toLowerCase().endsWith('.md')).sort();
  if (files.length === 0) {
    console.log('No .md files found in tools/content. Place your scenarios there.');
    process.exit(0);
  }
  const scenarios = [];
  for (const f of files) {
    const p = path.join(CONTENT_DIR, f);
    const md = fs.readFileSync(p, 'utf8');
    try {
      const s = parseFile(md);
      scenarios.push(s);
      console.log('Parsed:', f, '→', s.title, `(${s.acts.length} acts)`);
    } catch (e) {
      console.error('Skipping', f, '—', e.message);
    }
  }
  const out = { scenarios };
  const outDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), 'utf8');
  console.log('\\nWrote', OUTPUT_JSON);
}

main();
