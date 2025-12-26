// api/list-logs.ts
function json(res: any, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export default async function handler(req: any, res: any) {
  try {
    if (!hasBlob()) return json(res, 200, { ok: true, items: [] });

    const { list } = await import("@vercel/blob");

    // list only our folder
    const out = await list({ prefix: "amorvia-logs/" });

    // Map into /admin's expected shape: Uploaded / Path / Size (+ optional url)
    const items = (out?.blobs || []).map((b: any) => ({
      uploaded: (b.uploadedAt ? new Date(b.uploadedAt).toISOString() : new Date().toISOString()),
      path: b.pathname || b.path || "",
      size: b.size ?? 0,
      url: b.url, // admin can ignore if not used, but useful if you add "Open"
    }));

    // newest first
    items.sort((a: any, b: any) => (b.uploaded || "").localeCompare(a.uploaded || ""));

    return json(res, 200, { ok: true, items });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}

