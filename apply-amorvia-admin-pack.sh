# save as: apply-amorvia-admin-pack.sh
# run with: bash apply-amorvia-admin-pack.sh

set -euo pipefail

mkdir -p api/_lib public/admin public/js

################################################################################
# api/_lib/auth.ts
################################################################################
cat > api/_lib/auth.ts <<'TS'
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return true; // if no ADMIN_TOKEN, allow
  const header = (req.headers['x-admin-token'] as string) || '';
  const query  = (req.query.token as string) || '';
  const token  = header || query;
  if (token !== required) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}
TS

################################################################################
# api/export-logs.ts  (fetch-based, robust in dev)
################################################################################
cat > api/export-logs.ts <<'TS'
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';
import { fetch } from 'undici';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const fmt  = ((req.query.format as string) || 'jsonl').toLowerCase();
  const prefix = `events/${date}`;
  const token  = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });

  try {
    const urls: string[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page = await list({ prefix, token, limit: 1000, cursor });
      for (const b of page.blobs) urls.push(b.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const batchSize = 25;
    const jsonLines: string[] = [];
    const rows: string[] = ['ts,event,ipHash,ua,referer,path,data'];

    for (let i = 0; i < urls.length; i += batchSize) {
      const slice = urls.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        slice.map(async (u: string) => {
          const r = await fetch(u);
          return r.ok ? r.text() : '';
        })
      );
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const text = (r.value || '').trim();
        if (!text) continue;

        if (fmt === 'csv') {
          try {
            const obj: any = JSON.parse(text);
            const esc = (s: unknown) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
            rows.push([esc(obj.ts),esc(obj.event),esc(obj.ipHash),esc(obj.ua),
                       esc(obj.referer),esc(obj.path),esc(JSON.stringify(obj.data))].join(','));
          } catch {}
        } else {
          jsonLines.push(text);
        }
      }
    }

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.csv"`);
      return res.status(200).send(rows.join('\n') + '\n');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.jsonl"`);
      return res.status(200).send(jsonLines.join('\n') + '\n');
    }
  } catch (err) {
    console.error('[export-logs] error', err);
    return res.status(500).json({ ok: false, error: 'Export failed' });
  }
}
TS

