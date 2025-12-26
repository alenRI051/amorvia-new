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

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

function safeId(x: any) {
  const s = String(x || "");
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9-_:.]/g, "")
      .slice(0, 120) || "unknown"
  );
}

const MAX_EVENTS_PER_SESSION = 2000;

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    return json(res, 200, { ok: true, hint: "Use POST to submit events" });
  }
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Use POST" });

  const payload: TrackPayload = req.body || {};
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (!events.length) return json(res, 400, { ok: false, error: "No events" });

  if (!hasBlob()) {
    return json(res, 200, {
      ok: true,
      stored: "none",
      added: events.length,
      note: "BLOB_READ_WRITE_TOKEN missing. Connect Vercel Blob to the project.",
    });
  }

  const sid = safeId(payload.sessionId || events?.[0]?.sid || "unknown");
  const startedAt = Number(payload.startedAt || Date.now());
  const scenarioId = payload.scenarioId || null;

  const path = `amorvia-logs/${sid}.json`;

  try {
    const { put, head } = await import("@vercel/blob");

    // Try to merge with existing blob
    let merged: any = {
      id: sid,
      startedAt,
      updatedAt: Date.now(),
      scenarioId,
      events: events.slice(-MAX_EVENTS_PER_SESSION),
    };

    try {
      const h = await head(path);
      if (h?.url) {
        const prevRes = await fetch(h.url, { cache: "no-store" });
        if (prevRes.ok) {
          const prev = await prevRes.json();
          if (prev && Array.isArray(prev.events)) {
            merged.startedAt = prev.startedAt || merged.startedAt;
            merged.scenarioId = prev.scenarioId || merged.scenarioId;
            merged.events = prev.events.concat(events).slice(-MAX_EVENTS_PER_SESSION);
          }
        }
      }
    } catch {
      // if head fails (not found) it's fine — first write
    }

    merged.updatedAt = Date.now();

    await put(path, JSON.stringify(merged), {
      access: "private",
      contentType: "application/json",
    });

    return json(res, 200, { ok: true, stored: "blob", id: sid, added: events.length, path });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}

