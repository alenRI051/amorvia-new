import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

type TrackEvent = {
  ts: number;
  type: string;
  scenarioId?: string;
  nodeId?: string;
  stepId?: string;
  choiceId?: string;
  text?: string;
  [key: string]: any;
};

type TrackPayload = {
  sessionId?: string;
  startedAt?: number;
  scenarioId?: string;
  events?: TrackEvent[];
};

function safeId(input: unknown, fallback = "unknown") {
  const s = typeof input === "string" ? input : fallback;
  return s
    .trim()
    .slice(0, 200)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function dateKeyFrom(ms: number) {
  const d = new Date(Number.isFinite(ms) ? ms : Date.now());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function json(res: VercelResponse, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(data);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Use POST" });
  }

  try {
    const body = (req.body ?? {}) as TrackPayload;

    const sessionId = safeId(body.sessionId, "");
    const startedAt =
      typeof body.startedAt === "number" && Number.isFinite(body.startedAt)
        ? body.startedAt
        : Date.now();

    const scenarioId =
      typeof body.scenarioId === "string" && body.scenarioId.trim()
        ? body.scenarioId.trim()
        : null;

    const events: TrackEvent[] = Array.isArray(body.events) ? body.events : [];

    // sessionId je obavezan
    if (!sessionId) {
      return json(res, 400, {
        ok: false,
        error: "Invalid payload (sessionId missing)",
      });
    }

    // events može biti prazno → noop (da ne spama konzolu 400-icama)
    if (events.length === 0) {
      return json(res, 200, { ok: true, stored: "noop", added: 0 });
    }

    // minimalno sanity: ts/type
    const sanitized = events
      .map((e) => ({
        ...e,
        ts:
          typeof e?.ts === "number" && Number.isFinite(e.ts) ? e.ts : Date.now(),
        type: typeof e?.type === "string" ? e.type : "unknown",
      }))
      .slice(-500); // zaštita od prevelikih batch-eva

    const dateKey = dateKeyFrom(startedAt);
    const rnd = Math.random().toString(16).slice(2);
    const path = `events/${dateKey}/${sessionId}-${rnd}.json`;

    const payload = {
      sessionId,
      startedAt,
      scenarioId,
      receivedAt: new Date().toISOString(),
      events: sanitized,
    };

    const { url } = await put(path, JSON.stringify(payload), {
      access: "public", // ← bitno: tvoj Blob store traži public
      contentType: "application/json",
    });

    return json(res, 200, {
      ok: true,
      stored: "blob",
      path,
      url,
      added: sanitized.length,
    });
  } catch (err: any) {
    console.error("[api/track] error:", err);
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}

