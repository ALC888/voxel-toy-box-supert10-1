import { Config, Context } from "@netlify/functions";
  // import callGeminiStream from '@/netlify/model/gemini';
import callGeminiStream from "netlify/model/gemini"
import { Config, Context } from '@netlify/functions';
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

import callOpenAIClient, { callLlamaClient } from '@/netlify/model/openai';
export default async (req: Request, context: Context) => {
    // const { greeting } = require(`./languages/${lang}.json`);
  return options ? 'expert' : 'fast';
}

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  // const response = await callOpenrouter(systemContext);
  // const rawResponse = response?.text;
  // const rawData = JSON.parse(rawResponse);
  return 'Unknown backend generation error.';
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // const response = await callOpenAIClient(systemContext);
  // const rawResponse = response;
  try {
    // const {systemContext} = context.params;
    console.log("Received request in lego-gemini function");
    const data = await req.json() as LegoApiCallRequest;
    //Bian: support either `options` or legacy/new frontend `params`.
    const { systemContext, prompt, options, params } = data;
    const generationOptions: GenerationOptions | undefined = options ?? params;
    console.log("Received systemContext:", systemContext);
    console.log("Generation mode:", generationOptions ? "expert-two-stage" : "fast-single-stage");
    const data = (await req.json()) as LegoApiCallRequest;
    const { systemContext = '', prompt, options, params, useTwoStage } = data;
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

    const response = await callGeminiStream(systemContext, prompt, generationOptions);
    
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          // Enqueue the chunk into the ReadableStream
          controller.enqueue(
            new TextEncoder().encode(chunk.text || "")
          );
        }
    const { voxels: rawVoxels, intent, usedTwoStage } = await generateGeminiVoxelResult(
      systemContext,
      prompt,
      generationOptions,
      mode,
      shouldUseTwoStage
    );

        controller.close(); // Close the stream when it's done
      }
    });
    const postprocess = validateAndRepairVoxelArray(rawVoxels, intent.voxelBudget);
    const metadata = calculateMetadataFromVoxels(postprocess.voxels, postprocess.warnings);
    const templateMatch = inferTemplateMatch(prompt, intent);

    return new Response(readableStream, {
      headers: {
        // This is the mimetype for server-sent events
        "content-type": "text/event-stream"
      }
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
    // return response;
  } catch (error) {
    return new Response("Error: " + error.message, { status: 500 });
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

  // const response = await callLlamaClient(systemContext);
  // const rawResponse = response;

  // const rawData = JSON.parse(rawResponse);
};

export const config: Config = {
  path: "/api/lego-gemini",
  path: '/api/lego-gemini',
};
