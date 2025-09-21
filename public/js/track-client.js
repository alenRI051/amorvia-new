
// track-client.js (v9.3)
(function() {
  const TRACK_ENDPOINT = (window.AMORVIA_TRACK_ENDPOINT || '/api/track');
  function send(evt) {
    try {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: evt.type, payload: evt.payload || {}, ts: evt.ts || Date.now() })
      }).catch(()=>{});
    } catch(e) {}
  }
  window.amorviaTrack = function(type, payload) { send({ type, payload, ts: Date.now() }); };
  window.addEventListener('DOMContentLoaded', () => window.amorviaTrack('page_load', { path: location.pathname + location.hash }));
  window.addEventListener('hashchange', () => window.amorviaTrack('hash_change', { hash: location.hash }));
})();
