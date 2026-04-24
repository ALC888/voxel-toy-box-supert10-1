import type {
  PromptMode,
  PromptNormalizationResult,
  RetrievalResult,
  RetrievalSignal,
  TemplateCandidate,
  TemplateRegistryEntry,
} from '../contracts/index.js';

function hasPhraseMatch(normalizedPrompt: string, values: string[]): string[] {
  return values.filter((value) => normalizedPrompt.includes(value.toLowerCase()));
}

function isExactPhraseAlias(alias: string): boolean {
  return alias.trim().includes(' ');
}

function collectMatchedSignals(
  normalization: PromptNormalizationResult,
  template: TemplateRegistryEntry,
  mode: PromptMode
): RetrievalSignal[] {
  const signals: RetrievalSignal[] = [];
  const metadata = template.metadata;

  const aliasMatches = hasPhraseMatch(normalization.normalizedPrompt, metadata.promptAliases);
  aliasMatches.forEach((alias) => {
    signals.push({
      type: 'alias_match',
      value: alias,
      scoreImpact: 0,
      note: isExactPhraseAlias(alias)
        ? `exact phrase alias matched: ${alias}`
        : `alias matched: ${alias}`,
    });
  });

  metadata.tags
    .filter((tag) => normalization.tokens.includes(tag))
    .forEach((tag) => {
      signals.push({
        type: 'tag_match',
        value: tag,
        scoreImpact: 0,
        note: `tag matched: ${tag}`,
      });
    });

  metadata.styleTags
    .filter((tag) => normalization.styleTokens.includes(tag))
    .forEach((tag) => {
      signals.push({
        type: 'style_match',
        value: tag,
        scoreImpact: 0,
        note: `style matched: ${tag}`,
      });
    });

  metadata.shapeTags
    .filter((tag) => normalization.shapeTokens.includes(tag))
    .forEach((tag) => {
      signals.push({
        type: 'shape_match',
        value: tag,
        scoreImpact: 0,
        note: `shape matched: ${tag}`,
      });
    });

  if (normalization.inferredCategories.includes(metadata.baseCategory)) {
    signals.push({
      type: 'category_match',
      value: metadata.baseCategory,
      scoreImpact: 0,
      note: `category matched: ${metadata.baseCategory}`,
    });
  } else if (normalization.inferredCategories.length > 0) {
    signals.push({
      type: 'category_conflict',
      value: metadata.baseCategory,
      scoreImpact: 0,
      note: `category conflict: expected ${normalization.inferredCategories.join(',')}, template is ${metadata.baseCategory}`,
    });
  }

  if (
    normalization.requestedComplexity &&
    normalization.requestedComplexity === metadata.complexity
  ) {
    signals.push({
      type: 'complexity_match',
      value: metadata.complexity,
      scoreImpact: 0,
      note: `complexity matched: ${metadata.complexity}`,
    });
  }

  const negativeMatches = hasPhraseMatch(normalization.normalizedPrompt, metadata.negativeKeywords);
  negativeMatches.forEach((keyword) => {
    signals.push({
      type: 'negative_keyword_conflict',
      value: keyword,
      scoreImpact: 0,
      note: `negative keyword matched: ${keyword}`,
    });
  });

  if (mode === 'morph' && metadata.rebuildSuitability !== 'none') {
    signals.push({
      type: 'rebuild_bonus',
      value: metadata.rebuildSuitability,
      scoreImpact: 0,
      note: `rebuild suitability: ${metadata.rebuildSuitability}`,
    });
  }

  return signals;
}

function shouldRecallCandidate(signals: RetrievalSignal[]): boolean {
  const positiveSignalCount = signals.filter(
    (signal) =>
      signal.type !== 'negative_keyword_conflict' &&
      signal.type !== 'category_conflict'
  ).length;

  return positiveSignalCount > 0;
}

export function recallTemplates(
  normalization: PromptNormalizationResult,
  templates: TemplateRegistryEntry[],
  mode: PromptMode
): RetrievalResult {
  const candidates: TemplateCandidate[] = templates
    .map((template) => ({
      template,
      score: 0,
      matchedSignals: collectMatchedSignals(normalization, template, mode),
    }))
    .filter((candidate) => shouldRecallCandidate(candidate.matchedSignals));

  normalization.negativeTokens = Array.from(
    new Set(
      candidates.flatMap((candidate) =>
        candidate.matchedSignals
          .filter((signal) => signal.type === 'negative_keyword_conflict')
          .map((signal) => signal.value)
      )
    )
  );

  return {
    mode,
    normalization,
    candidates,
  };
}
