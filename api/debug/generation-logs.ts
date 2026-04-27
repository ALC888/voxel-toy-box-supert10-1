import { getDb } from '../lib/db.js';

function parseLimit(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '10'), 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 50) : 10;
}

function parseSuccessFilter(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'success') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'failure' || normalized === 'failed') {
    return false;
  }

  return undefined;
}

export default async function handler(req: any, res: any) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    const db = getDb();
    const limit = parseLimit(req.query?.limit);
    const successFilter = parseSuccessFilter(req.query?.success ?? req.query?.status);
    const logs = await db.listGenerationLogs(limit, successFilter);
    const failedCount = logs.filter((log) => !log.success).length;
    return res.status(200).json({
      success: true,
      mode: db.mode,
      count: logs.length,
      requestedStatus:
        typeof successFilter === 'boolean'
          ? successFilter
            ? 'success'
            : 'failure'
          : 'all',
      failedCount,
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
