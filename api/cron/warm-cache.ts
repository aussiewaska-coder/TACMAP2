import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[Cron] Cache warming started at', new Date().toISOString());

  // Forward to warm endpoint
  const warmHandler = await import('../cache/warm');

  // Warm Priority 1 locations only (to stay within time limit)
  req.body = { priority: 1 };

  return warmHandler.default(req, res);
}
