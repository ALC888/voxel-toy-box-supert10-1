import type { PromptMode, RankedRetrievalResult, TemplateCandidate } from './retrieval.js';

export type RouteDecision = 'reuse' | 'adapt' | 'free_generate';

export type RouteReasonCode =
  | 'high_confidence_template_match'
  | 'editable_template_match'
  | 'rebuild_friendly_template'
  | 'low_confidence_match'
  | 'no_candidate_template'
  | 'conflicting_prompt_signals';

export interface RoutingThresholds {
  reuseMinScore: number;
  adaptMinScore: number;
}

export interface RoutingResult {
  mode: PromptMode;
  decision: RouteDecision;
  topCandidate: TemplateCandidate | null;
  candidateTemplates: TemplateCandidate[];
  reasonCodes: RouteReasonCode[];
  explanation: string;
}

export interface RoutingEvaluation extends RoutingResult {
  thresholds: RoutingThresholds;
  retrieval: RankedRetrievalResult;
}
