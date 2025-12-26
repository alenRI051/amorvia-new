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
  payload?: any;
  scenarioId?: string;
  nodeId?: string;
  stepId?: string;
  choiceId?: string;
  text?: string;
  [key: string]: any;
};

type BatchPayload = {
  sessionId?: string;
  startedAt?: number;
  scenarioId?: string;
  events?: TrackEvent[];
};

type SingleEventPayload = {
  ts?: number;
  type?: string;
  payload?: any;
  scenarioId?: string;
  sessionId?: string;
  startedAt?: number;
};

function safeId(input: unknown, fallback = ""): string {
  const s = typeof input === "string" ? input : fallback;
  return s
    .trim()
    .slice(0, 200)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._:-]/g, "-");
}

function dateKeyFrom(ms: number): string {
  const d = new Date(Number.isFinite(ms) ? ms : Date.now());
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function json(res: VercelResponse, status: number, data: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(data);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function makeSid(): string {
  return `sid-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function setSidCookie(res: VercelResponse, sid: string) {
  // Non-HttpOnly je OK za playtest (debug), ali možeš prebaciti na HttpOnly ako želiš.
  // SameSite=Lax da radi normalno u browseru.
  const maxAge = 60 * 60 * 24 * 30; // 30 dana
  res.setHeader(
    "Set-Cookie",
    `amorvia_sid=${encodeURIComponent(sid)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
  );
}

function detectSingleEvent(body: any): body is SingleEventPayload {
  return (
    body &&
    typeof body === "object" &&
    !Array.isArray(body.events) &&
    typeof body.type === "string"
  );
}

function extractScenarioId(body: any): string | null {
  const direct = safeId(body?.scenarioId, "");
  if (direct) return direct;

  // za eventove tipa scenario_select gdje payload.value nosi scenario id
  const pv = body?.payload?.value;
  const fromPayloadValue = safeId(typeof pv === "string" ? pv : "", "");
  if (fromPayloadValue) return fromPayloadValue;

  return null;
}

function normalizeEvents(body: any): TrackEvent[] {
  // Batch format
  if (Array.isArray(body?.events)) return body.events as TrackEvent[];

  // Single-event format (tvoj slučaj)
  if (detectSingleEvent(body)) {
    const ts = typeof body.ts === "number" && Number.isFinite(body.ts) ? body.ts : Date.now();
    return [
      {
        ts,
        type: typeof body.type === "string" ? body.type : "unknown",
        payload: body.payload ?? null,
      },
    ];
  }

  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Use POST" });
  }

  try {
    const body = (req.body ?? {}) as BatchPayload & SingleEventPayload;

    // 1) sessionId iz bodyja ako postoji
    let sid = safeId((body as any).sessionId, "");

    // 2) fallback: cookie session (za single-event telemetry payload)
    const cookies = parseCookies(req.headers.cookie);
    if (!sid) sid = safeId(cookies["amorvia_sid"], "");

    // 3) ako i dalje nema, kreiraj i postavi cookie (da od sad sve telemetry eventove vežemo uz isti sid)
    if (!sid) {
      sid = makeSid();
      setSidCookie(res, sid);
    }

    const startedAt =
      typeof body.startedAt === "number" && Number.isFinite(body.startedAt)
        ? body.startedAt
        : Date.now();

    const scenarioId = extractScenarioId(body);

    let events = normalizeEvents(body);

    // noop ako nema eventova (ne spremamo prazno)
    if (!events || events.length === 0) {
      return json(res, 200, { ok: true, stored: "noop", added: 0, sid });
    }

    // sanitize + cap
    const sanitized = events
      .map((e) => {
        const ts = typeof e?.ts === "number" && Number.isFinite(e.ts) ? e.ts : Date.now();
        const type = typeof e?.type === "string" ? e.type : "unknown";
        return { ...e, ts, type };
      })
      .slice(-500);

    const dateKey = dateKeyFrom(startedAt);
    const rnd = Math.random().toString(16).slice(2);
    const path = `events/${dateKey}/${safeId(sid, "sid")}-${rnd}.json`;

    const payload = {
      sessionId: sid,
      startedAt,
      scenarioId,
      receivedAt: new Date().toISOString(),
      events: sanitized,
    };

    const { url } = await put(path, JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
    });

    return json(res, 200, {
      ok: true,
      stored: "blob",
      sid,
      path,
      url,
      added: sanitized.length,
    });
  } catch (err: any) {
    console.error("[api/track] error:", err);
    return json(res, 500, { ok: false, error: String(err?.message || err) });
  }
}
