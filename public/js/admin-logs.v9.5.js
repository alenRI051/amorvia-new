
// admin-logs.v9.5.js
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  const state = {
    endpoint: window.AMORVIA_TRACK_ENDPOINT || '/api/track',
    paused: false,
    limit: 200,
    filterType: '',
    search: '',
    from: '',
    to: '',
    events: [],
    timer: null
  };

  function fmt(ts){ try{ return new Date(ts).toLocaleString(); } catch { return String(ts); } }

  function renderStats(){
    const byType = {};
    state.events.forEach(e => byType[e.type] = (byType[e.type]||0)+1);
    const $stats = $('#stats');
    const total = state.events.length;
    $stats.innerHTML = `
      <div class="status">Total: <strong>${total}</strong></div>
      <div class="badges">${Object.entries(byType).map(([t,c]) => `<span class="badge">${t}<span class="count">${c}</span></span>`).join('')}</div>
    `;
  }

  function applyFilters(list){
    return list.filter(e => {
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

  function escapeHtml(s){ return s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  async function load(){
    const $status = $('#status');
    try {
      $status.textContent = 'Loading…';
      const r = await fetch(state.endpoint, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Unknown error');
      state.events = j.events || [];
      renderStats(); renderList();
      $status.textContent = `OK — ${state.events.length} events`;
    } catch (e) {
      $status.textContent = 'Error: ' + e.message;
    }
  }

  function poll(){
    clearInterval(state.timer);
    state.timer = setInterval(() => { if (!state.paused) load(); }, 5000);
  }

  function exportJSON(){
    const list = applyFilters(state.events);
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'amorvia-logs.json';
    a.click();
  }

  function exportCSV(){
    const list = applyFilters(state.events);
    const rows = [['ts','time','type','payload']];
    list.forEach(e => rows.push([e.ts, fmt(e.ts), e.type, JSON.stringify(e.payload||{})]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'amorvia-logs.csv';
    a.click();
  }

  function copyList(){
    const list = applyFilters(state.events);
    navigator.clipboard.writeText(JSON.stringify(list, null, 2)).then(()=>{
      toast('Copied to clipboard');
    }).catch(()=> toast('Copy failed'));
  }

  function toast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, { position:'fixed', bottom:'16px', right:'16px', background:'var(--panel)', color:'var(--text)', border:'1px solid rgba(255,255,255,.2)', padding:'8px 12px', borderRadius:'8px' });
    document.body.appendChild(t);
    setTimeout(()=> t.remove(), 1700);
  }

  function bind(){
    $('#endpoint').value = state.endpoint;
    $('#endpoint').addEventListener('change', e => { state.endpoint = e.target.value || '/api/track'; load(); });

    $('#type').addEventListener('change', e => { state.filterType = e.target.value; renderStats(); renderList(); });
    $('#search').addEventListener('input', e => { state.search = e.target.value.trim(); renderList(); });
    $('#from').addEventListener('change', e => { state.from = e.target.value; renderList(); });
    $('#to').addEventListener('change', e => { state.to = e.target.value; renderList(); });
    $('#limit').addEventListener('change', e => { state.limit = parseInt(e.target.value||'200', 10); renderList(); });

    $('#refresh').addEventListener('click', load);
    $('#pause').addEventListener('click', () => {
      state.paused = !state.paused;
      $('#pause').textContent = state.paused ? 'Resume' : 'Pause';
      toast(state.paused ? 'Live updates paused' : 'Live updates resumed');
    });

    $('#export-json').addEventListener('click', exportJSON);
    $('#export-csv').addEventListener('click', exportCSV);
    $('#copy').addEventListener('click', copyList);

    // Keyboard
    window.addEventListener('keydown', e => {
      const tag = (e.target && e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); load(); }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); $('#pause').click(); }
      if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    });
  }

  function populateTypes(){
    // Build set of types
    const set = new Set(state.events.map(e => e.type));
    const sel = $('#type');
    const current = sel.value;
    sel.innerHTML = '<option value="">All</option>' + Array.from(set).sort().map(t => `<option>${t}</option>`).join('');
    if ([...set, ''].includes(current)) sel.value = current;
  }

  async function init(){
    bind();
    await load();
    populateTypes();
    poll();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
