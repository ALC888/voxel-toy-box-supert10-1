import type { GenerationOptions, ModelIntent } from '../../../types';

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
  options: GenerationOptions | undefined
): Required<GenerationOptions> => ({
  style: options?.style ?? DEFAULT_OPTIONS.style,
  colorScheme: options?.colorScheme ?? DEFAULT_OPTIONS.colorScheme,
  size: options?.size ?? DEFAULT_OPTIONS.size,
  symmetry: options?.symmetry ?? DEFAULT_OPTIONS.symmetry,
});

const buildFallbackIntent = (
  prompt: string,
  options?: GenerationOptions
): ModelIntent => {
  const resolvedOptions = normalizeGenerationOptions(options);
  const voxelBudget = BUDGET_BY_SIZE[resolvedOptions.size];

  return {
    subject: prompt.trim() || 'voxel sculpture',
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

Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}
`;
  }

  const intent = buildFallbackIntent(prompt, options);

  return `
${systemContext}

Task: Generate a 3D voxel art model from the following structured intent.

Structured Intent:
${JSON.stringify(intent, null, 2)}

Generation Rules:
1. Target approximately ${intent.voxelBudget} voxels and do not exceed ${
    intent.voxelBudget + 40
  } voxels.
2. ${STYLE_RULES[intent.style]}
3. ${COLOR_RULES[intent.colorScheme]}
4. ${SYMMETRY_RULES[intent.symmetry]}
5. Keep the model centered around x=0 and z=0.
6. Keep the bottom of the model at y=0 or slightly above.
7. Maintain one connected structure.
8. Prefer readable silhouette over internal detail.
9. Coordinates must be integers.
10. Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
    {
      "voxels": [
        { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
      ]
    }
`;
};

export const getIntentPrompt = (
  systemContext: string,
  prompt: string,
  options: GenerationOptions
) => {
  const resolvedOptions = normalizeGenerationOptions(options);

  return `
${systemContext}

Task: Extract a structured ModelIntent for a voxel art model.

User prompt:
${prompt}

Advanced options:
${JSON.stringify(resolvedOptions, null, 2)}

Requirements:
1. Subject should be a short, concrete noun phrase.
2. Style must be one of realistic, cartoon, or abstract.
3. Color scheme must match the user's direction.
4. Size must map to a voxel budget.
5. Symmetry must reflect the prompt and options.
6. Silhouette keywords should be short visual descriptors.
7. Structural rules must emphasize connectivity and legibility.

Return ONLY a JSON object with subject, style, colorScheme, size, symmetry, voxelBudget, silhouetteKeywords, and structuralRules.
`;
};

export const getVoxelPromptFromIntent = (
  systemContext: string,
  intent: ModelIntent
) => `
${systemContext}

Task: Generate voxel coordinates from the provided ModelIntent.

ModelIntent:
${JSON.stringify(intent, null, 2)}

Generation Rules:
1. Target approximately ${intent.voxelBudget} voxels and do not exceed ${
  intent.voxelBudget + 40
} voxels.
2. ${STYLE_RULES[intent.style]}
3. ${COLOR_RULES[intent.colorScheme]}
4. ${SYMMETRY_RULES[intent.symmetry]}
5. Keep the model centered around x=0 and z=0.
6. Keep the lowest supporting voxels at y=0.
7. Maintain one connected structure.
8. Favor readable silhouette over internal detail.
9. Coordinates must be integers.
10. Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
    {
      "voxels": [
        { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
      ]
    }
`;

export const buildModelIntent = buildFallbackIntent;