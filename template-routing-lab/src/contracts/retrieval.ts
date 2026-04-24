import type {
  TemplateBaseCategory,
  TemplateComplexity,
  TemplateRegistryEntry,
} from './template.js';

export type PromptMode = 'create' | 'morph';

export interface PromptNormalizationResult {
  rawPrompt: string;
  normalizedPrompt: string;
  tokens: string[];
  aliases: string[];
  styleTokens: string[];
  shapeTokens: string[];
  negativeTokens: string[];
  inferredCategories: TemplateBaseCategory[];
  requestedComplexity?: TemplateComplexity;
}

export type RetrievalSignalType =
  | 'alias_match'
  | 'tag_match'
  | 'style_match'
  | 'shape_match'
  | 'category_match'
  | 'category_conflict'
  | 'complexity_match'
  | 'rebuild_bonus'
  | 'negative_keyword_conflict';

export interface RetrievalSignal {
  type: RetrievalSignalType;
  value: string;
  scoreImpact: number;
  note: string;
}

export interface TemplateCandidate {
  template: TemplateRegistryEntry;
  score: number;
  matchedSignals: RetrievalSignal[];
}

export interface RetrievalScoringWeights {
  aliasMatch: number;
  exactPhraseAliasMatch: number;
  tagMatch: number;
  styleMatch: number;
  shapeMatch: number;
  categoryMatch: number;
  categoryConflict: number;
  complexityMatch: number;
  rebuildBonusLow: number;
  rebuildBonusMedium: number;
  rebuildBonusHigh: number;
  negativeKeywordConflict: number;
  templatePriorityMultiplier: number;
}

export interface RetrievalResult {
  mode: PromptMode;
  normalization: PromptNormalizationResult;
  candidates: TemplateCandidate[];
}

export interface RankedRetrievalResult extends RetrievalResult {
  scoringWeights: RetrievalScoringWeights;
}

export interface RetrievalQuery {
  prompt: string;
  mode: PromptMode;
}
