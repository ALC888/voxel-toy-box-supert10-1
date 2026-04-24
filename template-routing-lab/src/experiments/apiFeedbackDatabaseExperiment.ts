import type {
  FeedbackSignal,
  LogEventRepository,
  PromptMode,
  RouteDecision,
  TemplateRoutingLogEvent,
} from '../contracts/index.js';
import { pathToFileURL } from 'node:url';
import { ACTIVE_TEMPLATE_REGISTRY } from '../templates/index.js';
import { queryTemplateRoute } from '../routing/index.js';
import { MemoryLogStorage } from '../logging/memoryLogStorage.js';
import { MemoryLogEventRepository } from '../logging/memoryLogEventRepository.js';
import { TemplateRoutingLogger } from '../logging/templateRoutingLogger.js';

export interface ApiFeedbackExperimentCase {
  label: string;
  prompt: string;
  mode: PromptMode;
  feedback?: FeedbackSignal;
}

export interface ApiFeedbackExperimentOptions {
  cases?: ApiFeedbackExperimentCase[];
  repository?: LogEventRepository;
}

export interface ApiFeedbackExperimentReport {
  caseCount: number;
  decisionCounts: Record<RouteDecision, number>;
  feedbackCounts: Record<FeedbackSignal, number>;
  selectedTemplateIds: string[];
  storedEventCount: number;
  persistedEventCount: number;
  stable: boolean;
}

export function createDefaultApiFeedbackExperimentCases(): ApiFeedbackExperimentCase[] {
  return [
    {
      label: 'dog-match',
      prompt: 'cute corgi dog with soft colors',
      mode: 'create',
      feedback: 'helpful',
    },
    {
      label: 'bus-match',
      prompt: 'yellow city bus for downtown transport',
      mode: 'create',
      feedback: 'helpful',
    },
    {
      label: 'free-generate-fallback',
      prompt: 'blue nebula cloud made of tiny stars',
      mode: 'create',
      feedback: 'not_helpful',
    },
  ];
}

function createEmptyDecisionCounts(): Record<RouteDecision, number> {
  return {
    reuse: 0,
    adapt: 0,
    free_generate: 0,
  };
}

function createEmptyFeedbackCounts(): Record<FeedbackSignal, number> {
  return {
    helpful: 0,
    not_helpful: 0,
  };
}

function isEventCollectionStable(
  storedEvents: TemplateRoutingLogEvent[],
  persistedEvents: TemplateRoutingLogEvent[]
) {
  if (storedEvents.length !== persistedEvents.length) {
    return false;
  }

  return storedEvents.every((event) =>
    persistedEvents.some(
      (persistedEvent) =>
        persistedEvent.eventType === event.eventType &&
        persistedEvent.createdAt === event.createdAt
    )
  );
}

export async function runApiFeedbackDatabaseExperiment(
  options: ApiFeedbackExperimentOptions = {}
): Promise<ApiFeedbackExperimentReport> {
  const repository = options.repository ?? new MemoryLogEventRepository();
  const storage = new MemoryLogStorage();
  const logger = new TemplateRoutingLogger(storage);
  const cases = options.cases ?? createDefaultApiFeedbackExperimentCases();

  const decisionCounts = createEmptyDecisionCounts();
  const feedbackCounts = createEmptyFeedbackCounts();
  const selectedTemplateIds: string[] = [];

  for (const testCase of cases) {
    const routing = queryTemplateRoute(
      {
        prompt: testCase.prompt,
        mode: testCase.mode,
      },
      ACTIVE_TEMPLATE_REGISTRY
    );

    logger.logRetrieval(routing.retrieval);
    logger.logRoute(routing);

    const feedback = testCase.feedback ?? (routing.decision === 'free_generate' ? 'not_helpful' : 'helpful');

    logger.logFeedback({
      promptMode: routing.mode,
      routeDecision: routing.decision,
      templateId: routing.topCandidate?.template.metadata.id ?? null,
      feedback,
    });

    decisionCounts[routing.decision] += 1;
    feedbackCounts[feedback] += 1;
    selectedTemplateIds.push(routing.topCandidate?.template.metadata.id ?? 'none');
  }

  const storedEvents = logger.listEvents();

  for (const event of storedEvents) {
    await repository.append(event);
  }

  const persistedEvents = await repository.list(storedEvents.length);

  return {
    caseCount: cases.length,
    decisionCounts,
    feedbackCounts,
    selectedTemplateIds,
    storedEventCount: storedEvents.length,
    persistedEventCount: persistedEvents.length,
    stable: isEventCollectionStable(storedEvents, persistedEvents),
  };
}

async function main() {
  const report = await runApiFeedbackDatabaseExperiment();
  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}