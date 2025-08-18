// metrics.js - sends events to /api/track with sendBeacon or fetch
const ENDPOINT = '/api/track';
const ENABLED = true;

function sendBeacon(url, data){
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    return navigator.sendBeacon && navigator.sendBeacon(url, blob);
  } catch(e){ return false; }
}

export function track(event, payload){
  if (!ENABLED) return;
  const record = { event, payload, ts: Date.now(), ua: navigator.userAgent || '' };
  // Try beacon first
  const ok = sendBeacon(ENDPOINT, record);
  if (ok) return;
  // Fallback to fetch keepalive
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
      credentials: 'same-origin',
      cache: 'no-store'
    }).catch(()=>{});
  } catch(e) { /* ignore */ }
}
