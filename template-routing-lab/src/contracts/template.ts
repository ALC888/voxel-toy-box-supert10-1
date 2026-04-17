export type TemplateSourceType = 'generator' | 'static_voxel' | 'variant_seed';

export type TemplateBaseCategory =
  | 'animal'
  | 'vehicle'
  | 'building'
  | 'character'
  | 'object'
  | 'scene';

export type TemplateComplexity = 'low' | 'medium' | 'high';

export type TemplateSymmetry = 'none' | 'soft' | 'strong';

export type TemplateStatus = 'active' | 'candidate' | 'deprecated';

export type RebuildSuitability = 'none' | 'low' | 'medium' | 'high';

export interface VoxelBudgetRange {
  min: number;
  max: number;
}

export interface TemplateSourceRef {
  type: TemplateSourceType;
  ref: string;
  variantOfTemplateId?: string;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  sourceType: TemplateSourceType;
  baseCategory: TemplateBaseCategory;
  subCategory: string;
  tags: string[];
  styleTags: string[];
  shapeTags: string[];
  colorTags: string[];
  complexity: TemplateComplexity;
  voxelBudgetRange: VoxelBudgetRange;
  symmetry: TemplateSymmetry;
  editableParts: string[];
  promptAliases: string[];
  negativeKeywords: string[];
  rebuildSuitability: RebuildSuitability;
  priority: number;
  status: TemplateStatus;
}

export interface TemplateRegistryEntry {
  metadata: TemplateMetadata;
  source: TemplateSourceRef;
}

export interface TemplateSummary {
  id: string;
  name: string;
  baseCategory: TemplateBaseCategory;
  tags: string[];
  promptAliases: string[];
  rebuildSuitability: RebuildSuitability;
}
