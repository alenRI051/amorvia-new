import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list } from '@vercel/blob';
import { fetch } from 'undici';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  if (!requireAdmin(req, res)) return;

  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const fmt  = ((req.query.format as string) || 'jsonl').toLowerCase();
  const prefix = `events/${date}`;
  const token  = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });

  try {
    const urls: string[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page = await list({ prefix, token, limit: 1000, cursor });
      for (const b of page.blobs) urls.push(b.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    const batchSize = 25;
    const jsonLines: string[] = [];
    const rows: string[] = ['ts,event,ipHash,ua,referer,path,data'];

    for (let i = 0; i < urls.length; i += batchSize) {
      const slice = urls.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        slice.map(async (u: string) => {
          const r = await fetch(u);
          return r.ok ? r.text() : '';
        })
      );
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        const text = (r.value || '').trim();
        if (!text) continue;

        if (fmt === 'csv') {
          try {
            const obj: any = JSON.parse(text);
            const esc = (s: unknown) => `"${(s ?? '').toString().replace(/"/g, '""')}"`;
            rows.push([esc(obj.ts),esc(obj.event),esc(obj.ipHash),esc(obj.ua),
                       esc(obj.referer),esc(obj.path),esc(JSON.stringify(obj.data))].join(','));
          } catch {}
        } else {
          jsonLines.push(text);
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
  } catch (err) {
    console.error('[export-logs] error', err);
    return res.status(500).json({ ok: false, error: 'Export failed' });
  }
}
