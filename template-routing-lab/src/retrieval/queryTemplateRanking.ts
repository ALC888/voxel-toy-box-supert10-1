import type {
  RankedRetrievalResult,
  RetrievalQuery,
  RetrievalScoringWeights,
  TemplateRegistryEntry,
} from '../contracts/index.js';
import { queryTemplateRecall } from './queryTemplateRecall.js';
import {
  DEFAULT_RETRIEVAL_SCORING_WEIGHTS,
  scoreAndRankCandidates,
} from './scoring.js';

export function queryTemplateRanking(
  query: RetrievalQuery,
  templates: TemplateRegistryEntry[],
  weights: RetrievalScoringWeights = DEFAULT_RETRIEVAL_SCORING_WEIGHTS
): RankedRetrievalResult {
  const retrievalResult = queryTemplateRecall(query, templates);
  return scoreAndRankCandidates(retrievalResult, weights);
}
