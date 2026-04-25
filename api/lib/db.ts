import { newDb } from 'pg-mem';
import { Pool, type QueryResultRow } from 'pg';

export interface GenerationLogRecord extends QueryResultRow {
  id: number;
  prompt: string;
  generation_options: Record<string, unknown>;
  success: boolean;
  voxel_count: number;
  color_count: number;
  warnings: string[];
  template_match: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export type DatabaseHealthStatus = {
  ok: boolean;
  mode: 'postgres' | 'embedded' | 'noop';
  message: string;
};

export type DatabaseReport = {
  health: DatabaseHealthStatus;
  write: {
    ok: boolean;
    message?: string;
  };
};

export type GenerationLogPayload = {
  prompt: string;
  generation_options: Record<string, unknown>;
  success: boolean;
  voxel_count: number;
  color_count: number;
  warnings: string[];
  template_match: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

export type DatabaseClient = {
  mode: 'postgres' | 'embedded' | 'noop';
  insertGenerationLog: (payload: GenerationLogPayload) => Promise<void>;
  listGenerationLogs: (limit?: number) => Promise<GenerationLogRecord[]>;
  healthCheck: () => Promise<DatabaseHealthStatus>;
};

export async function getDatabaseReport(
  client: DatabaseClient,
  writeResult?: { ok: boolean; message?: string }
): Promise<DatabaseReport> {
  const health = await client.healthCheck();
  return {
    health,
    write: writeResult ?? {
      ok: false,
      message: 'No database write attempt was recorded.',
    },
  };
}

const CREATE_TABLE_SQL = `
  create table if not exists generation_logs (
    id bigserial primary key,
    prompt text not null,
    generation_options jsonb not null,
    success boolean not null,
    voxel_count integer not null,
    color_count integer not null,
    warnings jsonb not null,
    template_match jsonb,
    error_message text,
    created_at timestamptz not null
  );
`;

const CREATE_INDEX_SQL = `
  create index if not exists generation_logs_created_at_idx
  on generation_logs (created_at desc);
`;

const EMBEDDED_CREATE_TABLE_SQL = `
  create table generation_logs (
    id integer,
    prompt text,
    generation_options jsonb,
    success boolean,
    voxel_count integer,
    color_count integer,
    warnings jsonb,
    template_match jsonb,
    error_message text,
    created_at timestamptz
  );
`;

let db: DatabaseClient | null = null;
let pool: Pool | null = null;
let embeddedDb: ReturnType<typeof newDb> | null = null;
let schemaReadyPromise: Promise<void> | null = null;
let embeddedGenerationLogId = 1;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

function isEmbeddedDbEnabled() {
  return process.env.LOCAL_DB_MODE === 'memory';
}

function getEmbeddedPool() {
  if (pool) {
    return pool;
  }

  if (!embeddedDb) {
    embeddedDb = newDb({ autoCreateForeignKeyIndices: true });
    embeddedDb.public.none(EMBEDDED_CREATE_TABLE_SQL);
    embeddedDb.public.none(CREATE_INDEX_SQL);
  }

  const { Pool: EmbeddedPool } = embeddedDb.adapters.createPg();
  pool = new EmbeddedPool();
  return pool;
}

function getPool() {
  if (pool) {
    return pool;
  }

  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    if (isEmbeddedDbEnabled()) {
      return getEmbeddedPool();
    }

    return null;
  }

  pool = new Pool({
    connectionString,
    ssl: process.env.POSTGRES_SSL === 'disable' ? false : undefined,
  });

  return pool;
}

async function ensureSchemaReady() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  const client = getPool();

  if (!client) {
    return;
  }

  if (isEmbeddedDbEnabled()) {
    schemaReadyPromise = Promise.resolve();
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    await client.query(CREATE_TABLE_SQL);
    await client.query(CREATE_INDEX_SQL);
  })();

  return schemaReadyPromise;
}

function createNoopClient(): DatabaseClient {
  return {
    mode: 'noop',
    async insertGenerationLog(payload) {
      console.warn('Database unavailable, skipped generation log insert.', payload);
    },
    async listGenerationLogs() {
      return [];
    },
    async healthCheck() {
      return {
        ok: false,
        mode: 'noop',
        message: 'No DATABASE_URL/POSTGRES_URL configured. Running without persistent logs.',
      };
    },
  };
}

function createSqlClient(
  client: Pool,
  mode: 'postgres' | 'embedded'
): DatabaseClient {
  const insertSql =
    mode === 'embedded'
      ? `
          insert into generation_logs (
            id,
            prompt,
            generation_options,
            success,
            voxel_count,
            color_count,
            warnings,
            template_match,
            error_message,
            created_at
          )
          values ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)
        `
      : `
          insert into generation_logs (
            prompt,
            generation_options,
            success,
            voxel_count,
            color_count,
            warnings,
            template_match,
            error_message,
            created_at
          )
          values ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
        `;

  return {
    mode,
    async insertGenerationLog(payload) {
      await ensureSchemaReady();

      const baseParams = [
        payload.prompt,
        JSON.stringify(payload.generation_options),
        payload.success,
        payload.voxel_count,
        payload.color_count,
        JSON.stringify(payload.warnings),
        JSON.stringify(payload.template_match),
        payload.error_message,
        payload.created_at,
      ];

      await client.query(
        insertSql,
        mode === 'embedded' ? [embeddedGenerationLogId++, ...baseParams] : baseParams
      );
    },
    async listGenerationLogs(limit = 10) {
      await ensureSchemaReady();
      const result = await client.query<GenerationLogRecord>(
        `
          select
            id,
            prompt,
            generation_options,
            success,
            voxel_count,
            color_count,
            warnings,
            template_match,
            error_message,
            created_at
          from generation_logs
          order by created_at desc
          limit $1
        `,
        [limit]
      );
      return result.rows;
    },
    async healthCheck() {
      try {
        await ensureSchemaReady();
        await client.query('select 1');
        return {
          ok: true,
          mode,
          message:
            mode === 'embedded'
              ? 'Embedded Postgres connected and generation_logs schema is ready.'
              : 'Postgres connected and generation_logs schema is ready.',
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown database error.';
        return {
          ok: false,
          mode,
          message,
        };
      }
    },
  };
}

export function getDb(): DatabaseClient {
  if (db) {
    return db;
  }

  const client = getPool();
  if (!client) {
    db = createNoopClient();
    return db;
  }

  db = isEmbeddedDbEnabled()
    ? createSqlClient(client, 'embedded')
    : createSqlClient(client, 'postgres');
  return db;
}
