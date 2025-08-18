// /api/track.js - Vercel Function: accept JSON metrics, return 204
export default async function handler(req, res){
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    // Basic size guard (64KB)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').slice(0, 65536);
    // Optional: parse to validate JSON (ignore errors)
    try { JSON.parse(raw); } catch(e) {}
    // For now we just drop the data. You could log or forward here.
    res.status(204).end();
  } catch (e) {
    res.status(204).end();
  }
}