################################################################################
# api/prune-logs.ts  (retention endpoint)
################################################################################
cat > api/prune-logs.ts <<'TS'
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, del } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });

  const daysParam = Number(req.query.days ?? 30);
  const keepDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.floor(daysParam) : 30;
  const dryRun = String(req.query.dryRun ?? '0') === '1';

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - keepDays);

  const toDelete: string[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const page = await list({ prefix: 'events/', token, limit: 1000, cursor });
      for (const b of page.blobs) {
        const m = b.pathname.match(/^events\/(\d{4}-\d{2}-\d{2})\//);
        if (!m) continue;
        const dt = new Date(`${m[1]}T00:00:00Z`);
        if (!isNaN(dt.getTime()) && dt < cutoff) toDelete.push(b.url);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error('[prune-logs] list error', err);
    return res.status(500).json({ ok: false, error: 'List failed' });
  }

  if (dryRun) {
    return res.status(200).json({
      ok: true, keptDays: keepDays, dryRun: true,
      toDeleteCount: toDelete.length, sample: toDelete.slice(0, 5),
    });
  }

  let deleted = 0;
  const batch = 100;
  try {
    for (let i = 0; i < toDelete.length; i += batch) {
      const slice = toDelete.slice(i, i + batch);
      await del(slice, { token });
      deleted += slice.length;
    }
  } catch (err) {
    console.error('[prune-logs] delete error', err);
    return res.status(500).json({ ok: false, error: 'Delete failed', deletedCount: deleted });
  }

  return res.status(200).json({
    ok: true, keptDays: keepDays, dryRun: false,
    toDeleteCount: toDelete.length, deletedCount: deleted,
  });
}
TS

################################################################################
# public/admin/index.html (with Help link + Retention block)
################################################################################
cat > public/admin/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Amorvia — Logs Admin</title>
  <link rel="stylesheet" href="./styles.css"/>
</head>
<body>
  <header>
    <h1>Amorvia — <span class="muted">Logs Admin</span></h1>
    <p class="muted">Browse and export Blob-stored events.
      <a href="/admin/help.html" style="margin-left:12px;">Help</a>
    </p>
  </header>

  <main>
    <section class="controls">
      <label>Date
        <input id="date" type="date"/>
      </label>

      <label>Admin Token (optional)
        <input id="token" type="password" placeholder="ADMIN_TOKEN if enabled"/>
      </label>

      <div class="actions">
        <button id="btnList">List Logs</button>
        <button id="btnExportJsonl">Export JSONL</button>
        <button id="btnExportCsv">Export CSV</button>
        <button id="btnToday" class="secondary">Today</button>
      </div>

      <!-- Retention / Prune -->
      <fieldset style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;border:1px solid #1e293b;padding:8px 10px;border-radius:12px">
        <legend class="muted" style="padding:0 6px">Retention</legend>
        <label>Keep last (days)
          <input id="pruneDays" type="number" min="1" value="30" />
        </label>
        <label style="display:flex;align-items:center;gap:6px">
          <input id="pruneDry" type="checkbox" checked /> Dry run
        </label>
        <div class="actions">
          <button id="btnPruneDry" class="secondary" type="button">Preview</button>
          <button id="btnPruneGo"  type="button">Prune</button>
        </div>
      </fieldset>
    </section>

    <section id="status" class="status" aria-live="polite"></section>

    <section class="results">
      <div class="row">
        <h2>Items</h2>
        <div class="spacer"></div>
        <button id="btnPrev" class="secondary" disabled>Prev</button>
        <button id="btnNext" class="secondary" disabled>Next</button>
      </div>
      <table id="table">
        <thead>
          <tr>
            <th>Uploaded</th>
            <th>Path</th>
            <th>Size</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  </main>

  <footer>
    <small>Uses /api/list-logs, /api/export-logs, /api/prune-logs. Provide ADMIN_TOKEN if enabled.</small>
  </footer>

  <script src="./admin.js"></script>
</body>
</html>
HTML

################################################################################
# public/admin/admin.js (full with Today + prune preview/run)
################################################################################
cat > public/admin/admin.js <<'JS'
(function(){
  const dateEl = document.getElementById('date');
  const tokenEl = document.getElementById('token');
  const btnList = document.getElementById('btnList');
  const btnExportJsonl = document.getElementById('btnExportJsonl');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const btnToday = document.getElementById('btnToday');
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#table tbody');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  const pruneDays = document.getElementById('pruneDays');
  const pruneDry  = document.getElementById('pruneDry');
  const btnPruneDry = document.getElementById('btnPruneDry');
  const btnPruneGo  = document.getElementById('btnPruneGo');

  const today = new Date().toISOString().slice(0,10);
  dateEl.value = today;

  let pages = [];
  let nextCursor = null;

  function setStatus(msg){ statusEl.textContent = msg || ''; }
  function getToken(){ return tokenEl.value.trim(); }
  function headers(){
    const h = { };
    const t = getToken();
    if (t) h['x-admin-token'] = t;
    return h;
  }

  async function listLogs(cursor){
    const date = dateEl.value || today;
    const params = new URLSearchParams({ date });
    if (cursor) params.set('cursor', cursor);
    setStatus('Loading list…');
    const res = await fetch(`/api/list-logs?${params.toString()}`, { headers: headers() });
    const json = await res.json().catch(()=>({ ok:false, error:'Invalid JSON' }));
    if (!json.ok) { setStatus(`List failed: ${json.error || res.status}`); return; }
    renderRows(json.items || []);
    setStatus(`Listed ${json.count} item(s). ${json.hasMore ? 'More available.' : ''}`);
    nextCursor = json.nextCursor || null;
    btnPrev.disabled = pages.length === 0;
    btnNext.disabled = !nextCursor;
  }

  function renderRows(items){
    tbody.innerHTML='';
    for (const it of items){
      const tr = document.createElement('tr');
      const d = it.uploadedAt ? new Date(it.uploadedAt).toLocaleString() : '';
      tr.innerHTML = `
        <td>${d}</td>
        <td><code>${it.pathname}</code></td>
        <td>${it.size ?? ''}</td>
        <td>${it.url ? `<a href="${it.url}" target="_blank" rel="noopener">Open</a>` : ''}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  async function exportLogs(fmt){
    const date = dateEl.value || today;
    setStatus(`Exporting ${fmt.toUpperCase()}…`);
    const params = new URLSearchParams({ date, format: fmt });
    const res = await fetch(`/api/export-logs?${params.toString()}`, { headers: headers() });
    if (!res.ok) { setStatus(`Export failed: ${res.status}`); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `amorvia-${date}.${fmt === 'csv' ? 'csv' : 'jsonl'}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setStatus('Export complete.');
  }

  async function pruneLogs(dryRun) {
    const days = Math.max(1, parseInt(pruneDays.value || '30', 10));
    const params = new URLSearchParams({ days: String(days) });
    if (dryRun) params.set('dryRun', '1');

    setStatus(dryRun ? `Previewing prune (keep ${days} days)…` : `Pruning logs older than ${days} days…`);

    const res = await fetch(`/api/prune-logs?${params.toString()}`, {
      method: dryRun ? 'GET' : 'DELETE',
      headers: headers()
    });

    let json = null;
    try { json = await res.json(); } catch {}
    if (!res.ok || !json?.ok) {
      setStatus(`Prune ${dryRun ? 'preview' : 'run'} failed: ${json?.error || res.status}`);
      return;
    }

    if (dryRun) {
      setStatus(`Would delete ${json.toDeleteCount} file(s). Sample:\n${(json.sample || []).join('\n')}`);
    } else {
      setStatus(`Deleted ${json.deletedCount}/${json.toDeleteCount} file(s). Kept last ${json.keptDays} day(s).`);
      // optional refresh
      listLogs(null);
    }
  }

  btnList.addEventListener('click', () => { pages = []; listLogs(null); });
  btnNext.addEventListener('click', () => { if (nextCursor){ pages.push(nextCursor); listLogs(nextCursor); } });
  btnPrev.addEventListener('click', () => {
    if (pages.length > 1){ pages.pop(); listLogs(pages[pages.length-1]); }
    else { pages = []; listLogs(null); }
  });
  btnExportJsonl.addEventListener('click', () => exportLogs('jsonl'));
  btnExportCsv.addEventListener('click', () => exportLogs('csv'));
  btnPruneDry.addEventListener('click', () => pruneLogs(true));
  btnPruneGo.addEventListener('click', async () => {
    const days = Math.max(1, parseInt(pruneDays.value || '30', 10));
    if (!confirm(`Delete logs older than ${days} day(s)? This cannot be undone.`)) return;
    await pruneLogs(false);
  });
  btnToday.addEventListener('click', () => {
    const t = new Date().toISOString().slice(0,10);
    dateEl.value = t; pages = []; listLogs(null);
  });

  listLogs(null);
})();
JS

################################################################################
# public/admin/help.html
################################################################################
cat > public/admin/help.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Amorvia — Admin Help</title>
  <link rel="stylesheet" href="./styles.css"/>
  <style>
    main { max-width: 900px; }
    code, pre { background:#0b1222; border:1px solid #1f2a3a; border-radius:8px; padding:2px 6px; }
    pre { padding:10px; overflow:auto; }
    .tip { color:#a7f3d0 }
  </style>
</head>
<body>
  <header>
    <h1>Amorvia — <span class="muted">Admin Help</span></h1>
    <p class="muted">How to list, export, prune logs.</p>
  </header>
  <main>
    <section>
      <h2>Environment</h2>
      <ul>
        <li><code>TRACK_SALT</code> — required</li>
        <li><code>BLOB_READ_WRITE_TOKEN</code> — required</li>
        <li><code>ADMIN_TOKEN</code> — recommended</li>
        <li><code>TRACK_RATE_LIMIT</code> — optional</li>
      </ul>
    </section>
    <section>
      <h2>Admin UI</h2>
      <p>Open <code>/admin/</code>. Set date → <b>List Logs</b> → <b>Export CSV</b> or JSONL.</p>
      <p>If you set <code>ADMIN_TOKEN</code>, paste it in the “Admin Token” field.</p>
    </section>
    <section>
      <h2>Retention</h2>
      <p>Use the Retention controls to preview and prune logs older than N days.</p>
      <pre><code>// Dry run (no delete)
GET  /api/prune-logs?days=30&amp;dryRun=1
// Delete (requires Admin Token header)
DELETE /api/prune-logs?days=30
Header: x-admin-token: &lt;ADMIN_TOKEN&gt;</code></pre>
    </section>
  </main>
</body>
</html>
HTML

################################################################################
# public/js/bootstrap.js (ensure images init on load)
################################################################################
cat > public/js/bootstrap.js <<'JS'
/* Amorvia bootstrap + extras */

// Background + characters init
const bgImg   = document.getElementById('bgImg');
const leftImg = document.getElementById('leftImg');
const rightImg= document.getElementById('rightImg');

if (bgImg)   bgImg.src   = '/assets/backgrounds/room.svg';
if (leftImg) leftImg.src = '/assets/characters/male_casual.svg';
if (rightImg)rightImg.src= '/assets/characters/female_casual.svg';

// Mode handling
const getMode = () => localStorage.getItem('amorvia:mode') || 'v2';
const setMode = (m) => localStorage.setItem('amorvia:mode', m);

function applyModeToDOM(mode){
  document.querySelectorAll('.v1-only').forEach(el => { const on = (mode === 'v1'); el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
  document.querySelectorAll('.v2-only').forEach(el => { const on = (mode === 'v2'); el.hidden = !on; el.setAttribute('aria-hidden', String(!on)); });
}
const modeSel = document.getElementById('modeSelect');
if (modeSel){
  modeSel.value = getMode();
  applyModeToDOM(modeSel.value);
  modeSel.addEventListener('change', ()=>{ setMode(modeSel.value); location.reload(); });
}else{
  applyModeToDOM(getMode());
}

// Lazy-load scenario engine
let loaded=false;
async function loadChosenApp(){
  if (loaded) return; loaded=true;
  try{
    const mode = getMode();
    if (mode === 'v2'){
      await import('/js/app.v2.js?sig='+Date.now());
      await Promise.allSettled([ import('/js/addons/extras-tabs.js?sig='+Date.now()) ]);
    } else {
      await import('/js/app.js?sig='+Date.now());
    }
  }catch(e){ console.error('Failed to start app:', e); }
}
['click','keydown','pointerdown'].forEach(evt=>window.addEventListener(evt,loadChosenApp,{once:true}));
if ('requestIdleCallback' in window) requestIdleCallback(loadChosenApp,{timeout:2000}); else setTimeout(loadChosenApp,2000);
JS

################################################################################
# public/js/sw-register.js guard (skip SW in non-prod / ?nosw=1)
################################################################################
cat > public/js/sw-register.js <<'JS'
(() => {
  const isProdHost = location.hostname === 'amorvia.eu';
  const skip = location.search.includes('nosw=1') || !isProdHost || !('serviceWorker' in navigator);

  if (skip) {
    console.log('[SW] skip register (dev/nosw/non-prod)');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations?.().then(regs => regs.forEach(r => r.unregister()));
    }
    return;
  }
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('[SW] register failed', err);
    });
  });
})();
JS

################################################################################
# index.html manifest guard snippet (inserts if not present)
################################################################################
if ! grep -q 'Manifest] removed in non-prod' public/index.html 2>/dev/null; then
  # inject after the manifest link if present; else append in head
  if grep -q '<link rel="manifest" href="/manifest.json"' public/index.html; then
    awk '
      /<link rel="manifest" href="\/manifest.json"\/>/ && !done {
        print;
        print "";
        print "<script>";
        print "  if (location.hostname !== '\''amorvia.eu'\'') {";
        print "    const m = document.querySelector('\''link[rel=\\\"manifest\\\"]'\'');";
        print "    if (m) m.remove();";
        print "    console.log('[Manifest] removed in non-prod:', location.hostname);";
        print "  }";
        print "</script>";
        done=1; next
      }1' public/index.html > public/index.html.tmp && mv public/index.html.tmp public/index.html
  else
    # append a safe guard
    sed -i 's#</head>#<script>if(location.hostname!=="amorvia.eu"){const m=document.querySelector("link[rel=\\"manifest\\"]");if(m)m.remove();console.log("[Manifest] removed in non-prod:",location.hostname);}</script>\n</head>#' public/index.html
  fi
fi

################################################################################
# install dependency and zip
################################################################################
npm pkg set type=module >/dev/null 2>&1 || true
npm i undici >/dev/null

zip -r9 amorvia-admin-pack.zip \
  api/_lib/auth.ts api/export-logs.ts api/prune-logs.ts \
  public/admin/index.html public/admin/admin.js public/admin/help.html \
  public/js/bootstrap.js public/js/sw-register.js >/dev/null

echo "Done. Wrote files and created ./amorvia-admin-pack.zip"
