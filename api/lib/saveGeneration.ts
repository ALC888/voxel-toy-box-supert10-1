import type { GenerationOptions, TemplateMatchResult } from '../../types';
import { getDb } from './db';

interface SaveGenerationInput {
  prompt: string;
  options: GenerationOptions;
  success: boolean;
  voxelCount: number;
  colorCount: number;
  warnings: string[];
  templateMatch: TemplateMatchResult | null;
  error?: string;
}

export async function saveGenerationRecord(input: SaveGenerationInput) {
  const db = getDb();

  if (!db.insertGenerationLog) {
    return;
  }

  try {
    await db.insertGenerationLog({
      prompt: input.prompt,
      generation_options: input.options as Record<string, unknown>,
      success: input.success,
      voxel_count: input.voxelCount,
      color_count: input.colorCount,
      warnings: input.warnings,
      template_match:
        ((input.templateMatch as unknown as Record<string, unknown> | null) ?? null),
      error_message: input.error ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to persist generation log.', error);
  }
}
