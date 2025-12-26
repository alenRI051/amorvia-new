import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";

type TrackEvent = {
  ts: number;
  type: string;
  scenarioId?: string;
  [key: string]: any;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const body = req.body ?? {};

    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId : null;
    const scenarioId =
      typeof body.scenarioId === "string" ? body.scenarioId : null;
    const events: TrackEvent[] = Array.isArray(body.events)
      ? body.events
      : [];

    if (!sessionId || events.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Invalid payload (sessionId or events missing)",
      });
    }

    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const rnd = Math.random().toString(16).slice(2);

    const payload = {
      sessionId,
      scenarioId,
      receivedAt: now.toISOString(),
      events,
    };

    const path = `events/${dateKey}/${sessionId}-${rnd}.json`;

    const { url } = await put(path, JSON.stringify(payload, null, 2), {
      access: "public", // 🔴 KRITIČNO
      contentType: "application/json",
    });

    return res.status(200).json({
      ok: true,
      stored: "blob",
      path,
      url,
      added: events.length,
    });
  } catch (err: any) {
    console.error("[track] error:", err);
    return res.status(500).json({
      ok: false,
      error: err?.message || "Internal Server Error",
    });
  }
}
