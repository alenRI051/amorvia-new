import type { VercelRequest, VercelResponse } from '@vercel/node';
import { list, del } from '@vercel/blob';
import { requireAdmin } from './_lib/auth.js';

/**
 * DELETE /api/prune-logs?days=30&dryRun=1
 *  - days:   integer > 0 (how many days to keep; older will be removed)
 *  - dryRun: "1" to only list what would be deleted (no actual deletion)
 *
 * Returns: { ok, keptDays, dryRun, toDeleteCount, deletedCount, sample }
 */
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

  // any blob under events/YYYY-MM-DD/...
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - keepDays);

  // Collect all event blobs (we list by prefix "events/")
  const toDelete: string[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const page = await list({ prefix: 'events/', token, limit: 1000, cursor });
      for (const b of page.blobs) {
        // path looks like: events/2025-09-13/....json
        // extract YYYY-MM-DD after "events/"
        const m = b.pathname.match(/^events\/(\d{4}-\d{2}-\d{2})\//);
        if (!m) continue;
        const ymd = m[1];
        const dt = new Date(`${ymd}T00:00:00Z`);
        if (isNaN(dt.getTime())) continue;
        if (dt < cutoff) {
          // We'll delete by URL (works with @vercel/blob del)
          toDelete.push(b.url);
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    console.error('[prune-logs] list error', err);
    return res.status(500).json({ ok: false, error: 'List failed' });
  }

  // If dry-run, report and exit
  if (dryRun) {
    return res.status(200).json({
      ok: true,
      keptDays: keepDays,
      dryRun: true,
      toDeleteCount: toDelete.length,
      sample: toDelete.slice(0, 5),
    });
  }

  // Delete in batches
  let deleted = 0;
  const batchSize = 100;
  try {
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const slice = toDelete.slice(i, i + batchSize);
      await del(slice, { token }); // accepts array of URLs
      deleted += slice.length;
    }
  } catch (err) {
    console.error('[prune-logs] delete error', err);
    return res.status(500).json({ ok: false, error: 'Delete failed', deletedCount: deleted });
  }

  return res.status(200).json({
    ok: true,
    keptDays: keepDays,
    dryRun: false,
    toDeleteCount: toDelete.length,
    deletedCount: deleted,
  });
}
