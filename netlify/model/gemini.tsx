import { GoogleGenAI, Type } from '@google/genai';
import type {
  BackendGenerationMode,
  GenerationOptions,
  ModelIntent,
  VoxelData,
} from '@/types';
import {
  buildModelIntent,
  getIntentPrompt,
  getLLMMessageContent,
  getVoxelPromptFromIntent,
} from './modelCallTypes';

const createGeminiClient = () => new GoogleGenAI({});
const model = 'gemini-2.5-flash';

function getVoxelSchema() {
  return {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        x: { type: Type.INTEGER },
        y: { type: Type.INTEGER },
        z: { type: Type.INTEGER },
        color: { type: Type.STRING, description: 'Hex color code e.g. #FF5500' },
      },
      required: ['x', 'y', 'z', 'color'],
    },
  };
}

function getIntentSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      style: { type: Type.STRING },
      colorScheme: { type: Type.STRING },
      size: { type: Type.STRING },
      symmetry: { type: Type.STRING },
      voxelBudget: { type: Type.INTEGER },
      silhouetteKeywords: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      structuralRules: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: [
      'subject',
      'style',
      'colorScheme',
      'size',
      'symmetry',
      'voxelBudget',
      'silhouetteKeywords',
      'structuralRules',
    ],
  };
}

function parseJsonResponse<T>(rawText: string | undefined, fallbackMessage: string): T {
  if (!rawText) {
    throw new Error(fallbackMessage);
  }

  return JSON.parse(rawText) as T;
}

export async function callGeminiFastMode(
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
): Promise<{ intent: ModelIntent; voxels: VoxelData[] }> {
  const ai = createGeminiClient();
  const intent = buildModelIntent(prompt, options);
  const response = await ai.models.generateContent({
    model,
    contents: getLLMMessageContent(systemContext, prompt, options),
    config: {
      responseMimeType: 'application/json',
      responseSchema: getVoxelSchema(),
    },
  });

  const voxels = parseJsonResponse<VoxelData[]>(
    response.text,
    'Gemini fast mode returned no voxel payload.'
  );

  return { intent, voxels };
}

export async function callGeminiIntent(
  systemContext: string,
  prompt: string,
  options: GenerationOptions
): Promise<ModelIntent> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model,
    contents: getIntentPrompt(systemContext, prompt, options),
    config: {
      responseMimeType: 'application/json',
      responseSchema: getIntentSchema(),
    },
  });

  return parseJsonResponse<ModelIntent>(
    response.text,
    'Gemini intent stage returned no ModelIntent.'
  );
}

export async function callGeminiVoxelFromIntent(
  systemContext: string,
  intent: ModelIntent
): Promise<VoxelData[]> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model,
    contents: getVoxelPromptFromIntent(systemContext, intent),
    config: {
      responseMimeType: 'application/json',
      responseSchema: getVoxelSchema(),
    },
  });

  return parseJsonResponse<VoxelData[]>(
    response.text,
    'Gemini voxel stage returned no voxel payload.'
  );
}

export async function generateGeminiVoxelResult(
  systemContext: string,
  prompt: string,
  options: GenerationOptions | undefined,
  mode: BackendGenerationMode,
  useTwoStage: boolean
): Promise<{ voxels: VoxelData[]; intent: ModelIntent; usedTwoStage: boolean }> {
  if (mode === 'expert' || useTwoStage) {
    const safeOptions = options ?? {};
    const intent = await callGeminiIntent(systemContext, prompt, safeOptions);
    const voxels = await callGeminiVoxelFromIntent(systemContext, intent);
    return { voxels, intent, usedTwoStage: true };
  }

  const fastResult = await callGeminiFastMode(systemContext, prompt, options);
  return {
    voxels: fastResult.voxels,
    intent: fastResult.intent,
    usedTwoStage: false,
  };
}

export default generateGeminiVoxelResult;
