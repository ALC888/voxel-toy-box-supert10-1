//Changan.Liu
import type {
  PromotionDecision,
  PromotionEvaluation,
  PromotionEvaluationInput,
  PromotionGeometryEvidence,
  PromotionPromptCheck,
  PromotionScoreBreakdown,
  TemplateMetadata,
  TemplateRegistryEntry,
} from '../contracts/index.js';
import { queryTemplateRoute } from '../routing/index.js';

const ACTIVE_READY_THRESHOLD = 85;
const NEEDS_REVIEW_THRESHOLD = 70;

const REQUIRED_ARRAY_FIELDS: Array<keyof Pick<
  TemplateMetadata,
  | 'tags'
  | 'styleTags'
  | 'shapeTags'
  | 'colorTags'
  | 'editableParts'
  | 'promptAliases'
  | 'negativeKeywords'
>> = [
  'tags',
  'styleTags',
  'shapeTags',
  'colorTags',
  'editableParts',
  'promptAliases',
  'negativeKeywords',
];

function scoreArrayField(values: string[], maxScore: number): number {
  if (values.length >= 3) return maxScore;
  if (values.length === 2) return Math.floor(maxScore * 0.75);
  if (values.length === 1) return Math.floor(maxScore * 0.5);
  return 0;
}

function scoreMetadata(metadata: TemplateMetadata, failedChecks: string[]): number {
  let score = 0;

  REQUIRED_ARRAY_FIELDS.forEach((field) => {
    const value = metadata[field];
    const fieldScore = scoreArrayField(value, 2);
    score += fieldScore;
    if (fieldScore < 2) {
      failedChecks.push(`metadata.${field}.incomplete`);
    }
  });

  if (metadata.description && metadata.description.trim().length >= 60) {
    score += 3;
  } else {
    failedChecks.push('metadata.description.missing_or_short');
  }

  if (metadata.voxelBudgetRange.min > 0 && metadata.voxelBudgetRange.max > metadata.voxelBudgetRange.min) {
    score += 3;
  } else {
    failedChecks.push('metadata.voxelBudgetRange.invalid');
  }

  return Math.min(20, score);
}

function buildGeometryEvidence(input: PromotionEvaluationInput): PromotionGeometryEvidence {
  const { template, geometryVoxelCount } = input;
  const { min, max } = template.metadata.voxelBudgetRange;

  return {
    sourceRef: template.source.ref,
    voxelCount: geometryVoxelCount,
    minVoxelCount: min,
    maxVoxelCount: max,
    withinBudget:
      typeof geometryVoxelCount === 'number'
        ? geometryVoxelCount >= min && geometryVoxelCount <= max
        : template.metadata.sourceType === 'generator' || template.metadata.sourceType === 'static_voxel',
  };
}

function scoreGeometry(
  template: TemplateRegistryEntry,
  geometry: PromotionGeometryEvidence,
  failedChecks: string[]
): number {
  let score = 0;

  if (template.metadata.sourceType === 'generator' || template.metadata.sourceType === 'static_voxel') {
    score += 12;
  } else {
    failedChecks.push('geometry.source.not_promotable');
  }

  if (template.source.ref.includes('#')) {
    score += 5;
  } else {
    failedChecks.push('geometry.source.missing_symbol');
  }

  if (geometry.withinBudget) {
    score += 8;
  } else {
    failedChecks.push('geometry.voxel_budget.out_of_range');
  }

  return Math.min(25, score);
}

function buildPositiveChecks(input: PromotionEvaluationInput): PromotionPromptCheck[] {
  return input.positivePrompts.map((prompt) => {
    const routing = queryTemplateRoute({ prompt, mode: 'create' }, input.templates);
    const passed = routing.topCandidate?.template.metadata.id === input.template.metadata.id;

    return {
      prompt,
      expectedTemplateId: input.template.metadata.id,
      expectedDecision: 'reuse',
      routing,
      passed,
    };
  });
}

function buildNegativeChecks(input: PromotionEvaluationInput): PromotionPromptCheck[] {
  return input.negativePrompts.map((prompt) => {
    const routing = queryTemplateRoute({ prompt, mode: 'create' }, input.templates);
    const passed = routing.topCandidate?.template.metadata.id !== input.template.metadata.id;

    return {
      prompt,
      expectedTemplateId: input.template.metadata.id,
      routing,
      passed,
    };
  });
}

