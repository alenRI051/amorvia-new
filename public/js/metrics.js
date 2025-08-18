// metrics.js - privacy-safe stub. Replace post() with your endpoint later.
export function track(event, payload){
  try {
    const record = { event, payload, ts: Date.now() };
    // console only for now
    console.debug('[metrics]', record);
    // Example to send later:
    // navigator.sendBeacon('/api/track', JSON.stringify(record));
  } catch(e) { /* ignore */ }
}
