import type {
  PromptNormalizationResult,
  TemplateBaseCategory,
  TemplateComplexity,
} from '../contracts/index.js';
import {
  CATEGORY_KEYWORDS,
  COMPLEXITY_KEYWORDS,
  SHAPE_KEYWORDS,
  STOP_WORDS,
  STYLE_KEYWORDS,
  TOKEN_ALIASES,
} from './constants.js';

function sanitizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(normalizedPrompt: string): string[] {
  if (!normalizedPrompt) {
    return [];
  }

  return normalizedPrompt
    .split(' ')
    .map((token) => TOKEN_ALIASES[token] ?? token)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

function inferCategories(tokens: string[]): TemplateBaseCategory[] {
  const categories = new Set<TemplateBaseCategory>();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<
    [TemplateBaseCategory, string[]]
  >) {
    if (keywords.some((keyword) => tokens.includes(keyword))) {
      categories.add(category);
    }
  }

  return Array.from(categories);
}

function inferComplexity(tokens: string[]): TemplateComplexity | undefined {
  for (const [complexity, keywords] of Object.entries(COMPLEXITY_KEYWORDS) as Array<
    [TemplateComplexity, string[]]
  >) {
    if (keywords.some((keyword) => tokens.includes(keyword))) {
      return complexity;
    }
  }

  return undefined;
}

export function normalizeQuery(prompt: string): PromptNormalizationResult {
  const normalizedPrompt = sanitizePrompt(prompt);
  const tokens = tokenize(normalizedPrompt);

  return {
    rawPrompt: prompt,
    normalizedPrompt,
    tokens,
    aliases: tokens.filter((token, index) => tokens.indexOf(token) === index),
    styleTokens: tokens.filter((token) => STYLE_KEYWORDS.has(token)),
    shapeTokens: tokens.filter((token) => SHAPE_KEYWORDS.has(token)),
    negativeTokens: [],
    inferredCategories: inferCategories(tokens),
    requestedComplexity: inferComplexity(tokens),
  };
}
