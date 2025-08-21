export const config = { runtime: 'edge' };
export default async function handler(_req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
