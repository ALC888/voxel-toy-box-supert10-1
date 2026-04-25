import { closePool, createPostgresPool, ensureTemplateRoutingLogSchema } from './postgresUtils.js';
import { pathToFileURL } from 'node:url';

export interface PostgresConnectivityReport {
  ok: boolean;
  tableReady: boolean;
  canInsert: boolean;
  canRead: boolean;
  latencyMs: number;
  error?: string;
}

export async function runPostgresConnectivityCheck(): Promise<PostgresConnectivityReport> {
  const startedAt = Date.now();
  let pool: ReturnType<typeof createPostgresPool> | null = null;

  let tableReady = false;
  let canInsert = false;
  let canRead = false;

  try {
    pool = createPostgresPool();
    await pool.query('select 1 as ok');
    await ensureTemplateRoutingLogSchema(pool);
    tableReady = true;

    const probeCreatedAt = new Date().toISOString();
    const probePayload = {
      probe: true,
      source: 'postgresConnectivityCheck',
      createdAt: probeCreatedAt,
    };

    const insertResult = await pool.query<{ id: number }>(
      `
        insert into template_routing_log_events (event_type, created_at, payload_json)
        values ($1, $2, $3::jsonb)
        returning id
      `,
      ['feedback', probeCreatedAt, JSON.stringify(probePayload)]
    );

    const insertedId = insertResult.rows[0]?.id;
    canInsert = Number.isFinite(insertedId);

    if (insertedId) {
      const readResult = await pool.query<{ id: number }>(
        `
          select id
          from template_routing_log_events
          where id = $1
        `,
        [insertedId]
      );

      canRead = readResult.rows.length === 1;

      await pool.query(`delete from template_routing_log_events where id = $1`, [insertedId]);
    }

    return {
      ok: tableReady && canInsert && canRead,
      tableReady,
      canInsert,
      canRead,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      tableReady,
      canInsert,
      canRead,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Unknown postgres connectivity error',
    };
  } finally {
    if (pool) {
      await closePool(pool);
    }
  }
}

async function main() {
  const report = await runPostgresConnectivityCheck();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
