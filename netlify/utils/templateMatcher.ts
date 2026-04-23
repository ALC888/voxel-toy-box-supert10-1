import type { ModelIntent, TemplateMatchResult } from '../../types';

const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  Eagle: ['eagle', 'bird', 'hawk', 'falcon'],
  Cat: ['cat', 'kitten', 'feline'],
  Rabbit: ['rabbit', 'bunny', 'hare'],
  Twins: ['twin', 'double', 'pair', 'two characters'],
};

export function inferTemplateMatch(prompt: string, intent?: ModelIntent): TemplateMatchResult {
  const searchText = `${prompt} ${intent?.subject ?? ''} ${(intent?.silhouetteKeywords ?? []).join(' ')}`
    .toLowerCase()
    .trim();

  for (const [templateName, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    const hitCount = keywords.filter((keyword) => searchText.includes(keyword)).length;
    if (hitCount > 0) {
      const confidence = Math.min(0.96, 0.62 + hitCount * 0.12);
      return {
        matched: true,
        templateName,
        confidence,
        templateInfo: `Matched ${templateName} using prompt/intent keyword overlap.`,
      };
    }
  }

  return {
    matched: false,
    templateInfo: 'No preset template strongly matched the prompt.',
  };
}
