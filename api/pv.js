// Edge Function: privacy-light pageview collector
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { pathname, search } = new URL(req.url);
    const ua = req.headers.get('user-agent') || '';
    // Attempt to parse JSON body (ignore errors)
    let body = null;
    try { body = await req.json(); } catch {}
    // Log minimal info; visible in Vercel logs
    console.log('pv', { path: pathname + search, ua: ua.slice(0,80), body });
  } catch (e) {
    // ignore
  }
  return new Response(null, { status: 204 });
}
