import type { RouteDecision, FeedbackSignal } from '../contracts/index.js';
import { pathToFileURL } from 'node:url';
import {
  runApiFeedbackDatabaseExperiment,
  type ApiFeedbackExperimentReport,
} from './apiFeedbackDatabaseExperiment.js';
import { MemoryLogEventRepository } from '../logging/memoryLogEventRepository.js';
import { VercelPostgresLogRepository } from '../logging/vercelPostgresRepository.js';
import {
  closePool,
  createPostgresPool,
  ensureTemplateRoutingLogSchema,
} from './postgresUtils.js';
import {
  runPostgresConnectivityCheck,
  type PostgresConnectivityReport,
} from './postgresConnectivityCheck.js';

export interface ReplayComparisonDiff {
  field: string;
  memoryValue: unknown;
  postgresValue: unknown;
}

export interface ReplayComparisonReport {
  ok: boolean;
  runId: string;
  timestamp: string;
  dbHealth: PostgresConnectivityReport;
  memory: ApiFeedbackExperimentReport;
  postgres: ApiFeedbackExperimentReport;
  diffs: ReplayComparisonDiff[];
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareCounts<T extends string>(
  field: string,
  memoryCounts: Record<T, number>,
  postgresCounts: Record<T, number>,
  diffs: ReplayComparisonDiff[]
) {
  if (!deepEqual(memoryCounts, postgresCounts)) {
    diffs.push({
      field,
      memoryValue: memoryCounts,
      postgresValue: postgresCounts,
    });
  }
}

function buildDiffs(
  memory: ApiFeedbackExperimentReport,
  postgres: ApiFeedbackExperimentReport
): ReplayComparisonDiff[] {
  const diffs: ReplayComparisonDiff[] = [];

  if (memory.caseCount !== postgres.caseCount) {
    diffs.push({
      field: 'caseCount',
      memoryValue: memory.caseCount,
      postgresValue: postgres.caseCount,
    });
  }

  if (memory.storedEventCount !== postgres.storedEventCount) {
    diffs.push({
      field: 'storedEventCount',
      memoryValue: memory.storedEventCount,
      postgresValue: postgres.storedEventCount,
    });
  }

  if (memory.persistedEventCount !== postgres.persistedEventCount) {
    diffs.push({
      field: 'persistedEventCount',
      memoryValue: memory.persistedEventCount,
      postgresValue: postgres.persistedEventCount,
    });
  }

  if (!deepEqual(memory.selectedTemplateIds, postgres.selectedTemplateIds)) {
    diffs.push({
      field: 'selectedTemplateIds',
      memoryValue: memory.selectedTemplateIds,
      postgresValue: postgres.selectedTemplateIds,
    });
  }

  compareCounts<RouteDecision>(
    'decisionCounts',
    memory.decisionCounts,
    postgres.decisionCounts,
    diffs
  );

  compareCounts<FeedbackSignal>(
    'feedbackCounts',
    memory.feedbackCounts,
    postgres.feedbackCounts,
    diffs
  );

  if (memory.stable !== postgres.stable) {
    diffs.push({
      field: 'stable',
      memoryValue: memory.stable,
      postgresValue: postgres.stable,
    });
  }

  return diffs;
}

function createRunId() {
  return `replay-${Date.now()}`;
}

export async function runReplayComparison(): Promise<ReplayComparisonReport> {
  const dbHealth = await runPostgresConnectivityCheck();

  if (!dbHealth.ok) {
    return {
      ok: false,
      runId: createRunId(),
      timestamp: new Date().toISOString(),
      dbHealth,
      memory: {
        caseCount: 0,
        decisionCounts: { reuse: 0, adapt: 0, free_generate: 0 },
        feedbackCounts: { helpful: 0, not_helpful: 0 },
        selectedTemplateIds: [],
        storedEventCount: 0,
        persistedEventCount: 0,
        stable: false,
      },
      postgres: {
        caseCount: 0,
        decisionCounts: { reuse: 0, adapt: 0, free_generate: 0 },
        feedbackCounts: { helpful: 0, not_helpful: 0 },
        selectedTemplateIds: [],
        storedEventCount: 0,
        persistedEventCount: 0,
        stable: false,
      },
      diffs: [
        {
          field: 'dbHealth',
          memoryValue: 'ok',
          postgresValue: dbHealth,
        },
      ],
    };
  }

  const memoryRepository = new MemoryLogEventRepository();
  const memoryReport = await runApiFeedbackDatabaseExperiment({
    repository: memoryRepository,
  });

  const pool = createPostgresPool();

  try {
    await ensureTemplateRoutingLogSchema(pool);

    const postgresRepository = new VercelPostgresLogRepository(pool);
    await postgresRepository.clear();

    const postgresReport = await runApiFeedbackDatabaseExperiment({
      repository: postgresRepository,
    });

    const diffs = buildDiffs(memoryReport, postgresReport);

    return {
      ok: memoryReport.stable && postgresReport.stable && diffs.length === 0,
      runId: createRunId(),
      timestamp: new Date().toISOString(),
      dbHealth,
      memory: memoryReport,
      postgres: postgresReport,
      diffs,
    };
  } finally {
    await closePool(pool);
  }
}

async function main() {
  const report = await runReplayComparison();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
