import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, del } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE' && req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'Missing BLOB_READ_WRITE_TOKEN' });

  const daysParam = Number(req.query.days ?? 30);
  const keepDays = Number.isFinite(daysParam) && daysParam > 0 ? Math.floor(daysParam) : 30;
  const dryRun = String(req.query.dryRun ?? '0') === '1';

  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - keepDays);

  const toDelete: string[] = [];
  let cursor: string | undefined = undefined;

  try {
    do {
      const page = await list({ prefix: 'events/', token, limit: 1000, cursor });
      for (const b of page.blobs) {
        const m = b.pathname.match(/^events\/(\d{4}-\d{2}-\d{2})\//);
        if (!m) continue;
        const dt = new Date(`${m[1]}T00:00:00Z`);
        if (!isNaN(dt.getTime()) && dt < cutoff) toDelete.push(b.url);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error('[prune-logs] list error', err);
    return res.status(500).json({ ok: false, error: 'List failed' });
  }

  if (dryRun) {
    return res.status(200).json({
      ok: true, keptDays: keepDays, dryRun: true,
      toDeleteCount: toDelete.length, sample: toDelete.slice(0, 5),
    });
  }

  let deleted = 0;
  const batch = 100;
  try {
    for (let i = 0; i < toDelete.length; i += batch) {
      const slice = toDelete.slice(i, i + batch);
      await del(slice, { token });
      deleted += slice.length;
    }
  } catch (err) {
    console.error('[prune-logs] delete error', err);
    return res.status(500).json({ ok: false, error: 'Delete failed', deletedCount: deleted });
  }

  return res.status(200).json({
    ok: true, keptDays: keepDays, dryRun: false,
    toDeleteCount: toDelete.length, deletedCount: deleted,
  });
}
