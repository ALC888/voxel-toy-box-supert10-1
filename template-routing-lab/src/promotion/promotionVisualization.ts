//Changan.Liu
import type {
  PromotionDecision,
  PromotionEvaluation,
  PromotionVisualizationReport,
} from '../contracts/index.js';

function createDecisionCounts(): Record<PromotionDecision, number> {
  return {
    active_ready: 0,
    needs_review: 0,
    blocked: 0,
  };
}

export function buildPromotionVisualizationReport(
  evaluations: PromotionEvaluation[]
): PromotionVisualizationReport {
  const decisionCounts = createDecisionCounts();
  const categoryCoverage: Record<string, number> = {};
  const failureReasonCounts: Record<string, number> = {};

  evaluations.forEach((evaluation) => {
    decisionCounts[evaluation.decision] += 1;
    categoryCoverage[evaluation.category] = (categoryCoverage[evaluation.category] ?? 0) + 1;

    evaluation.failedChecks.forEach((reason) => {
      const key = reason.split(':')[0] ?? reason;
      failureReasonCounts[key] = (failureReasonCounts[key] ?? 0) + 1;
    });
  });

  const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.totalScore, 0);

  return {
    generatedAt: new Date().toISOString(),
    templateCount: evaluations.length,
    activeReadyCount: decisionCounts.active_ready,
    needsReviewCount: decisionCounts.needs_review,
    blockedCount: decisionCounts.blocked,
    averageScore: evaluations.length === 0 ? 0 : Number((totalScore / evaluations.length).toFixed(2)),
    categoryCoverage,
    decisionCounts,
    scoreDistribution: evaluations.map((evaluation) => ({
      templateId: evaluation.templateId,
      score: evaluation.totalScore,
      decision: evaluation.decision,
      category: evaluation.category,
    })),
    failureReasonCounts,
  };
}
