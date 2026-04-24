import type {
  RetrievalQuery,
  RetrievalScoringWeights,
  RoutingEvaluation,
  RoutingThresholds,
  TemplateRegistryEntry,
} from '../contracts/index.js';
import { queryTemplateRanking } from '../retrieval/index.js';
import { decideRoute } from './decideRoute.js';

export function queryTemplateRoute(
  query: RetrievalQuery,
  templates: TemplateRegistryEntry[],
  routingThresholds?: RoutingThresholds,
  scoringWeights?: RetrievalScoringWeights
): RoutingEvaluation {
  const ranked = queryTemplateRanking(query, templates, scoringWeights);
  return decideRoute(ranked, routingThresholds);
}
