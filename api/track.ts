// /api/track.ts
// Edge runtime route — logs a compact JSON line & returns 204
export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Parse body (best-effort) and log a single concise line
  const data = await req.json().catch(() => ({} as any));
  const ua = req.headers.get('user-agent') || '';
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();

  // This console.log goes to Vercel function logs
  console.log('[track]', JSON.stringify({
    t: Date.now(),
    ip, ua,
    event: data?.event, detail: data?.detail
  }));

  // TODO: forward to analytics store if desired
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
