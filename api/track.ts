import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../lib/rateLimit';
import { writeJsonl } from '../lib/logger';
import * as crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    let body: any = {};
    try {
      body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
    }

    if (!body || typeof body.event !== 'string' || !body.event.trim()) {
      return res.status(400).json({ ok: false, error: 'Missing required "event"' });
    }

    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0] || '0.0.0.0';
    const salt = process.env.TRACK_SALT || 'dev-salt';
    const ipHash = crypto.createHash('sha256').update(ip + ':' + salt).digest('hex').slice(0, 32);

    const limit = parseInt(process.env.TRACK_RATE_LIMIT || '60', 10);
    const { allowed, remaining, reset } = rateLimit(ip, limit, 5 * 60 * 1000);
    if (!allowed) return res.status(429).json({ ok: false, error: 'Rate limit exceeded', remaining, reset });

    const line = {
      ts: new Date().toISOString(),
      ipHash,
      ua: req.headers['user-agent'] || '',
      referer: req.headers['referer'] || '',
      path: req.url,
      event: body.event.trim(),
      data: body.data
    };

    try {
      await writeJsonl(line);
    } catch (err) {
      console.warn('Failed to write log:', err);
    }

    return res.status(200).json({ ok: true, remaining, reset });
  } catch (err: any) {
    console.error('track handler error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}
