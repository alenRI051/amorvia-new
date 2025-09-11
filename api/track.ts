import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit } from '../lib/rateLimit';
import { writeJsonl } from '../lib/logger';
import crypto from 'crypto';

type TrackBody = { event: string; data?: Record<string, unknown> };
function getIP(req: VercelRequest): string { const xff = (req.headers['x-forwarded-for']||'') as string; if (xff) return xff.split(',')[0].trim(); return (req.socket as any)?.remoteAddress || '0.0.0.0'; }
function hashIP(ip: string, salt: string): string { return crypto.createHash('sha256').update(ip+':'+salt).digest('hex').slice(0,32); }
export default async function handler(req: VercelRequest, res: VercelResponse){ res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if(req.method==='OPTIONS') return res.status(204).end(); if(req.method!=='POST') return res.status(405).json({ok:false,error:'Method Not Allowed'});
  try { const ip=getIP(req); const limit=parseInt(process.env.TRACK_RATE_LIMIT||'60',10); const windowMs=5*60*1000; const {allowed,remaining,reset}=rateLimit(ip,limit,windowMs); if(!allowed) return res.status(429).json({ok:false,error:'Rate limit exceeded',remaining,reset}); const salt=process.env.TRACK_SALT||'dev-salt'; const ipHash=hashIP(ip,salt); const userAgent=(req.headers['user-agent']||'') as string; const referer=(req.headers['referer']||'') as string; const url=req.url||'/api/track'; const body=(typeof req.body==='string')?JSON.parse(req.body):req.body; if(!body||typeof body.event!=='string'||!body.event.trim()) return res.status(400).json({ok:false,error:'Invalid payload: "event" is required'});
    const payload:TrackBody={event:String(body.event).trim(),data:(typeof body.data==='object'&&body.data)||undefined}; const line={ts:new Date().toISOString(), ipHash, ua:userAgent, referer, path:url, ...payload}; await writeJsonl(line); return res.status(200).json({ok:true,remaining,reset}); } catch(err){ console.error('track handler error',err); return res.status(500).json({ok:false,error:'Server error'});} }
