(function(){
  const dateEl = document.getElementById('date');
  const tokenEl = document.getElementById('token');
  const btnList = document.getElementById('btnList');
  const btnExportJsonl = document.getElementById('btnExportJsonl');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const statusEl = document.getElementById('status');
  const tbody = document.querySelector('#table tbody');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');

  const today = new Date().toISOString().slice(0,10);
  dateEl.value = today;

  let pages = []; // cursor history
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

  btnList.addEventListener('click', () => { pages = []; listLogs(null); });
  btnNext.addEventListener('click', () => { if (nextCursor){ pages.push(nextCursor); listLogs(nextCursor); } });
  btnPrev.addEventListener('click', () => {
    if (pages.length > 1){ pages.pop(); listLogs(pages[pages.length-1]); }
    else { pages = []; listLogs(null); }
  });
  btnExportJsonl.addEventListener('click', () => exportLogs('jsonl'));
  btnExportCsv.addEventListener('click', () => exportLogs('csv'));

  listLogs(null);
})();