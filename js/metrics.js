
export async function track(event, detail={}){
  try{
    await fetch('/api/track', {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ event, detail, t: Date.now() }),
      cache:'no-store',
      keepalive: true
    });
  }catch(e){
    // noop in prod; useful for debugging
    console.debug('[metrics] failed', e);
  }
}
