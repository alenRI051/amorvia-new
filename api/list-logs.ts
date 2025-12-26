// api/list-logs.ts
function json(res: any, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function hasKV() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export default async function handler(req: any, res: any) {
  try {
    if (!hasKV()) {
      return json(res, 200, { ok: true, items: [] });
    }

    const { kv } = await import("@vercel/kv");
    const index =
      (await kv.get<Record<string, any>>("amorvia:logs:index")) || {};

    const items = Object.values(index).map((m: any) => ({
      uploaded: new Date(m.updatedAt || m.startedAt).toISOString(),
      path: `amorvia-logs/${m.id}.json`,
      size: m.count || 0, // not bytes, but admin only displays it
    }));

    return json(res, 200, { ok: true, items });
  } catch (err: any) {
    return json(res, 500, {
      ok: false,
      error: String(err?.message || err),
    });
  }
}
