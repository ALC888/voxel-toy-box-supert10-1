import type { TemplateBaseCategory, TemplateComplexity } from '@/contracts';

export const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'with',
  'and',
  'or',
  'to',
  'of',
  'make',
  'build',
  'create',
  'generate',
  'turn',
  'into',
]);

export const TOKEN_ALIASES: Record<string, string> = {
  birds: 'bird',
  eagles: 'eagle',
  hawks: 'hawk',
  raptors: 'raptor',
  kitties: 'kitty',
  kittens: 'kitten',
  felines: 'feline',
  bunnies: 'bunny',
  rabbits: 'rabbit',
  hares: 'hare',
  twins: 'twins',
  paired: 'pair',
  duo: 'pair',
};

export const STYLE_KEYWORDS = new Set([
  'cute',
  'stylized',
  'decorative',
  'storybook',
  'soft',
  'scenic',
  'compact',
]);

export const SHAPE_KEYWORDS = new Set([
  'winged',
  'round',
  'seated',
  'sitting',
  'tall',
  'vertical',
  'paired',
  'double',
  'two',
  'long',
  'long_eared',
  'front',
  'front_facing',
  'perched',
]);

export const CATEGORY_KEYWORDS: Record<TemplateBaseCategory, string[]> = {
  animal: ['animal', 'bird', 'eagle', 'hawk', 'raptor', 'cat', 'kitty', 'kitten', 'feline', 'rabbit', 'bunny', 'hare'],
  vehicle: ['car', 'truck', 'bus', 'vehicle', 'airplane'],
  building: ['castle', 'house', 'building', 'tower'],
  character: ['character', 'person', 'human'],
  object: ['object', 'toy'],
  scene: ['scene', 'landscape'],
};

export const COMPLEXITY_KEYWORDS: Record<TemplateComplexity, string[]> = {
  low: ['simple', 'minimal', 'small'],
  medium: ['medium', 'balanced'],
  high: ['detailed', 'complex', 'large'],
};
