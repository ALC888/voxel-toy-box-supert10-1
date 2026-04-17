import type { TemplateRegistryEntry, TemplateSummary } from '../contracts/index.js';
import { SEED_TEMPLATE_REGISTRY } from './seedTemplates.js';

export const TEMPLATE_REGISTRY: TemplateRegistryEntry[] = [...SEED_TEMPLATE_REGISTRY];

export const ACTIVE_TEMPLATE_REGISTRY: TemplateRegistryEntry[] = TEMPLATE_REGISTRY.filter(
  (entry) => entry.metadata.status === 'active'
);

export function getTemplateById(templateId: string): TemplateRegistryEntry | undefined {
  return TEMPLATE_REGISTRY.find((entry) => entry.metadata.id === templateId);
}

export function listActiveTemplateSummaries(): TemplateSummary[] {
  return ACTIVE_TEMPLATE_REGISTRY.map((entry) => ({
    id: entry.metadata.id,
    name: entry.metadata.name,
    baseCategory: entry.metadata.baseCategory,
    tags: entry.metadata.tags,
    promptAliases: entry.metadata.promptAliases,
    rebuildSuitability: entry.metadata.rebuildSuitability,
  }));
}

export function listTemplatesByCategory(category: TemplateRegistryEntry['metadata']['baseCategory']): TemplateRegistryEntry[] {
  return ACTIVE_TEMPLATE_REGISTRY.filter((entry) => entry.metadata.baseCategory === category);
}
