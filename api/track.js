export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).setHeader('Allow','POST').end(); return; }
  const ct = req.headers['content-type'] || '';
  const isJSON = ct.includes('application/json');
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const botLike = /\b(bot|spider|crawl|slurp|fetch|monitor|headless|puppeteer)\b/.test(ua);
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  globalThis.__RL__=globalThis.__RL__||new Map();
  const bucket = globalThis.__RL__.get(ip)||[];
  const oneMinAgo = now - 60_000;
  const recent = bucket.filter(t => t > oneMinAgo);
  if (recent.length > 60 || botLike || !isJSON) { res.status(204).end(); return; }
  recent.push(now); globalThis.__RL__.set(ip, recent);

  let body=''; for await (const chunk of req) body+=chunk;
  let payload={}; try { payload = JSON.parse(body||'{}'); } catch { res.status(204).end(); return; }

  const ALLOWED = new Set(['scenario_start','choice_made','line_next','act_end','save_slot','load_slot','app_init']);
  if (!payload || !ALLOWED.has(payload.name)) { res.status(204).end(); return; }

  const evt = { ts: now, name: payload.name, data: payload.data, ctx: payload.ctx };
  console.log('[metrics]', JSON.stringify(evt));
  res.status(204).end();
}