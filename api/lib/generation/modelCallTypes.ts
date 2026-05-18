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

function formatConstraintBlock(constraintText: string | undefined): string {
  if (!constraintText) return '';
  return `

============================================
HARD CONSTRAINTS — YOU MUST FOLLOW THESE:
============================================
${constraintText}

============================================
`;
}

export const getLLMMessageContent = (
  systemContext: string,
  prompt: string,
  options?: GenerationOptions,
  constraintText?: string
) => {
  const constraintBlock = formatConstraintBlock(constraintText);

  if (!options) {
    return `
${systemContext}

Task: Generate a 3D voxel art model of: "${prompt}".

HARD RULES (MUST follow — models that violate these will be REJECTED):
1. You MUST produce between 80 and 200 voxels. Less than 80 voxels is a FAILURE.
2. You MUST NOT produce fewer than 80 voxels under ANY circumstance.
3. The model MUST be centered at x=0, z=0.
4. The bottom of the model MUST be at y=0 (touching the ground).
5. The structure MUST be one connected piece — every voxel must connect to the main body.
6. Coordinates MUST be integers. Do NOT use floats.
7. The model MUST be 3D — at least 2 blocks thick in every dimension.
8. The model MUST have a recognizable silhouette for the subject.
${constraintBlock}

WHAT NOT TO DO (these are FAILURES):
- DO NOT produce a flat single-layer plate (all voxels at same y).
- DO NOT produce fewer than 80 voxels — sparse models are rejected.
- DO NOT produce disconnected floating voxels.
- DO NOT produce an unrecognizable blob.

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

HARD RULES (MUST follow — models that violate these will be REJECTED):
1. You MUST target exactly ${intent.voxelBudget} voxels. The absolute minimum is ${Math.max(60, intent.voxelBudget - 40)} voxels.
2. You MUST NOT exceed ${intent.voxelBudget + 40} voxels.
3. ${STYLE_RULES[intent.style]}
4. ${COLOR_RULES[intent.colorScheme]}
5. ${SYMMETRY_RULES[intent.symmetry]}
6. The model MUST be centered around x=0 and z=0.
7. The bottom of the model MUST be at y=0 (touching the ground).
8. The structure MUST be one connected piece.
9. The model MUST have a clear, recognizable silhouette.
10. The model MUST be 3D — at least 2 blocks thick in every dimension.
11. Coordinates MUST be integers.
${constraintBlock}

WHAT NOT TO DO (these are FAILURES):
- DO NOT produce a flat single-layer plate.
- DO NOT produce fewer than ${Math.max(60, intent.voxelBudget - 40)} voxels.
- DO NOT produce disconnected parts.

Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
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
  options: GenerationOptions,
  constraintText?: string
) => {
  const resolvedOptions = normalizeGenerationOptions(options);
  const constraintBlock = formatConstraintBlock(constraintText);

  return `
${systemContext}

Task: Extract a structured ModelIntent for a voxel art model.

User prompt:
${prompt}

Advanced options:
${JSON.stringify(resolvedOptions, null, 2)}
${constraintBlock}

Requirements:
1. Subject should be a short, concrete noun phrase.
2. Style must be one of realistic, cartoon, or abstract.
3. Color scheme must match the user's direction.
4. Size must map to a voxel budget: small=120, medium=200, large=320.
5. Symmetry must reflect the prompt and options.
6. Silhouette keywords should be short visual descriptors that capture the key recognizable features.
7. structuralRules MUST include ALL hard constraint anatomy rules from the HARD CONSTRAINTS section above, plus "All major parts must stay connected", "Avoid isolated floating voxels", "Keep the model centered around x=0 and z=0", "Place the lowest supporting voxels at y=0".

Return ONLY a JSON object with subject, style, colorScheme, size, symmetry, voxelBudget, silhouetteKeywords, and structuralRules.
`;
};

export const getVoxelPromptFromIntent = (
  systemContext: string,
  intent: ModelIntent,
  constraintText?: string
) => {
  const constraintBlock = formatConstraintBlock(constraintText);

  return `
${systemContext}

Task: Generate voxel coordinates from the provided ModelIntent.

ModelIntent:
${JSON.stringify(intent, null, 2)}
${constraintBlock}

HARD RULES (MUST follow — models that violate these will be REJECTED):
1. You MUST produce at least ${Math.max(60, intent.voxelBudget - 40)} voxels. This is a HARD MINIMUM.
2. You MUST target ${intent.voxelBudget} voxels and NEVER exceed ${intent.voxelBudget + 40} voxels.
3. ${STYLE_RULES[intent.style]}
4. ${COLOR_RULES[intent.colorScheme]}
5. ${SYMMETRY_RULES[intent.symmetry]}
6. The model MUST be centered around x=0 and z=0.
7. The lowest supporting voxels MUST be at y=0 (ground level).
8. Maintain ONE connected structure — every voxel must be reachable from every other.
9. The model MUST be 3D — at least 2 blocks thick in every dimension.
10. Coordinates MUST be integers.

${intent.structuralRules.map((rule: string, i: number) => `${i + 11}. ${rule}`).join('\n')}

WHAT NOT TO DO (these are FAILURES):
- DO NOT produce a flat single-layer plate.
- DO NOT produce fewer than ${Math.max(60, intent.voxelBudget - 40)} voxels.
- DO NOT produce disconnected floating voxels.
- DO NOT produce an unrecognizable blob.

Return ONLY a JSON object in this exact envelope shape (no markdown, no explanation):
    {
      "voxels": [
        { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
      ]
    }
`;
};

export const buildModelIntent = buildFallbackIntent;