//Changan.Liu
import type { RouteDecision, RoutingEvaluation } from './routing.js';
import type { TemplateBaseCategory, TemplateRegistryEntry, TemplateStatus } from './template.js';

export type PromotionDecision = 'active_ready' | 'needs_review' | 'blocked';

export interface PromotionScoreBreakdown {
  metadata: number;
  geometry: number;
  retrieval: number;
  route: number;
  compliance: number;
}

export interface PromotionPromptCheck {
  prompt: string;
  expectedTemplateId?: string;
  expectedDecision?: RouteDecision;
  routing: RoutingEvaluation;
  passed: boolean;
}

export interface PromotionGeometryEvidence {
  sourceRef: string;
  voxelCount?: number;
  minVoxelCount: number;
  maxVoxelCount: number;
  withinBudget: boolean;
}

export interface PromotionEvaluationInput {
  template: TemplateRegistryEntry;
  templates: TemplateRegistryEntry[];
  positivePrompts: string[];
  negativePrompts: string[];
  fromStatus?: TemplateStatus;
  toStatus?: TemplateStatus;
  geometryVoxelCount?: number;
}

export interface PromotionEvaluation {
  templateId: string;
  templateName: string;
  category: TemplateBaseCategory;
  fromStatus: TemplateStatus;
  toStatus: TemplateStatus;
  decision: PromotionDecision;
  totalScore: number;
  scoreBreakdown: PromotionScoreBreakdown;
  geometry: PromotionGeometryEvidence;
  positiveChecks: PromotionPromptCheck[];
  negativeChecks: PromotionPromptCheck[];
  passedChecks: string[];
  failedChecks: string[];
  createdAt: string;
}

export interface PromotionVisualizationReport {
  generatedAt: string;
  templateCount: number;
  activeReadyCount: number;
  needsReviewCount: number;
  blockedCount: number;
  averageScore: number;
  categoryCoverage: Record<string, number>;
  decisionCounts: Record<PromotionDecision, number>;
  scoreDistribution: Array<{
    templateId: string;
    score: number;
    decision: PromotionDecision;
    category: TemplateBaseCategory;
  }>;
  failureReasonCounts: Record<string, number>;
}
