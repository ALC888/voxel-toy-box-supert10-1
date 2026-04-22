import type {
  BackendGenerationResponse,
  GenerationOptions,
  VoxelData,
} from '../../../types';

const DEFAULT_SYSTEM_CONTEXT = [
  'You are a creative voxel art generator.',
  'Always return valid JSON only.',
  'Keep the result centered, connected, and visually readable.',
].join(' ');

export async function generateVoxelModel(
  prompt: string,
  options: GenerationOptions,
  mode: 'fast' | 'expert'
): Promise<BackendGenerationResponse & { voxels: VoxelData[] }> {
  const response = await api<BackendGenerationResponse>('lego-gemini', {
    method: 'POST',
    body: JSON.stringify({
      systemContext: DEFAULT_SYSTEM_CONTEXT,
      prompt,
      mode,
      options,
    }),
  });

  if (!response.success || !response.voxels) {
    throw new Error(response.error || 'Backend generation failed.');
  }

  return response as BackendGenerationResponse & { voxels: VoxelData[] };
}
