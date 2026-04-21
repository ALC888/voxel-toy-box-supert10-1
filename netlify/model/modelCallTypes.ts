import type { GenerationOptions, ModelIntent } from '../../types';

const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  style: 'realistic',
  colorScheme: 'vibrant',
  size: 'medium',
  symmetry: 'none',
};

const BUDGET_BY_SIZE: Record<NonNullable<GenerationOptions['size']>, number> = {
  small: 120,
  medium: 200,
  large: 320,
};

const STYLE_RULES: Record<NonNullable<GenerationOptions['style']>, string> = {
  realistic:
    'Prefer believable proportions, recognizable silhouettes, restrained decoration, and stable structural choices.',
  cartoon:
    'Prefer exaggerated silhouette, cute readable proportions, simplified large features, and playful forms.',
  abstract:
    'Prefer stylized geometry, bold shape language, simplified symbolism, and artistic silhouette reduction.',
};

const COLOR_RULES: Record<NonNullable<GenerationOptions['colorScheme']>, string> = {
  vibrant: 'Use a saturated, high-contrast palette with 3 to 5 coordinated colors.',
  pastel: 'Use soft low-saturation colors with gentle contrast and a clean limited palette.',
  monochrome: 'Use one dominant hue with 1 to 2 close tonal variants.',
  nature:
    'Prefer earthy greens, browns, blues, stone, sand, and wood-like natural combinations.',
};

const SYMMETRY_RULES: Record<NonNullable<GenerationOptions['symmetry']>, string> = {
  none: 'Do not force symmetry unless it naturally improves readability.',
  bilateral: 'Prefer left-right symmetry for the main body and major silhouette.',
  radial: 'Prefer rotational balance around a central axis when the subject fits that structure.',
};

const normalizeGenerationOptions = (
  options?: GenerationOptions
): Required<GenerationOptions> => ({
  ...DEFAULT_OPTIONS,
  ...options,
});

const buildFallbackIntent = (
  prompt: string,
  options?: GenerationOptions
): ModelIntent => {
  const resolvedOptions = normalizeGenerationOptions(options);
  const voxelBudget = BUDGET_BY_SIZE[resolvedOptions.size];

  return {
    subject: prompt.trim(),
    style: resolvedOptions.style,
    colorScheme: resolvedOptions.colorScheme,
    size: resolvedOptions.size,
    symmetry: resolvedOptions.symmetry,
    voxelBudget,
    silhouetteKeywords: [
      'clear overall silhouette',
      'readable main body',
      'stable base footprint',
    ],
    structuralRules: [
      'All major parts must stay connected.',
      'Avoid isolated floating voxels.',
      'Keep the model centered around x=0 and z=0.',
      'Place the lowest supporting voxels at y=0 whenever possible.',
    ],
  };
};

export const getLLMMessageContent = (
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
) => {
  if (!options) {
    return `
${systemContext}

Task: Generate a 3D voxel art model of: "${prompt}".

Strict Rules:
1. Use approximately 150 to 200 voxels. MUST NOT exceed 250 voxels at the maximum.
2. The model must be centered at x=0, z=0.
3. The bottom of the model must be at y=0 or slightly higher.
4. Ensure the structure is physically plausible (connected).
5. Coordinates should be integers.

Return ONLY a JSON array of objects with x, y, z, and color properties.
`;
  }

  const intent = buildFallbackIntent(prompt, options);

  return `
${systemContext}

Task: Generate a 3D voxel art model from the following structured intent.

User Prompt:
"${prompt}"

Structured Intent:
${JSON.stringify(intent, null, 2)}

Generation Rules:
1. Target approximately ${intent.voxelBudget} voxels and do not exceed ${
    intent.voxelBudget + 40
  } voxels.
2. ${STYLE_RULES[intent.style]}
3. ${COLOR_RULES[intent.colorScheme]}
4. ${SYMMETRY_RULES[intent.symmetry]}
5. The model must be centered at x=0, z=0.
6. The bottom of the model must be at y=0 or slightly higher.
7. Ensure the structure is physically plausible and connected.
8. Coordinates must be integers.
9. Return ONLY a JSON array of objects with x, y, z, and color properties.
`;
};

export const getIntentPrompt = (
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
) => {
  const resolvedOptions = normalizeGenerationOptions(options);
  const suggestedBudget = BUDGET_BY_SIZE[resolvedOptions.size];

  return `
${systemContext}

Task: Read the user's request and convert it into a structured ModelIntent for 3D voxel generation.

User Prompt:
"${prompt}"

Advanced Controls:
${JSON.stringify(resolvedOptions, null, 2)}

Requirements:
1. Infer the main subject directly from the user prompt.
2. Keep style, colorScheme, size, and symmetry aligned with the advanced controls.
3. Set voxelBudget close to ${suggestedBudget} based on the selected size.
4. Provide 3 to 6 silhouetteKeywords that describe the main visible shape.
5. Provide 3 to 6 structuralRules that help a voxel model stay readable, centered, and connected.
6. Return ONLY valid JSON matching the ModelIntent structure.
`;
};

export const getVoxelPromptFromIntent = (
  systemContext: string,
  intent: ModelIntent
) => `
${systemContext}

Task: Generate a 3D voxel art model from the following ModelIntent.

ModelIntent:
${JSON.stringify(intent, null, 2)}

Generation Rules:
1. Target approximately ${intent.voxelBudget} voxels and do not exceed ${
  intent.voxelBudget + 40
} voxels.
2. ${STYLE_RULES[intent.style]}
3. ${COLOR_RULES[intent.colorScheme]}
4. ${SYMMETRY_RULES[intent.symmetry]}
5. The model must match the subject and silhouetteKeywords in the ModelIntent.
6. Follow the structuralRules in the ModelIntent.
7. The model must be centered at x=0, z=0.
8. The bottom of the model must be at y=0 or slightly higher.
9. Ensure the structure is physically plausible and connected.
10. Coordinates must be integers.
11. Return ONLY a JSON array of objects with x, y, z, and color properties.
`;

export const buildModelIntent = buildFallbackIntent;
