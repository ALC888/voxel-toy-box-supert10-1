import OpenAI from 'openai';
import type {
  BackendGenerationMode,
  GenerationOptions,
  ModelIntent,
  VoxelData,
} from '../../../types';
import { configureOutboundProxyOnce } from '../networkProxy.js';
import {
  buildModelIntent,
  getIntentPrompt,
  getLLMMessageContent,
  getVoxelPromptFromIntent,
} from './modelCallTypes.js';

type KimiJsonEnvelope<T> = {
  result?: T;
  voxels?: VoxelData[];
  intent?: ModelIntent;
};

function extractVoxelsFromUnknownPayload(payload: unknown): VoxelData[] | null {
  if (Array.isArray(payload)) {
    return payload as VoxelData[];
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.voxels)) {
    return record.voxels as VoxelData[];
  }

  if (Array.isArray(record.result)) {
    return record.result as VoxelData[];
  }

  const nestedResult = record.result;
  if (nestedResult && typeof nestedResult === 'object') {
    const nestedRecord = nestedResult as Record<string, unknown>;
    if (Array.isArray(nestedRecord.voxels)) {
      return nestedRecord.voxels as VoxelData[];
    }
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    const dataRecord = data as Record<string, unknown>;
    if (Array.isArray(dataRecord.voxels)) {
      return dataRecord.voxels as VoxelData[];
    }
  }

  return null;
}

const DEFAULT_KIMI_MODEL = 'moonshot-v1-8k';

function createKimiClient() {
  configureOutboundProxyOnce();

  const apiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('Missing KIMI_API_KEY for server-side Kimi calls.');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.moonshot.cn/v1',
  });
}

function getKimiModel() {
  return process.env.KIMI_MODEL || DEFAULT_KIMI_MODEL;
}

function extractTextFromCompletion(completion: OpenAI.Chat.Completions.ChatCompletion) {
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  return '';
}

function parseJsonResponse<T>(rawText: string, fallbackMessage: string): T {
  if (!rawText.trim()) {
    throw new Error(fallbackMessage);
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as T;
    }

    throw new Error(fallbackMessage);
  }
}

async function requestKimiJson<T>(
  prompt: string,
  fallbackMessage: string
): Promise<T> {
  const client = createKimiClient();
  const completion = await client.chat.completions.create({
    model: getKimiModel(),
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.4,
  });

  const rawText = extractTextFromCompletion(completion);
  return parseJsonResponse<T>(rawText, fallbackMessage);
}

export async function callKimiFastMode(
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
): Promise<{ intent: ModelIntent; voxels: VoxelData[] }> {
  const intent = buildModelIntent(prompt, options);
  const envelope = await requestKimiJson<unknown>(
    `${getLLMMessageContent(systemContext, prompt, options)}

Return valid JSON in this shape:
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}`,
    'Kimi fast mode returned no voxel payload.'
  );

  const voxels = extractVoxelsFromUnknownPayload(envelope);
  if (!voxels || voxels.length === 0) {
    throw new Error('Kimi fast mode returned no voxel payload.');
  }

  return { intent, voxels };
}

export async function callKimiIntent(
  systemContext: string,
  prompt: string,
  options: GenerationOptions
): Promise<ModelIntent> {
  const envelope = await requestKimiJson<KimiJsonEnvelope<ModelIntent>>(
    `${getIntentPrompt(systemContext, prompt, options)}

Return valid JSON in this shape:
{
  "intent": {
    "subject": "cute rabbit",
    "style": "cartoon",
    "colorScheme": "pastel",
    "size": "medium",
    "symmetry": "bilateral",
    "voxelBudget": 200,
    "silhouetteKeywords": ["round ears", "small body"],
    "structuralRules": ["Keep all main parts connected."]
  }
}`,
    'Kimi intent stage returned no ModelIntent.'
  );

  const intent = envelope.intent ?? envelope.result;
  if (!intent || typeof intent !== 'object') {
    throw new Error('Kimi intent stage returned no ModelIntent.');
  }

  return intent;
}

export async function callKimiVoxelFromIntent(
  systemContext: string,
  intent: ModelIntent
): Promise<VoxelData[]> {
  const envelope = await requestKimiJson<unknown>(
    `${getVoxelPromptFromIntent(systemContext, intent)}

Return valid JSON in this shape:
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}`,
    'Kimi voxel stage returned no voxel payload.'
  );

  const voxels = extractVoxelsFromUnknownPayload(envelope);
  if (!voxels || voxels.length === 0) {
    throw new Error('Kimi voxel stage returned no voxel payload.');
  }

  return voxels;
}

export async function generateKimiVoxelResult(
  systemContext: string,
  prompt: string,
  options: GenerationOptions | undefined,
  mode: BackendGenerationMode,
  useTwoStage: boolean
): Promise<{ voxels: VoxelData[]; intent: ModelIntent; usedTwoStage: boolean }> {
  if (mode === 'expert' || useTwoStage) {
    const safeOptions = options ?? {};
    const intent = await callKimiIntent(systemContext, prompt, safeOptions);
    const voxels = await callKimiVoxelFromIntent(systemContext, intent);
    return { voxels, intent, usedTwoStage: true };
  }

  const fastResult = await callKimiFastMode(systemContext, prompt, options);
  return {
    voxels: fastResult.voxels,
    intent: fastResult.intent,
    usedTwoStage: false,
  };
}

export default generateKimiVoxelResult;
