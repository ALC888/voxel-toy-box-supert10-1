import type {
  RankedRetrievalResult,
  RetrievalResult,
  RetrievalScoringWeights,
  RetrievalSignal,
  TemplateCandidate,
} from '../contracts/index.js';

export const DEFAULT_RETRIEVAL_SCORING_WEIGHTS: RetrievalScoringWeights = {
  aliasMatch: 40,
  exactPhraseAliasMatch: 70,
  tagMatch: 24,
  styleMatch: 16,
  shapeMatch: 16,
  categoryMatch: 18,
  categoryConflict: -70,
  complexityMatch: 10,
  rebuildBonusLow: 6,
  rebuildBonusMedium: 12,
  rebuildBonusHigh: 18,
  negativeKeywordConflict: -90,
  templatePriorityMultiplier: 0.1,
};

function getSignalScoreImpact(
  signal: RetrievalSignal,
  weights: RetrievalScoringWeights
): number {
  switch (signal.type) {
    case 'alias_match':
      return signal.note.startsWith('exact phrase alias matched')
        ? weights.exactPhraseAliasMatch
        : weights.aliasMatch;
    case 'tag_match':
      return weights.tagMatch;
    case 'style_match':
      return weights.styleMatch;
    case 'shape_match':
      return weights.shapeMatch;
    case 'category_match':
      return weights.categoryMatch;
    case 'category_conflict':
      return weights.categoryConflict;
    case 'complexity_match':
      return weights.complexityMatch;
    case 'rebuild_bonus':
      if (signal.value === 'high') return weights.rebuildBonusHigh;
      if (signal.value === 'medium') return weights.rebuildBonusMedium;
      if (signal.value === 'low') return weights.rebuildBonusLow;
      return 0;
    case 'negative_keyword_conflict':
      return weights.negativeKeywordConflict;
    default:
      return 0;
  }
}

function scoreCandidate(
  candidate: TemplateCandidate,
  weights: RetrievalScoringWeights
): TemplateCandidate {
  const rescoredSignals = candidate.matchedSignals.map((signal) => ({
    ...signal,
    scoreImpact: getSignalScoreImpact(signal, weights),
  }));

  const signalScore = rescoredSignals.reduce((sum, signal) => sum + signal.scoreImpact, 0);
  const priorityScore = candidate.template.metadata.priority * weights.templatePriorityMultiplier;

  return {
    ...candidate,
    score: signalScore + priorityScore,
    matchedSignals: rescoredSignals,
  };
}

function compareCandidates(a: TemplateCandidate, b: TemplateCandidate): number {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  if (b.template.metadata.priority !== a.template.metadata.priority) {
    return b.template.metadata.priority - a.template.metadata.priority;
  }

  return a.template.metadata.id.localeCompare(b.template.metadata.id);
}

export function scoreAndRankCandidates(
  retrievalResult: RetrievalResult,
  weights: RetrievalScoringWeights = DEFAULT_RETRIEVAL_SCORING_WEIGHTS
): RankedRetrievalResult {
  const candidates = retrievalResult.candidates
    .map((candidate) => scoreCandidate(candidate, weights))
    .sort(compareCandidates);

  return {
    ...retrievalResult,
    scoringWeights: weights,
    candidates,
  };
}
