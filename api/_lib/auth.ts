import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Optional admin guard. Set ADMIN_TOKEN in env to enable.
 * Checks x-admin-token header or ?token= query param.
 */
export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true; // guard disabled
  const got = (req.headers['x-admin-token'] as string) || (req.query.token as string) || '';
  if (got && got === expected) return true;
  res.status(401).json({ ok: false, error: 'Unauthorized' });
  return false;
}
