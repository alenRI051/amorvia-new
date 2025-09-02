// api/track.ts
export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }
  // Optionally read the body:
  // const data = await req.json().catch(()=> ({}));
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
