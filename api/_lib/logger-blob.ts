import { put } from '@vercel/blob';

/**
 * Writes each tracking event as a single JSON object into Vercel Blob storage.
 * Files are stored under: events/YYYY-MM-DD/<timestamp>-<rand>.json
 *
 * Required env var in Vercel:
 * - BLOB_READ_WRITE_TOKEN (Project → Storage → Blob → Tokens)
 */
function pathForEvent(tsISO: string) {
  const d = new Date(tsISO);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const base = `events/${yyyy}-${mm}-${dd}`;
  const stamp = d.toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base}/${stamp}-${rand}.json`;
}

export async function writeJsonEvent(obj: Record<string, unknown>) {
  const content = JSON.stringify(obj);
  const pathname = pathForEvent(String(obj['ts'] ?? new Date().toISOString()));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('Missing BLOB_READ_WRITE_TOKEN env var');
  }
  // Upload as a new blob (immutable). One file per event.
  await put(pathname, content, {
    access: 'private',
    contentType: 'application/json',
    token
  });
  return pathname;
}
