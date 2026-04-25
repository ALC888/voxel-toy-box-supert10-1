import { getDb } from '../lib/db';

export default async function handler(_req: any, res: any) {
  const db = getDb();
  const status = await db.healthCheck();
  return res.status(status.ok ? 200 : 503).json(status);
}
