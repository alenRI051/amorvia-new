
// track-client.v9.5.1.js — define window.amorviaTrack, post to endpoint, fallback to local buffer
(function(){
  const LS_KEY = 'amorvia:events';
  function pushLocal(evt){
    try {
      const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      arr.push(evt);
      while (arr.length > 1000) arr.shift();
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch {}
  }
  async function post(endpoint, evt){
    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evt),
        keepalive: true,
      });
    } catch {
      pushLocal(evt);
    }
  }
  const endpoint = window.AMORVIA_TRACK_ENDPOINT || '/api/track';
  window.amorviaTrack = function(type, payload){
    const evt = { ts: Date.now(), type, payload };
    post(endpoint, evt);
  };
  window.amorviaGetLocalEvents = function(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
})();
