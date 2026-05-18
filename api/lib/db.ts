export interface GenerationLogRecord {
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
  listGenerationLogs: (
    limit?: number,
    success?: boolean | undefined
  ) => Promise<GenerationLogRecord[]>;
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

let db: DatabaseClient | null = null;
type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
};

let pool: PoolLike | null = null;
let schemaReadyPromise: Promise<void> | null = null;
let embeddedGenerationLogId = 1;
let embeddedGenerationLogs: GenerationLogRecord[] = [];
let pgLoadError: string | null = null;

function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

function normalizeConnectionStringSslMode(connectionString: string) {
  // pg < v9 treats 'require', 'prefer', and 'verify-ca' as aliases for
  // 'verify-full', which validates the TLS certificate CN against the
  // hostname. Neon pooler certificates do not match the pooler hostname,
  // so verify-full would fail. We add uselibpqcompat=true so these modes
  // use standard libpq semantics (e.g., 'require' = enforce TLS without
  // hostname verification), which works correctly with Neon pooler.
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get('sslmode')?.trim().toLowerCase();

    if (sslMode && sslMode !== 'disable' && sslMode !== 'verify-full') {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }

    return parsed.toString();
  } catch {
    return connectionString;
  }
}

function isEmbeddedDbEnabled() {
  return process.env.LOCAL_DB_MODE === 'memory';
}

async function getPool() {
  if (pool) {
    return pool;
  }

  const rawConnectionString = getDatabaseUrl();
  const connectionString = rawConnectionString
    ? normalizeConnectionStringSslMode(rawConnectionString)
    : null;

  if (!connectionString) {
    return null;
  }

  try {
    const pgModule = (await import('pg')) as {
      Pool?: new (options: {
        connectionString: string;
        ssl?: false | undefined;
      }) => PoolLike;
      default?: {
        Pool?: new (options: {
          connectionString: string;
          ssl?: false | undefined;
        }) => PoolLike;
      };
    };
    const PoolCtor = pgModule.Pool ?? pgModule.default?.Pool;

    if (!PoolCtor) {
      pgLoadError = 'pg module loaded but Pool export is unavailable.';
      return null;
    }

    pool = new PoolCtor({
      connectionString,
      ssl: process.env.POSTGRES_SSL === 'disable' ? false : undefined,
    });
    pgLoadError = null;
  } catch (error) {
    pgLoadError = error instanceof Error ? error.message : 'Failed to load pg module.';
    return null;
  }

  return pool;
}

