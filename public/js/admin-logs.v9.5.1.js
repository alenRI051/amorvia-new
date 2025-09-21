
// admin-logs.v9.5.1.js — tolerant loader + local buffer option
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const LS_KEY = 'amorvia:events';

  const state = {
    endpoint: window.AMORVIA_TRACK_ENDPOINT || '/api/track',
    paused: false,
    limit: 200,
    filterType: '',
    search: '',
    from: '',
    to: '',
    events: [],
    useLocal: false,
    timer: null
  };

  function fmt(ts){ try{ return new Date(ts).toLocaleString(); } catch { return String(ts); } }
  function escapeHtml(s){ return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  function renderStats(){
    const byType = {};
    state.events.forEach(e => byType[e.type] = (byType[e.type]||0)+1);
    $('#stats').innerHTML = `
      <div class="status">Total: <strong>${state.events.length}</strong></div>
      <div class="badges">${Object.entries(byType).map(([t,c]) => `<span class="badge">${t}<span class="count">${c}</span></span>`).join('')}</div>
    `;
  }

  function applyFilters(list){
    return list.filter(e => {
      if (!e) return false;
      if (state.filterType && e.type !== state.filterType) return false;
      if (state.search) {
        const s = state.search.toLowerCase();
        if (!JSON.stringify(e.payload||{}).toLowerCase().includes(s) && !String(e.type).toLowerCase().includes(s)) return false;
      }
      if (state.from && e.ts < Date.parse(state.from)) return false;
      if (state.to && e.ts > Date.parse(state.to)) return false;
      return true;
    }).slice(-state.limit);
  }

  function renderList(){
    const list = applyFilters(state.events);
    const $list = $('#list');
    $list.innerHTML = list.map(e => `
      <div class="row">
        <div>
          <div class="time">${fmt(e.ts)}</div>
          <div class="type">${e.type}</div>
        </div>
        <pre class="payload" aria-label="Payload">${escapeHtml(JSON.stringify(e.payload, null, 2))}</pre>
      </div>
    `).join('');
  }

  function normalizeResponse(j){
    // Accept: {ok:true, events:[...]}
    // or: {events:[...]}
    // or: [ ... ]
    // or: NDJSON string
    if (Array.isArray(j)) return j;
    if (typeof j === 'string') {
      // try NDJSON
      const rows = j.trim().split('\n').map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
      return rows;
    }
    if (j && typeof j === 'object') {
      if (Array.isArray(j.events)) return j.events;
      if (Array.isArray(j.data)) return j.data;
    }
    return [];
  }

  async function loadEndpoint(){
    const $status = $('#status');
    try {
      $status.textContent = 'Loading…';
      const r = await fetch(state.endpoint, { cache: 'no-store' });
      const isJson = (r.headers.get('content-type')||'').includes('application/json');
      const j = isJson ? (await r.json()) : (await r.text());
      state.events = normalizeResponse(j).map(e => ({
        ts: e.ts || e.time || Date.now(),
        type: e.type || e.event || 'event',
        payload: e.payload || e.data || e
      }));
      renderStats(); renderList(); populateTypes();
      $status.textContent = `OK — ${state.events.length} events`;
    } catch (e) {
      $status.textContent = 'Error: ' + e.message;
    }
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY) || '[]';
    try {
      const arr = JSON.parse(raw);
      state.events = Array.isArray(arr) ? arr : [];
      renderStats(); renderList(); populateTypes();
      $('#status').textContent = `Local buffer — ${state.events.length} events`;
    } catch(e){
      $('#status').textContent = 'Local buffer parse error';
    }
  }

  function poll(){
    clearInterval(state.timer);
    state.timer = setInterval(() => { if (!state.paused) (state.useLocal ? loadLocal() : loadEndpoint()); }, 5000);
  }

  function exportJSON(){
    const list = applyFilters(state.events);
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'amorvia-logs.json'; a.click();
  }
  function exportCSV(){
    const list = applyFilters(state.events);
    const rows = [['ts','time','type','payload']];
    list.forEach(e => rows.push([e.ts, fmt(e.ts), e.type, JSON.stringify(e.payload||{})]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'amorvia-logs.csv'; a.click();
  }
  function copyList(){
    const list = applyFilters(state.events);
    navigator.clipboard.writeText(JSON.stringify(list, null, 2)).then(()=> toast('Copied to clipboard')).catch(()=> toast('Copy failed'));
  }
  function toast(msg){
    const t = document.createElement('div'); t.textContent = msg;
    Object.assign(t.style, { position:'fixed', bottom:'16px', right:'16px', background:'var(--panel)', color:'var(--text)', border:'1px solid rgba(255,255,255,.2)', padding:'8px 12px', borderRadius:'8px' });
    document.body.appendChild(t); setTimeout(()=> t.remove(), 1700);
  }

  function bind(){
    $('#endpoint').value = state.endpoint;
    $('#endpoint').addEventListener('change', e => { state.endpoint = e.target.value || '/api/track'; if (!state.useLocal) loadEndpoint(); });

    $('#type').addEventListener('change', e => { state.filterType = e.target.value; renderStats(); renderList(); });
    $('#search').addEventListener('input', e => { state.search = e.target.value.trim(); renderList(); });
    $('#from').addEventListener('change', e => { state.from = e.target.value; renderList(); });
    $('#to').addEventListener('change', e => { state.to = e.target.value; renderList(); });
    $('#limit').addEventListener('change', e => { state.limit = parseInt(e.target.value||'200', 10); renderList(); });

    $('#refresh').addEventListener('click', () => state.useLocal ? loadLocal() : loadEndpoint());
    $('#pause').addEventListener('click', () => {
      state.paused = !state.paused;
      $('#pause').textContent = state.paused ? 'Resume' : 'Pause'; toast(state.paused ? 'Live updates paused' : 'Live updates resumed');
    });

    $('#useLocal').addEventListener('change', e => {
      state.useLocal = e.target.checked;
      if (state.useLocal) loadLocal(); else loadEndpoint();
    });

    $('#export-json').addEventListener('click', exportJSON);
    $('#export-csv').addEventListener('click', exportCSV);
    $('#copy').addEventListener('click', copyList);
    $('#sendTest').addEventListener('click', () => {
      const fn = window.amorviaTrack || (t,p)=>{
        // fallback to local
        const evt = { ts: Date.now(), type:t, payload:p };
        const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); arr.push(evt);
        // cap buffer to 1000
        while (arr.length > 1000) arr.shift();
        localStorage.setItem(LS_KEY, JSON.stringify(arr));
      };
      fn('admin_test', { message: 'Hello from /admin', at: new Date().toISOString() });
      toast('Test event sent');
      if (state.useLocal) loadLocal();
    });

    // Keyboard
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); (state.useLocal ? loadLocal() : loadEndpoint()); }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); $('#pause').click(); }
      if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    });
  }

  function populateTypes(){
    const set = new Set(state.events.map(e => e.type));
    const sel = $('#type');
    const current = sel.value;
    sel.innerHTML = '<option value="">All</option>' + Array.from(set).sort().map(t => `<option>${t}</option>`).join('');
    if ([...set, ''].includes(current)) sel.value = current;
  }

  async function init(){
    bind();
    state.useLocal = $('#useLocal').checked;
    if (state.useLocal) loadLocal(); else await loadEndpoint();
    populateTypes();
    poll();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
