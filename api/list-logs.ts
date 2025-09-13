import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

/**
 * GET /api/list-logs?date=YYYY-MM-DD&cursor=...
 * Lists blob paths under events/<date>/
 * Returns { ok, count, items, nextCursor }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const prefix = `events/${date}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const cursor = (req.query.cursor as string) || undefined;

  try {
    const { blobs, hasMore, cursor: next } = await list({ prefix, token, limit: 1000, cursor });
    res.status(200).json({
      ok: true,
      date,
      count: blobs.length,
      hasMore,
      nextCursor: next,
      items: blobs.map(b => ({ pathname: b.pathname, size: b.size, uploadedAt: b.uploadedAt, url: b.url }))
    });
  } catch (err: any) {
    console.error('[list-logs] error', err);
    res.status(500).json({ ok: false, error: 'List failed' });
  }
}
