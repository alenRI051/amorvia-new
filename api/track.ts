// api/track.ts
export const runtime = 'edge'; // modern syntax

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  // const data = await req.json().catch(() => ({}));  // read body if you want
  // TODO: store or forward metrics somewhere

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store' },
  });
}

