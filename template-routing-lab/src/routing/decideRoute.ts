import type {
  RankedRetrievalResult,
  RouteReasonCode,
  RoutingEvaluation,
  RoutingThresholds,
  TemplateCandidate,
} from '../contracts/index.js';
import { DEFAULT_ROUTING_THRESHOLDS } from './thresholds.js';

function hasSignal(candidate: TemplateCandidate | null, signalType: string): boolean {
  if (!candidate) {
    return false;
  }

  return candidate.matchedSignals.some((signal) => signal.type === signalType);
}

function hasEditableParts(candidate: TemplateCandidate | null): boolean {
  if (!candidate) {
    return false;
  }

  return candidate.template.metadata.editableParts.length > 0;
}

function buildExplanation(reasonCodes: RouteReasonCode[]): string {
  if (reasonCodes.length === 0) {
    return 'No route reason was generated.';
  }

  return reasonCodes.join(', ');
}

export function decideRoute(
  retrieval: RankedRetrievalResult,
  thresholds: RoutingThresholds = DEFAULT_ROUTING_THRESHOLDS
): RoutingEvaluation {
  const topCandidate = retrieval.candidates[0] ?? null;
  const reasonCodes: RouteReasonCode[] = [];

  if (!topCandidate) {
    reasonCodes.push('no_candidate_template');
    return {
      mode: retrieval.mode,
      decision: 'free_generate',
      topCandidate: null,
      candidateTemplates: retrieval.candidates,
      reasonCodes,
      explanation: buildExplanation(reasonCodes),
      thresholds,
      retrieval,
    };
  }

  const hasConflict = hasSignal(topCandidate, 'negative_keyword_conflict') || hasSignal(topCandidate, 'category_conflict');

  if (hasConflict) {
    reasonCodes.push('conflicting_prompt_signals');
  }

  if (topCandidate.score >= thresholds.reuseMinScore && !hasConflict) {
    reasonCodes.push('high_confidence_template_match');

    if (retrieval.mode === 'morph' && hasSignal(topCandidate, 'rebuild_bonus')) {
      reasonCodes.push('rebuild_friendly_template');
    }

    return {
      mode: retrieval.mode,
      decision: 'reuse',
      topCandidate,
      candidateTemplates: retrieval.candidates,
      reasonCodes,
      explanation: buildExplanation(reasonCodes),
      thresholds,
      retrieval,
    };
  }

  if (topCandidate.score >= thresholds.adaptMinScore && hasEditableParts(topCandidate) && !hasConflict) {
    reasonCodes.push('editable_template_match');

    if (retrieval.mode === 'morph' && hasSignal(topCandidate, 'rebuild_bonus')) {
      reasonCodes.push('rebuild_friendly_template');
    }

    return {
      mode: retrieval.mode,
      decision: 'adapt',
      topCandidate,
      candidateTemplates: retrieval.candidates,
      reasonCodes,
      explanation: buildExplanation(reasonCodes),
      thresholds,
      retrieval,
    };
  }

  reasonCodes.push('low_confidence_match');

  return {
    mode: retrieval.mode,
    decision: 'free_generate',
    topCandidate,
    candidateTemplates: retrieval.candidates,
    reasonCodes,
    explanation: buildExplanation(reasonCodes),
    thresholds,
    retrieval,
  };
}