function scorePromptChecks(
  checks: PromotionPromptCheck[],
  maxScore: number,
  failedPrefix: string,
  failedChecks: string[]
): number {
  if (checks.length === 0) {
    failedChecks.push(`${failedPrefix}.missing`);
    return 0;
  }

  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * maxScore);

  checks
    .filter((check) => !check.passed)
    .forEach((check) => failedChecks.push(`${failedPrefix}.failed:${check.prompt}`));

  return score;
}

function scoreRouteChecks(checks: PromotionPromptCheck[], failedChecks: string[]): number {
  if (checks.length === 0) {
    failedChecks.push('route.positive_prompts.missing');
    return 0;
  }

  const stableCount = checks.filter(
    (check) =>
      check.passed &&
      (check.routing.decision === 'reuse' || check.routing.decision === 'adapt')
  ).length;

  checks
    .filter((check) => check.routing.decision === 'free_generate')
    .forEach((check) => failedChecks.push(`route.free_generate:${check.prompt}`));

  return Math.round((stableCount / checks.length) * 20);
}

function scoreCompliance(template: TemplateRegistryEntry, failedChecks: string[]): number {
  const sourceText = `${template.source.ref} ${template.metadata.description ?? ''}`.toLowerCase();
  let score = 0;

  if (!sourceText.includes('noai') && !sourceText.includes('blocked') && !sourceText.includes('non-compliant')) {
    score += 8;
  } else {
    failedChecks.push('compliance.source.blocked');
  }

  if (template.metadata.description && template.metadata.description.trim().length >= 60) {
    score += 4;
  } else {
    failedChecks.push('compliance.documentation.missing');
  }

  if (template.metadata.rebuildSuitability !== 'none') {
    score += 3;
  } else {
    failedChecks.push('compliance.rebuildSuitability.none');
  }

  return Math.min(15, score);
}

function decidePromotion(score: number, failedChecks: string[]): PromotionDecision {
  const hasHardFailure = failedChecks.some((check) =>
    [
      'geometry.source.not_promotable',
      'geometry.voxel_budget.out_of_range',
      'compliance.source.blocked',
    ].some((prefix) => check.startsWith(prefix))
  );

  if (hasHardFailure) return 'blocked';
  if (score >= ACTIVE_READY_THRESHOLD) return 'active_ready';
  if (score >= NEEDS_REVIEW_THRESHOLD) return 'needs_review';
  return 'blocked';
}

function buildPassedChecks(breakdown: PromotionScoreBreakdown): string[] {
  const passedChecks: string[] = [];
  if (breakdown.metadata === 20) passedChecks.push('metadata.complete');
  if (breakdown.geometry >= 20) passedChecks.push('geometry.ready');
  if (breakdown.retrieval >= 16) passedChecks.push('retrieval.fit');
  if (breakdown.route >= 16) passedChecks.push('route.stable');
  if (breakdown.compliance >= 12) passedChecks.push('compliance.ready');
  return passedChecks;
}

export function evaluateTemplatePromotion(input: PromotionEvaluationInput): PromotionEvaluation {
  const failedChecks: string[] = [];
  const positiveChecks = buildPositiveChecks(input);
  const negativeChecks = buildNegativeChecks(input);
  const geometry = buildGeometryEvidence(input);

  const retrievalScore =
    Math.round(scorePromptChecks(positiveChecks, 14, 'retrieval.positive', failedChecks)) +
    Math.round(scorePromptChecks(negativeChecks, 6, 'retrieval.negative', failedChecks));

  const scoreBreakdown: PromotionScoreBreakdown = {
    metadata: scoreMetadata(input.template.metadata, failedChecks),
    geometry: scoreGeometry(input.template, geometry, failedChecks),
    retrieval: Math.min(20, retrievalScore),
    route: scoreRouteChecks(positiveChecks, failedChecks),
    compliance: scoreCompliance(input.template, failedChecks),
  };

  const totalScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);

  return {
    templateId: input.template.metadata.id,
    templateName: input.template.metadata.name,
    category: input.template.metadata.baseCategory,
    fromStatus: input.fromStatus ?? input.template.metadata.status,
    toStatus: input.toStatus ?? input.template.metadata.status,
    decision: decidePromotion(totalScore, failedChecks),
    totalScore,
    scoreBreakdown,
    geometry,
    positiveChecks,
    negativeChecks,
    passedChecks: buildPassedChecks(scoreBreakdown),
    failedChecks,
    createdAt: new Date().toISOString(),
  };
}
