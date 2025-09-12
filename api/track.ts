import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../lib/rateLimit';
import { writeJsonl } from '../lib/logger';
import * as crypto from 'crypto';

/**
 * Debug-friendly /api/track
 * - Robust JSON body parsing (handles undefined, string, or raw stream)
 * - Extra console logs for visibility in Vercel
 * - Safe logger (won't crash on fs errors)
 * - CORS + OPTIONS
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    // ---- Body parsing (robust) ----
    let body: any = {};
    try {
      if (!req.body) {
        const chunks: Buffer[] = [];
        for await (const chunk of (req as any)) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString('utf8');
        console.log('[track] raw body len:', raw.length);
        body = raw ? JSON.parse(raw) : {};
      } else if (typeof req.body === 'string') {
        console.log('[track] body is string, length:', req.body.length);
        body = JSON.parse(req.body);
      } else {
        console.log('[track] body is object keys:', Object.keys(req.body || {}));
        body = req.body;
      }
    } catch (e) {
      console.error('[track] JSON parse error:', e);
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }

    if (!body || typeof body.event !== 'string' || !body.event.trim()) {
      return res.status(400).json({ ok: false, error: 'Missing required "event"' });
    }

    // ---- Rate limit + ip hash ----
    const ip = ((req.headers['x-forwarded-for'] as string) || '').split(',')[0] || '0.0.0.0';
    const limit = parseInt(process.env.TRACK_RATE_LIMIT || '60', 10);
    const { allowed, remaining, reset } = rateLimit(ip, limit, 5 * 60 * 1000);
    if (!allowed) return res.status(429).json({ ok: false, error: 'Rate limit exceeded', remaining, reset });

    const salt = process.env.TRACK_SALT || 'dev-salt';
    const ipHash = crypto.createHash('sha256').update(ip + ':' + salt).digest('hex').slice(0, 32);

    // ---- Compose line ----
    const line = {
      ts: new Date().toISOString(),
      ipHash,
      ua: (req.headers['user-agent'] as string) || '',
      referer: (req.headers['referer'] as string) || '',
      path: req.url,
      event: body.event.trim(),
      data: body.data
    };

    console.log('[track] line ->', JSON.stringify(line));
    console.log("[track] env TRACK_SALT length:", (process.env.TRACK_SALT || "").length);
    console.log("[track] env TRACK_RATE_LIMIT:", process.env.TRACK_RATE_LIMIT);
    
    try {
      await writeJsonl(line);
      console.log('[track] writeJsonl ok');
    } catch (err) {
      console.warn('[track] writeJsonl failed:', err);
    }

    return res.status(200).json({ ok: true, remaining, reset });
  } catch (err: any) {
    console.error('[track] handler error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
