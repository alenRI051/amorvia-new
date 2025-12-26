// api/track.ts
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

function safeId(x: any) {
  const s = String(x || "");
  // keep it URL/key safe and bounded
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_:.]/g, "")
    .slice(0, 120) || "unknown";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Use POST" });

  const payload: TrackPayload = req.body || {};
  const events = Array.isArray(payload.events) ? payload.events : [];

  if (!events.length) return json(res, 400, { ok: false, error: "No events" });

  const sid = safeId(payload.sessionId || events?.[0]?.sid || "unknown");
  const startedAt = Number(payload.startedAt || Date.now());
  const scenarioId = payload.scenarioId || null;

  const sessionKey = `amorvia:log:${sid}`;
  const indexKey = "amorvia:logs:index";

  const now = Date.now();
  const meta = {
    id: sid,
    startedAt,
    updatedAt: now,
    scenarioId,
    count: events.length,
  };

  try {
    // KV path (recommended)
    if (hasKV()) {
      const { kv } = await import("@vercel/kv");

      // Merge into existing session log (if any)
      const existing = (await kv.get<any>(sessionKey)) || null;

      if (existing && Array.isArray(existing.events)) {
        const mergedEvents = existing.events.concat(events).slice(-2000);

        const merged = {
          id: sid,
          startedAt: existing.startedAt || startedAt,
          updatedAt: now,
          scenarioId: existing.scenarioId || scenarioId,
          events: mergedEvents,
        };

        await kv.set(sessionKey, merged);
      } else {
        await kv.set(sessionKey, {
          id: sid,
          startedAt,
          updatedAt: now,
          scenarioId,
          events: events.slice(-2000),
        });
      }

      // Update index (map keyed by session id)
      const index = (await kv.get<Record<string, any>>(indexKey)) || {};
      index[sid] = meta;
      await kv.set(indexKey, index);

      return json(res, 200, { ok: true, stored: "kv", id: sid, added: events.length });
    }

    // No storage configured: still return OK so client doesn't fail playtest
    return json(res, 200, {
      ok: true,
      stored: "none",
      id: sid,
      added: events.length,
      note: "Vercel KV not configured (KV_REST_API_URL/TOKEN missing). Add Vercel KV to persist logs.",
    });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
