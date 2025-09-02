
export default async function handler(req, res) {
  try{
    if (req.method !== 'POST') { res.status(405).json({ ok:false, error:'Method Not Allowed' }); return; }
    const data = req.body || {};
    // Very lightweight: just log to console. Vercel will discard logs unless collected.
    console.log('[track]', { ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress, data });
    res.status(200).json({ ok:true });
  }catch(e){
    console.error('track error', e);
    res.status(500).json({ ok:false });
  }
}
