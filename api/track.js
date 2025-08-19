// api/track.js - Lightweight metrics endpoint for Vercel Serverless Functions
// Logs events to function logs (stdout). Swap `logEvent()` to write to a DB later.
// IMPORTANT: Do not send PII. Only structured app events.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end();
    return;
  }

  // Basic content-type guard
  const ct = req.headers['content-type'] || '';
  const isJSON = ct.includes('application/json');

  // Very small anti-bot/abuse guard
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const botLike = /\b(bot|spider|crawl|slurp|fetch|monitor|headless|puppeteer)\b/.test(ua);

  // Rate-limit by IP (best-effort, per-instance). Not perfect, but helps.
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  globalThis.__RL__ = globalThis.__RL__ || new Map();
  const bucket = globalThis.__RL__.get(ip) || [];
  // keep only last minute
  const oneMinAgo = now - 60_000;
  const recent = bucket.filter(t => t > oneMinAgo);
  if (recent.length > 60 /* 60 events/min/IP */ || botLike || !isJSON) {
    res.status(204).end(); // silently ignore
    return;
  }
  recent.push(now);
  globalThis.__RL__.set(ip, recent);

  let payload;
  try {
    payload = req.body || (await parseJSON(req));
  } catch {
    res.status(204).end(); // ignore bad JSON
    return;
  }

  // Validate schema (light)
  const event = normalizeEvent(payload, { ip, ua });
  if (!event) {
    res.status(204).end();
    return;
  }

  // Log compact line (safe fields only)
  logEvent(event);

  // CORS: same-origin by default. If you need cross-origin, add headers here.
  res.status(204).end();
}

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function normalizeEvent(p, { ip, ua }) {
  if (!p || typeof p !== 'object') return null;
  const { name, data, ctx } = p;

  const ALLOWED = new Set([
    'scenario_start',
    'choice_made',
    'line_next',
    'act_end',
    'save_slot',
    'load_slot',
    'app_init'
  ]);
  if (!ALLOWED.has(name)) return null;

  // Hard cap on sizes
  const safeData = truncateKeys(data, 10, 200); // up to 10 fields, 200 chars each
  const safeCtx  = truncateKeys(ctx, 15, 200);

  // Hash IP for privacy (just for de-dup), salt rotates daily
  const daySalt = new Date().toISOString().slice(0,10);
  const hash = sha256(`${ip}|${daySalt}`);

  return {
    ts: Date.now(),
    name,
    data: safeData,
    ctx: {
      ...safeCtx,
      ua: (ua || '').slice(0,160),
      ipHash: hash
    }
  };
}

function truncateKeys(obj, maxKeys, maxLen) {
  if (!obj || typeof obj !== 'object') return undefined;
  const out = {};
  const keys = Object.keys(obj).slice(0, maxKeys);
  for (const k of keys) {
    let v = obj[k];
    if (v == null) continue;
    if (typeof v === 'object') v = JSON.stringify(v);
    v = String(v);
    out[k] = v.length > maxLen ? v.slice(0, maxLen) : v;
  }
  return out;
}

function sha256(s) {
  // Lightweight hash in Node 18+
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(s).digest('hex').slice(0,32);
}

function logEvent(evt) {
  // One line log makes it easy to search in Vercel logs
  console.log(`[metrics] ${JSON.stringify(evt)}`);
}
