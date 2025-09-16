// api/_lib/auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const required = process.env.ADMIN_TOKEN;
  if (!required) return true; // not enforced if unset

  const header = (req.headers['x-admin-token'] as string) || '';
  const query = (req.query.token as string) || '';
  const token = header || query;

  if (token !== required) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}
