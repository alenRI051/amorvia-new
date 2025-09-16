import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';
import { requireAdmin } from './_lib/auth'; // note: no ".js" in TS

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const fmt = ((req.query.format as string) || 'jsonl').toLowerCase();
  const prefix = `events/${date}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN; // used for list()

  if (!token) {
    return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });
  }

  try {
    // 1) Collect all blob URLs via paginated list()
    const urls: string[] = [];
    let cursor: string | undefined = undefined;

    do {
      const page = await list({ prefix, token, limit: 1000, cursor });
      page.blobs.forEach(b => urls.push(b.url));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    // 2) Fetch each file body; public access means plain fetch works
    const batchSize = 25;
    const jsonLines: string[] = [];
    const rows: string[] = ['ts,event,ipHash,ua,referer,path,data']; // CSV header

    for (let i = 0; i < urls.length; i += batchSize) {
      const slice = urls.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        slice.map(u => fetch(u).then(r => r.text()))
      );

      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const text = r.value.trim();
        if (!text) continue;

        if (fmt === 'csv') {
          try {
            const obj = JSON.parse(text);
            const esc = (s: any) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
            rows.push([
              esc(obj.ts),
              esc(obj.event),
              esc(obj.ipHash),
              esc(obj.ua),
              esc(obj.referer),
              esc(obj.path),
              esc(JSON.stringify(obj.data))
            ].join(','));
          } catch {
            // skip malformed line
          }
        } else {
          jsonLines.push(text);
        }
      }
    }

    // 3) Send response
    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.csv"`);
      return res.status(200).send(rows.join('\n') + '\n');
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="amorvia-${date}.jsonl"`);
      return res.status(200).send(jsonLines.join('\n') + '\n');
    }
  } catch (err) {
    console.error('[export-logs] error', err);
    return res.status(500).json({ ok: false, error: 'Export failed' });
  }
}
