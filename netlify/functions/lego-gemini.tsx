import type { Config, Context } from '@netlify/functions';
import type {
  BackendGenerationMode,
  BackendGenerationResponse,
  GenerationOptions,
  LegoApiCallRequest,
} from '@/types';
import generateGeminiVoxelResult from '@/netlify/model/gemini';
import { inferTemplateMatch } from '@/netlify/utils/templateMatcher';
import {
  calculateMetadataFromVoxels,
  validateAndRepairVoxelArray,
} from '@/netlify/utils/voxelPostprocess';

function json(body: BackendGenerationResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

function resolveMode(
  requestedMode: LegoApiCallRequest['mode'],
  options?: GenerationOptions
): BackendGenerationMode {
  if (requestedMode === 'expert') {
    return 'expert';
  }

  if (requestedMode === 'quick' || requestedMode === 'fast') {
    return 'fast';
  }

  return options ? 'expert' : 'fast';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown backend generation error.';
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const data = (await req.json()) as LegoApiCallRequest;
    const {
      systemContext = '',
      prompt,
      options,
      params,
      useTwoStage,
    } = data;
    const generationOptions = options ?? params;

    if (!prompt?.trim()) {
      return json(
        {
          success: false,
          warnings: [],
          error: 'prompt is required',
          errorCode: 'BAD_REQUEST',
          mode: 'fast',
          usedTwoStage: false,
        },
        400
      );
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
    const metadata = calculateMetadataFromVoxels(
      postprocess.voxels,
      postprocess.warnings
    );
    const templateMatch = inferTemplateMatch(prompt, intent);

    return json({
      success: true,
      voxels: postprocess.voxels,
      warnings: postprocess.warnings,
      stats: postprocess.stats,
      metadata,
      templateMatch,
      mode,
      usedTwoStage,
      intent,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const response: BackendGenerationResponse = {
      success: false,
      warnings: ['The backend request failed before a valid voxel result was produced.'],
      error: message,
      errorCode: 'GEMINI_GENERATION_FAILED',
      mode: 'fast',
      usedTwoStage: false,
    };

    return json(response, 500);
  }
};

export const config: Config = {
  path: '/api/lego-gemini',
};
