export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

type TrackPayload = {
  sessionId?: string;
  startedAt?: number;
  scenarioId?: string;
  events?: any[];
};

function json(res: any, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}

function hasKV() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function safeId(x: any) {
  return String(x || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_:.]/g, "")
    .slice(0, 120);
}

function toDateKey(ms: number) {
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Use POST" });

  const payload: TrackPayload = req.body || {};
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (!events.length) return json(res, 400, { ok: false, error: "No events" });

  const sid = safeId(payload.sessionId || payload.events?.[0]?.sid || "unknown");
  const startedAt = Number(payload.startedAt || Date.now());
  const key = `amorvia:log:${sid}`;

  const item = {
    id: sid,
    startedAt,
    updatedAt: Date.now(),
    scenarioId: payload.scenarioId || null,
    events,
  };

  try {
    // 1) KV path
    if (hasKV()) {
      const { kv } = await import("@vercel/kv");

      const metaKey = "amorvia:logs:index";
      const meta = {
        id: item.id,
        startedAt: item.startedAt,
        updatedAt: item.updatedAt,
        scenarioId: item.scenarioId,
        count: item.events.length,
      };

      const existing = (await kv.get<any>(key)) || null;
      if (existing && Array.isArray(existing.events)) {
        existing.events = existing.events.concat(item.events).slice(-2000);
        existing.updatedAt = item.updatedAt;
        existing.scenarioId = existing.scenarioId || item.scenarioId;
        await kv.set(key, existing);
      } else {
        await kv.set(key, { ...item, events: item.events.slice(-2000) });
      }

      const index = (await kv.get<Record<string, any>>(metaKey)) || {};
      index[item.id] = meta;
      await kv.set(metaKey, index);

      return json(res, 200, { ok: true, stored: "kv", id: item.id, added: events.length });
    }

    // 2) Blob path (align with /api/list-logs which lists events/<date>/...)
    if (hasBlob()) {
      const { put, head } = await import("@vercel/blob");

      const dateKey = toDateKey(startedAt);
      const path = `events/${dateKey}/${item.id}.json`;

      let merged = { ...item, events: item.events.slice(-2000) } as any;
      try {
        const h = await head(path);
        if (h?.url) {
          const prevRes = await fetch(h.url, { cache: "no-store" });
          if (prevRes.ok) {
            const prev = await prevRes.json();
            if (prev && Array.isArray(prev.events)) {
              merged.events = prev.events.concat(item.events).slice(-2000);
              merged.startedAt = prev.startedAt || merged.startedAt;
              merged.scenarioId = prev.scenarioId || merged.scenarioId;
            }
          }
        }
      } catch {}

      await put(path, JSON.stringify(merged), {
        access: "public",
        contentType: "application/json",
      });

      return json(res, 200, {
        ok: true,
        stored: "blob",
        date: dateKey,
        path,
        id: item.id,
        added: events.length,
      });
    }

    // 3) No storage configured
    return json(res, 200, {
      ok: true,
      stored: "none",
      id: item.id,
      added: events.length,
      note: "No KV/Blob configured on Vercel. Add Vercel KV or Blob to persist logs.",
    });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
