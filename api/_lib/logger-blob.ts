import { put } from '@vercel/blob';

function pathForEvent(tsISO: string) {
  const d = new Date(tsISO);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const stamp = d.toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 10);
  const bucket = Math.random().toString(36).slice(2, 8);
  return `events/${yyyy}-${mm}-${dd}/${bucket}/${stamp}-${rand}.json`;
}

export async function writeJsonEvent(obj: Record<string, unknown>) {
  const content = JSON.stringify(obj);
  const pathname = pathForEvent(String(obj['ts'] ?? new Date().toISOString()));
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const res = await put(pathname, content, {
    access: 'public',
    contentType: 'application/json',
    token
  });
  return { pathname, url: res.url };
}
