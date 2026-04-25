import { getDb } from '../lib/db';

function parseLimit(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '10'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;
}

export default async function handler(req: any, res: any) {
  try {
    const db = getDb();
    const limit = parseLimit(req.query?.limit);
    const logs = await db.listGenerationLogs(limit);
    return res.status(200).json({
      success: true,
      mode: db.mode,
      count: logs.length,
      logs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error.';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