async function ensureSchemaReady() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  const client = await getPool();

  if (!client) {
    return;
  }

  schemaReadyPromise = (async () => {
    await client.query(CREATE_TABLE_SQL);
    await client.query(CREATE_INDEX_SQL);
    await ensureConstraintTableReady();
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

function createEmbeddedClient(): DatabaseClient {
  return {
    mode: 'embedded',
    async insertGenerationLog(payload) {
      embeddedGenerationLogs.push({
        id: embeddedGenerationLogId++,
        ...payload,
      });
    },
    async listGenerationLogs(limit = 10, success?: boolean) {
      const hasSuccessFilter = typeof success === 'boolean';
      const filtered = hasSuccessFilter
        ? embeddedGenerationLogs.filter((entry) => entry.success === success)
        : embeddedGenerationLogs;
      return [...filtered]
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(0, limit);
    },
    async healthCheck() {
      return {
        ok: true,
        mode: 'embedded',
        message: 'Embedded in-memory database is ready.',
      };
    },
  };
}

function createSqlClient(mode: 'postgres' | 'embedded'): DatabaseClient {
  const insertSql = `
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
    values ($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)
  `;

  return {
    mode,
    async insertGenerationLog(payload) {
      const client = await getPool();
      if (!client) {
        throw new Error(pgLoadError || 'Postgres client is unavailable.');
      }

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

      await client.query(insertSql, baseParams);
    },
    async listGenerationLogs(limit = 10, success?: boolean) {
      const client = await getPool();
      if (!client) {
        throw new Error(pgLoadError || 'Postgres client is unavailable.');
      }

      await ensureSchemaReady();
      const hasSuccessFilter = typeof success === 'boolean';
      const sql = hasSuccessFilter
        ? `
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
          where success = $1
          order by created_at desc
          limit $2
        `
        : `
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
        `;
      const params = hasSuccessFilter ? [success, limit] : [limit];
      const result = (await client.query(sql, params)) as { rows: GenerationLogRecord[] };
      return result.rows;
    },
    async healthCheck() {
      try {
        const client = await getPool();
        if (!client) {
          return {
            ok: false,
            mode,
            message: pgLoadError || 'Postgres client is unavailable.',
          };
        }

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

  if (isEmbeddedDbEnabled()) {
    db = createEmbeddedClient();
    return db;
  }

  if (!getDatabaseUrl()) {
    db = createNoopClient();
    return db;
  }

  db = createSqlClient('postgres');
  return db;
}

function maskConnectionString(url: string | null): string {
  if (!url) return '(not set)';
  try {
    const parsed = new URL(url);
    parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid URL)';
  }
}

export interface VoxelModelConstraint {
  id: number;
  category: string;
  keywords: string[];
  min_voxel_count: number;
  max_voxel_count: number;
  anatomy_rules: string[];
  forbidden_patterns: string[];
  color_palette: string[];
  priority: number;
}

const CREATE_CONSTRAINTS_TABLE_SQL = `
  create table if not exists voxel_model_constraints (
    id bigserial primary key,
    category text not null unique,
    keywords text[] not null,
    min_voxel_count integer not null,
    max_voxel_count integer not null,
    anatomy_rules text[] not null,
    forbidden_patterns text[] not null,
    color_palette text[],
    priority integer default 0,
    created_at timestamptz not null default now()
  );
`;

const CREATE_CONSTRAINTS_INDEX_SQL = `
  create index if not exists voxel_model_constraints_priority_idx
  on voxel_model_constraints (priority desc);
`;

const SEED_CONSTRAINTS_SQL = `
  insert into voxel_model_constraints
    (category, keywords, min_voxel_count, max_voxel_count, anatomy_rules, forbidden_patterns, color_palette, priority)
  values
    (
      'animal',
      array['animal','bird','cat','dog','rabbit','horse','fish','bunny','feline','canine','pet','creature','eagle','fox','penguin','turtle','corgi'],
      80, 280,
      array[
        'Must have a distinct head at the top connected to the body',
        'Must have a body forming the main mass',
        'Must have limb-like protrusions (legs, wings, or fins)',
        'Head must be visibly separate from body (at least 1-block neck or offset)'
      ],
      array[
        'No floating head without a body connection',
        'No single-block-thick limbs',
        'No amorphous blob without recognizable animal features'
      ],
      array['#ff9955','#ee6633','#cc8844','#554433','#ffcc88','#ffffff','#997755','#dd8855'],
      10
    ),
    (
      'vehicle',
      array['car','truck','bus','vehicle','plane','aircraft','boat','ship','helicopter','rocket','spaceship','sedan','firetruck'],
      60, 260,
      array[
        'Must have a main body or chassis',
        'Must have wheels, wings, or rotors',
        'Must be horizontally oriented (longer than tall)',
        'Wheels must be at the bottom touching or near y=0'
      ],
      array[
        'No amorphous blob shape',
        'No bipedal or animal-like structure',
        'No vehicle without wheels/wings (unless it is a boat/ship)'
      ],
      array['#ff3333','#3366ff','#333333','#cccccc','#ffff00','#ff6600','#ffffff'],
      10
    ),
    (
      'building',
      array['castle','house','building','tower','temple','church','palace','fort','structure','skyscraper','lighthouse'],
      100, 350,
      array[
        'Must have a rectangular or polygonal base at y=0',
        'Must have vertical walls (at least 3 voxels tall)',
        'Must have a distinct top feature (roof, spire, battlement)',
        'Must have at least one recognizable architectural element (door, window, arch)'
      ],
      array[
        'No flat single-layer structures',
        'No organic or animal-like shapes',
        'No building without walls'
      ],
      array['#998877','#ccbbaa','#776655','#aa9977','#ddccbb','#665544','#888888'],
      8
    ),
    (
      'character',
      array['robot','human','person','figure','character','hero','villain','soldier','knight','warrior'],
      100, 300,
      array[
        'Must have a head at the top',
        'Must have a torso below the head',
        'Must have two arms extending from the torso sides',
        'Must have two legs extending downward from the torso',
        'Must be standing upright (taller than wide)'
      ],
      array[
        'No one-block-thick silhouette (use at least 2-block thickness)',
        'No limbless torso',
        'No floating body parts'
      ],
      array['#ff8866','#3355cc','#ddaa33','#555555','#ee4444','#ffffff','#ccbb99','#333333'],
      8
    ),
    (
      'plant',
      array['tree','flower','plant','mushroom','cactus','bush','vegetation','forest'],
      40, 220,
      array[
        'Must have a trunk or stem growing upward from y=0',
        'Must have a canopy, head, petals, or foliage at the top',
        'Must be vertical (taller than wide)',
        'Stem/trunk must be centered under the canopy'
      ],
      array[
        'No asymmetric base without counterbalance',
        'No overhanging disconnected parts',
        'No flat ground-cover without vertical structure'
      ],
      array['#44aa33','#66cc44','#88aa55','#339922','#55bb33','#774422','#cc6699','#ff8899'],
      6
    ),
    (
      'object',
      array['chair','table','desk','bed','lamp','furniture','basket','box','item','tool','sword','weapon','computer','phone','book'],
      30, 180,
      array[
        'Must have a recognizable functional shape',
        'Must be stable on the ground (flat base or legs at y=0)',
        'Must have the defining features of the object type'
      ],
      array[
        'No biological or animal body plan',
        'No floating disconnected parts'
      ],
      null,
      5
    )
  on conflict (category) do nothing;
`;

let constraintsReady = false;

async function ensureConstraintTableReady() {
  if (constraintsReady) {
    return;
  }

  const client = await getPool();
  if (!client) {
    return;
  }

  await client.query(CREATE_CONSTRAINTS_TABLE_SQL);
  await client.query(CREATE_CONSTRAINTS_INDEX_SQL);
  await client.query(SEED_CONSTRAINTS_SQL);
  constraintsReady = true;
}

export async function getConstraintsForPrompt(
  prompt: string
): Promise<VoxelModelConstraint[]> {
  const client = await getPool();
  if (!client) {
    return [];
  }

  await ensureConstraintTableReady();

  const lowerPrompt = prompt.toLowerCase();
  const result = (await client.query(
    `
    select
      id, category, keywords, min_voxel_count, max_voxel_count,
      anatomy_rules, forbidden_patterns, color_palette, priority
    from voxel_model_constraints
    order by priority desc
    `
  )) as { rows: VoxelModelConstraint[] };

  return result.rows.filter((row) =>
    row.keywords.some((kw) => lowerPrompt.includes(kw.toLowerCase()))
  );
}

export function getDbDiagnostics() {
  const rawUrl = getDatabaseUrl();
  const maskedUrl = maskConnectionString(rawUrl);
  let sslMode = '(not set)';
  if (rawUrl) {
    try {
      sslMode = new URL(rawUrl).searchParams.get('sslmode') ?? 'default';
    } catch {
      sslMode = '(parse error)';
    }
  }
  return {
    databaseUrl: maskedUrl,
    sslMode,
    pgLoadError,
    poolInitialized: pool !== null,
    hasDbClient: db !== null,
    embeddedEnabled: isEmbeddedDbEnabled(),
  };
}
