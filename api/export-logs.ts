// api/export-logs.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, get } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const fmt = ((req.query.format as string) || 'jsonl').toLowerCase();
  const prefix = `events/${date}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });

  try {
    // Gather all blob paths (paginate)
    let cursor: string | undefined = undefined;
    const paths: { url: string }[] = [];
    do {
      const { blobs, hasMore, cursor: next } = await list({ prefix, token, limit: 1000, cursor });
      paths.push(...blobs.map(b => ({ url: b.url })));
      cursor = hasMore ? next : undefined;
    } while (cursor);

    // Fetch all files (in small batches)
    const batchSize = 25;
    const jsonLines: string[] = [];
    const rows: string[] = ['ts,event,ipHash,ua,referer,path,data']; // CSV header

    for (let i = 0; i < paths.length; i += batchSize) {
      const slice = paths.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        slice.map(async p => {
          const { body } = await get(p.url, { token });
          const text = await (body as any).text();
          return text?.trim();
        })
      );

      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        if (fmt === 'csv') {
          try {
            const obj = JSON.parse(r.value);
            const esc = (s: any) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
            rows.push([
              esc(obj.ts), esc(obj.event), esc(obj.ipHash), esc(obj.ua),
              esc(obj.referer), esc(obj.path), esc(JSON.stringify(obj.data))
            ].join(','));
          } catch { /* skip bad line */ }
        } else {
          jsonLines.push(r.value);
        }
      }
    }

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.csv"`);
      return res.status(200).send(rows.join('\n') + '\n');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.jsonl"`);
      return res.status(200).send(jsonLines.join('\n') + '\n');
    }
  } catch (err: any) {
    console.error('[export-logs] error', err);
    return res.status(500).json({ ok: false, error: 'Export failed' });
  }
}

