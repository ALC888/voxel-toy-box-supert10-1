import { Pool } from 'pg';

export const CREATE_TEMPLATE_ROUTING_LOG_EVENTS_SQL = `
  create table if not exists template_routing_log_events (
    id bigserial primary key,
    event_type text not null,
    created_at timestamptz not null,
    payload_json jsonb not null
  );
`;

export const CREATE_TEMPLATE_ROUTING_LOG_EVENTS_INDEX_TYPE_SQL = `
  create index if not exists idx_template_routing_log_events_type
  on template_routing_log_events (event_type);
`;

export const CREATE_TEMPLATE_ROUTING_LOG_EVENTS_INDEX_CREATED_AT_SQL = `
  create index if not exists idx_template_routing_log_events_created_at
  on template_routing_log_events (created_at desc);
`;

export function resolveDatabaseUrl(): string {
  const value =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    '';

  if (!value) {
    throw new Error(
      'Missing database url. Set DATABASE_URL or POSTGRES_URL or POSTGRES_PRISMA_URL.'
    );
  }

  return value;
}

export function createPostgresPool() {
  return new Pool({
    connectionString: resolveDatabaseUrl(),
    ssl: process.env.POSTGRES_SSL === 'disable' ? false : undefined,
  });
}

export async function ensureTemplateRoutingLogSchema(pool: Pool): Promise<void> {
  await pool.query(CREATE_TEMPLATE_ROUTING_LOG_EVENTS_SQL);
  await pool.query(CREATE_TEMPLATE_ROUTING_LOG_EVENTS_INDEX_TYPE_SQL);
  await pool.query(CREATE_TEMPLATE_ROUTING_LOG_EVENTS_INDEX_CREATED_AT_SQL);
}

export async function closePool(pool: Pool): Promise<void> {
  await pool.end();
}
