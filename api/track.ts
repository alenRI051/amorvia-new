
// api/track.ts (v9.3)
import type { VercelRequest, VercelResponse } from '@vercel/node';
type Event = { type: string; payload?: any; ts: number };
const bucket: Record<string, Event[]> = Object.create(null);
function push(e: Event){ const day = new Date(e.ts || Date.now()).toISOString().slice(0,10); (bucket[day] ||= []).push(e); if (bucket[day].length>1000) bucket[day].splice(0, bucket[day].length-1000); }
export default async function handler(req: VercelRequest, res: VercelResponse){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'POST'){
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const evt: Event = { type: String(body?.type || 'unknown'), payload: body?.payload || {}, ts: Number(body?.ts || Date.now()) };
      push(evt); console.log('[track]', evt.type, evt.payload); return res.status(202).json({ ok:true });
    } catch(e){ return res.status(400).json({ ok:false, error:'Bad JSON' }); }
  }
  if (req.method === 'GET'){
    const days = Object.keys(bucket).sort().reverse(); const out: Event[] = [];
    for (const d of days){ out.push(...bucket[d].slice(-200)); if (out.length>=200) break; }
    return res.status(200).json({ ok:true, events: out.slice(-200) });
  }
  return res.status(405).json({ ok:false, error:'Method not allowed' });
}
