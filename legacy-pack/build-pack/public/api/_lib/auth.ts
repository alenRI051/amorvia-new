import type { VercelRequest, VercelResponse } from '@vercel/node';

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return true; // Allow if not configured
  const header = (req.headers['x-admin-token'] as string) || '';
  const query  = (req.query.token as string) || '';
  const token  = header || query;
  if (token !== required) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}
