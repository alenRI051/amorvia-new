function json(res: any, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function hasKV() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export default async function handler(req: any, res: any) {
  try {
    if (hasKV()) {
      const { kv } = await import("@vercel/kv");
      const index = (await kv.get<Record<string, any>>("amorvia:logs:index")) || {};
      const items = Object.values(index).sort(
        (a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );
      return json(res, 200, { ok: true, items });
    }

    // If KV isn't configured, admin can still load (empty list)
    return json(res, 200, { ok: true, items: [], note: "KV not configured; list is empty." });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
