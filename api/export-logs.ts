import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, get } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

/**
 * GET /api/export-logs?date=YYYY-MM-DD[&format=jsonl|csv]
 * Streams JSONL (default) or CSV of all events under events/<date>/
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const fmt = ((req.query.format as string) || 'jsonl').toLowerCase();
  const prefix = `events/${date}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  try {
    let cursor: string | undefined = undefined;

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.csv"`);
      // CSV header
      res.write('ts,event,ipHash,ua,referer,path,data\n');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.jsonl"`);
    }

    do {
      const { blobs, hasMore, cursor: next } = await list({ prefix, token, limit: 1000, cursor });
      for (const b of blobs) {
        const { body } = await get(b.url, { token });
        const text = await (body as any).text();
        if (!text) continue;
        if (fmt === 'csv') {
          try {
            const obj = JSON.parse(text);
            // minimal CSV escaping for double quotes
            const esc = (s: any) => {
              const v = (s == null) ? '' : String(s);
              return '"' + v.replace(/"/g, '""') + '"';
            };
            res.write([esc(obj.ts), esc(obj.event), esc(obj.ipHash), esc(obj.ua), esc(obj.referer), esc(obj.path), esc(JSON.stringify(obj.data))].join(',') + '\n');
          } catch {}
        } else {
          res.write(text.trim() + '\n');
        }
      }
      cursor = hasMore ? next : undefined;
    } while (cursor);

    res.end();
  } catch (err: any) {
    console.error('[export-logs] error', err);
    res.status(500).json({ ok: false, error: 'Export failed' });
  }
}
