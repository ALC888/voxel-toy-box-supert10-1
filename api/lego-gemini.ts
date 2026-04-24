import type {
  BackendGenerationMode,
  BackendGenerationResponse,
  GenerationOptions,
  LegoApiCallRequest,
} from '../types';
import {generate} from '../netlify/model/gemini';
import { inferTemplateMatch } from '../netlify/utils/templateMatcher';
import {
  calculateMetadataFromVoxels,
  validateAndRepairVoxelArray,
} from '../netlify/utils/voxelPostprocess';
import { saveGenerationRecord } from './lib/saveGeneration';

function resolveMode(
  requestedMode: LegoApiCallRequest['mode'],
  options?: GenerationOptions
): BackendGenerationMode {
  if (requestedMode === 'expert') return 'expert';
  if (requestedMode === 'quick' || requestedMode === 'fast') return 'fast';
  return options ? 'expert' : 'fast';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown backend generation error.';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const data = req.body as LegoApiCallRequest;
    const { systemContext = '', prompt, options, params, useTwoStage } = data;
    const generationOptions = options ?? params;

    if (!prompt?.trim()) {
      const badRequest: BackendGenerationResponse = {
        success: false,
        warnings: [],
        error: 'prompt is required',
        errorCode: 'BAD_REQUEST',
        mode: 'fast',
        usedTwoStage: false,
      };
      return res.status(400).json(badRequest);
    }

    const mode = resolveMode(data.mode, generationOptions);
    const shouldUseTwoStage = useTwoStage ?? mode === 'expert';

    const { voxels: rawVoxels, intent, usedTwoStage } =
      await generateGeminiVoxelResult(
        systemContext,
        prompt,
        generationOptions,
        mode,
        shouldUseTwoStage
      );

    const postprocess = validateAndRepairVoxelArray(rawVoxels, intent.voxelBudget);
    const metadata = calculateMetadataFromVoxels(postprocess.voxels, postprocess.warnings);
    const templateMatch = inferTemplateMatch(prompt, intent);

    const response: BackendGenerationResponse = {
      success: true,
      voxels: postprocess.voxels,
      warnings: postprocess.warnings,
      stats: postprocess.stats,
      metadata,
      templateMatch,
      mode,
      usedTwoStage,
      intent,
    };

    await saveGenerationRecord({
      prompt,
      options: generationOptions ?? {},
      success: true,
      voxelCount: metadata.voxelCount,
      colorCount: metadata.colorCount,
      warnings: postprocess.warnings,
      templateMatch,
    });

    return res.status(200).json(response);
  } catch (error) {
    const message = getErrorMessage(error);

    await saveGenerationRecord({
      prompt: req.body?.prompt ?? '',
      options: req.body?.options ?? req.body?.params ?? {},
      success: false,
      voxelCount: 0,
      colorCount: 0,
      warnings: ['Backend generation failed before a valid voxel result was produced.'],
      templateMatch: null,
      error: message,
    });

    const response: BackendGenerationResponse = {
      success: false,
      warnings: ['The backend request failed before a valid voxel result was produced.'],
      error: message,
      errorCode: 'GEMINI_GENERATION_FAILED',
      mode: 'fast',
      usedTwoStage: false,
    };

    return res.status(500).json(response);
  }
}
