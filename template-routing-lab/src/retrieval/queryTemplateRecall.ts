import type { RetrievalQuery, RetrievalResult, TemplateRegistryEntry } from '../contracts/index.js';
import { normalizeQuery } from './normalizeQuery.js';
import { recallTemplates } from './recallTemplates.js';

export function queryTemplateRecall(
  query: RetrievalQuery,
  templates: TemplateRegistryEntry[]
): RetrievalResult {
  const normalization = normalizeQuery(query.prompt);
  return recallTemplates(normalization, templates, query.mode);
}
