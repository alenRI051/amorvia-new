// tools/audit-amorvia.mjs
import { execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
function sh(cmd){ return execSync(cmd, { encoding:'utf8' }).trim(); }
async function readText(p){ try { return await fs.readFile(p, 'utf8'); } catch { return null; } }
function sha1(buf){ return crypto.createHash('sha1').update(buf).digest('hex'); }

const files = sh('git ls-files').split('\n').filter(Boolean);

// Maps
const byBase = new Map();
const byPath = new Map();
for (const f of files){
  byPath.set(f, true);
  const base = path.basename(f);
  (byBase.get(base) ?? byBase.set(base, []).get(base)).push(f);
}

// Duplicate basenames
const duplicateBasenames = [...byBase.entries()]
  .filter(([,list]) => list.length > 1)
  .map(([base, list]) => ({ base, paths: list.sort() }));

// Same-basename different content
const sameNameContent = [];
for (const [base, list] of byBase.entries()){
  if (list.length < 2) continue;
  const buckets = new Map(); // hash -> paths[]
  for (const f of list){
    const buf = await fs.readFile(f);
    const h = sha1(buf);
    (buckets.get(h) ?? buckets.set(h, []).get(h)).push(f);
  }
  if (buckets.size > 1){
    sameNameContent.push({
      base,
      groups: [...buckets.entries()].map(([hash, paths]) => ({ hash, paths: paths.sort() }))
    });
  }
}

// Root/Public shadows
const publicShadows = [];
const set = new Set(files);
for (const f of files){
  if (f.startsWith('public/')){
    const alt = f.slice('public/'.length);
    if (set.has(alt)) publicShadows.push({ root: alt, public: f });
  }
}

// SW files
const swFiles = files.filter(f => /(^|\/)sw(\.js|[-_]?register\.js)$/.test(f));

// Offenders with /public/data/
const offenders = [];
for (const f of files){
  if (!/\.(js|mjs|ts|jsx|tsx|html|css)$/i.test(f)) continue;
  const txt = await readText(f);
  if (txt && /\/public\/data\//.test(txt)) offenders.push(f);
}

// Index vs data
let indexIds = [];
let dataFiles = [];
let indexIssues = { missing: [], orphan: [] };
const indexPath = ['public/data/v2-index.json', 'data/v2-index.json'].find(p => byPath.has(p));
if (indexPath){
  try {
    const idx = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    const scenarios = Array.isArray(idx) ? idx : (idx.scenarios || []);
    indexIds = scenarios.map(s => s.id).filter(Boolean).sort();
  } catch {}
}
const dataDir = byPath.has('public/data/v2-index.json') ? 'public/data' : (byPath.has('data/v2-index.json') ? 'data' : null);
if (dataDir){
  dataFiles = (await fs.readdir(dataDir)).filter(n => n.endsWith('.v2.json')).map(n => n.replace(/\.v2\.json$/, '')).sort();
}
if (indexIds.length || dataFiles.length){
  const setIdx = new Set(indexIds);
  const setDf = new Set(dataFiles);
  indexIssues.missing = indexIds.filter(id => !setDf.has(id));
  indexIssues.orphan = dataFiles.filter(id => !setIdx.has(id));
}

// Reachability (index.html + imports)
const entryHtml = ['index.html','public/index.html'].find(p => byPath.has(p));
const referenced = new Set();
const queue = [];
function normHref(href){
  if (!href) return null;
  href = href.replace(/[?#].*$/, '');
  if (href.startsWith('/')) href = href.replace(/^\//,'');
  return href;
}
if (entryHtml){
  const html = await readText(entryHtml);
  if (html){
    const linkRe = /<link[^>]+href=['"]([^'"]+)['"]/g;
    const scriptRe = /<script[^>]+src=['"]([^'"]+)['"]/g;
    for (const m of html.matchAll(linkRe)){ const h = normHref(m[1]); if (h){ referenced.add(h); queue.push(h); } }
    for (const m of html.matchAll(scriptRe)){ const s = normHref(m[1]); if (s){ referenced.add(s); queue.push(s); } }
  }
}
const importRe = /\bimport\s*(?:[^'"]*from\s*)?['"]([^'"]+)['"]/g;
const dynImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
async function followImports(relPath){
  const onDisk = [relPath, path.posix.join('public', relPath)].find(p => byPath.has(p));
  if (!onDisk) return;
  const txt = await readText(onDisk);
  if (!txt) return;
  for (const m of txt.matchAll(importRe)){
    let href = normHref(m[1]);
    if (!href) continue;
    if (!href.startsWith('/') && !href.startsWith('http')){
      href = path.posix.normalize(path.posix.join(path.posix.dirname(relPath), href));
    } else if (href.startsWith('/')) { href = href.replace(/^\//,''); } else { continue; }
    if (!referenced.has(href)){ referenced.add(href); queue.push(href); }
  }
  for (const m of txt.matchAll(dynImportRe)){
    let href = normHref(m[1]);
    if (!href) continue;
    if (!href.startsWith('/') && !href.startsWith('http')){
      href = path.posix.normalize(path.posix.join(path.posix.dirname(relPath), href));
    } else if (href.startsWith('/')) { href = href.replace(/^\//,''); } else { continue; }
    if (!referenced.has(href)){ referenced.add(href); queue.push(href); }
  }
}
while (queue.length){
  const next = queue.shift();
  if (/\.(js|mjs|ts|jsx|tsx)$/i.test(next)) await followImports(next);
}
function listUnder(dir){ return files.filter(f => f.startsWith(dir + '/')); }
const candidates = [
  ...listUnder('js'), ...listUnder('css'),
  ...listUnder('public/js'), ...listUnder('public/css')
].filter(f => /\.(js|mjs|css)$/i.test(f));
const unusedAssets = candidates.filter(f => {
  const rel = f.startsWith('public/') ? f.slice('public/'.length) : f;
  return !referenced.has(rel);
}).sort();

// Large files
const largeFiles = [];
for (const f of files){
  const st = await fs.stat(f);
  if (st.size >= 1024*1024) largeFiles.push({ path:f, sizeBytes: st.size });
}

// Emit report
const report = [];
function section(t){ report.push(`\n## ${t}\n`); }
function list(items){ if (!items.length){ report.push('- (none)\n'); return; } items.forEach(i => report.push(`- ${typeof i === 'string'? i : JSON.stringify(i)}`)); report.push('\n'); }

report.push('# Amorvia Repo Audit Report\n');
report.push(`_Generated: ${new Date().toISOString()}_\n`);

section('Duplicate basenames (same filename in different folders)');
list(duplicateBasenames.map(d => `${d.base} ->\n  - ${d.paths.join('\n  - ')}`));

section('Same basename but different content (by SHA1)');
list(sameNameContent.map(g => `${g.base}:\n` + g.groups.map(({hash,paths}) => `  ${hash}\n    - ${paths.join('\n    - ')}`).join('\n')));

section('Root/Public shadow pairs (same logical path exists in both)');
list(publicShadows.map(p => `${p.root} <-> ${p.public}`));

section('Service Worker/Register files found');
list(swFiles);

section('Files containing "/public/data/" fetch paths');
list(offenders);

section('Index vs Data files consistency');
report.push(`- Index file: ${indexPath || '(not found)'}\n`);
report.push(`- Data dir  : ${dataDir || '(not found)'}\n`);
report.push(`- Missing   : ${indexIssues.missing.length ? indexIssues.missing.join(', ') : '(none)'}\n`);
report.push(`- Orphan    : ${indexIssues.orphan.length ? indexIssues.orphan.join(', ') : '(none)'}\n\n`);

section('Referenced assets count');
report.push(`- Referenced: ${referenced.size}\n`);

section('Unused JS/CSS candidates (best-effort)');
list(unusedAssets);

section('Large files (>= 1MB)');
list(largeFiles.map(f => `${f.path} — ${(f.sizeBytes/1048576).toFixed(2)} MB`));

await fs.mkdir('tools/audit-output', { recursive: true });
await fs.writeFile('tools/audit-output/audit-report.md', report.join('\n'), 'utf8');
await fs.writeFile('tools/audit-output/referenced.json', JSON.stringify([...referenced].sort(), null, 2), 'utf8');

console.log('\n✅ Audit complete.');
console.log('- Markdown: tools/audit-output/audit-report.md');
console.log('- Referenced list: tools/audit-output/referenced.json');
