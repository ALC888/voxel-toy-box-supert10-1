import OpenAI from 'openai';
import type {
  BackendGenerationMode,
  GenerationOptions,
  ModelIntent,
  VoxelData,
} from '../../../types';
import { configureOutboundProxyOnce } from '../networkProxy.js';
import { getConstraintsForPrompt } from '../db.js';
import type { VoxelModelConstraint } from '../db.js';
import {
  buildModelIntent,
  getIntentPrompt,
  getLLMMessageContent,
  getVoxelPromptFromIntent,
} from './modelCallTypes.js';

type DeepSeekJsonEnvelope<T> = {
  result?: T;
  voxels?: VoxelData[];
  intent?: ModelIntent;
};

type JsonRecord = Record<string, unknown>;

function isVoxelLike(value: unknown): value is VoxelData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as JsonRecord;
  return (
    typeof record.x === 'number' &&
    Number.isFinite(record.x) &&
    typeof record.y === 'number' &&
    Number.isFinite(record.y) &&
    typeof record.z === 'number' &&
    Number.isFinite(record.z) &&
    (typeof record.color === 'number' || typeof record.color === 'string')
  );
}

function findVoxelArrayDeep(payload: unknown, visited = new Set<unknown>()): VoxelData[] | null {
  if (!payload || visited.has(payload)) {
    return null;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return findVoxelArrayDeep(parsed, visited);
    } catch {
      return null;
    }
  }

  if (Array.isArray(payload)) {
    if (payload.length > 0 && payload.every(isVoxelLike)) {
      return payload as VoxelData[];
    }

    visited.add(payload);
    for (const item of payload) {
      const nested = findVoxelArrayDeep(item, visited);
      if (nested && nested.length > 0) {
        return nested;
      }
    }
    return null;
  }

  if (typeof payload !== 'object') {
    return null;
  }

  visited.add(payload);
  const record = payload as JsonRecord;

  for (const value of Object.values(record)) {
    const nested = findVoxelArrayDeep(value, visited);
    if (nested && nested.length > 0) {
      return nested;
    }
  }

  return null;
}

function extractIntentFromUnknownPayload(payload: unknown): ModelIntent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as JsonRecord;

  const intent = record.intent;
  if (intent && typeof intent === 'object') {
    return intent as ModelIntent;
  }

  const result = record.result;
  if (result && typeof result === 'object') {
    const resultRecord = result as JsonRecord;
    if (resultRecord.intent && typeof resultRecord.intent === 'object') {
      return resultRecord.intent as ModelIntent;
    }
  }

  return null;
}

function extractVoxelsFromUnknownPayload(payload: unknown): VoxelData[] | null {
  return findVoxelArrayDeep(payload);
}

const DEFAULT_DEEPSEEK_MODEL = 'deepseekV4-flash';

function createDeepSeekClient() {
  configureOutboundProxyOnce();

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY for server-side DeepSeek calls.');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com/v1',
  });
}

function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL;
}

function extractTextFromCompletion(completion: OpenAI.Chat.Completions.ChatCompletion) {
  const content = completion.choices[0]?.message?.content as unknown;
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts = content
      .map((part) => {
        if (!part || typeof part !== 'object') return '';
        const maybeText = (part as { text?: unknown }).text;
        return typeof maybeText === 'string' ? maybeText : '';
      })
      .filter(Boolean);
    return textParts.join('\n');
  }

  return '';
}

function parseJsonResponse<T>(rawText: string, fallbackMessage: string): T {
  if (!rawText.trim()) {
    throw new Error(fallbackMessage);
  }

  const tryParse = (candidate: string): T | null => {
    if (!candidate.trim()) {
      return null;
    }

    try {
      return JSON.parse(candidate) as T;
    } catch {
      return null;
    }
  };

  const maybeHeuristic = (candidate: string): T | null => {
    const normalized = candidate
      // Common LLM mistake in arrays: object boundaries without commas.
      .replace(/}\s*{/g, '},{')
      // Remove trailing commas before closing tokens.
      .replace(/,\s*([}\]])/g, '$1');

    return tryParse(normalized);
  };

  const direct = tryParse(rawText) ?? maybeHeuristic(rawText);
  if (direct) {
    return direct;
  }

  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i) || rawText.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1]) ?? maybeHeuristic(fencedMatch[1]);
    if (fenced) {
      return fenced;
    }
  }

  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const maybeJson = rawText.slice(firstBrace, lastBrace + 1);
    const extracted = tryParse(maybeJson) ?? maybeHeuristic(maybeJson);
    if (extracted) {
      return extracted;
    }
  }

  // Last local recovery: salvage x/y/z/color object lines and wrap as { voxels: [...] }.
  const looseVoxelMatches = rawText.match(/\{[^{}]*?"x"\s*:\s*-?\d+[^{}]*?"y"\s*:\s*-?\d+[^{}]*?"z"\s*:\s*-?\d+[^{}]*?"color"\s*:\s*(?:"#[0-9A-Fa-f]{3,8}"|\d+)[^{}]*?\}/g);
  if (looseVoxelMatches && looseVoxelMatches.length > 0) {
    const voxelListText = `[${looseVoxelMatches.join(',')}]`;
    const voxelArray = (() => {
      try {
        return JSON.parse(voxelListText) as unknown[];
      } catch {
        return null;
      }
    })();
    if (voxelArray) {
      return { voxels: voxelArray } as T;
    }
  }

  throw new Error(fallbackMessage);
}

function buildDeterministicFallbackVoxels(intent: ModelIntent): VoxelData[] {
  const maxSide = intent.size === 'small' ? 4 : intent.size === 'large' ? 7 : 5;
  const half = Math.floor(maxSide / 2);
  const colorByScheme: Record<ModelIntent['colorScheme'], number> = {
    vibrant: 0xff5500,
    pastel: 0xf6bcd2,
    monochrome: 0x777777,
    nature: 0x4f7f39,
  };
  const baseColor = colorByScheme[intent.colorScheme] ?? 0x999999;

  const voxels: VoxelData[] = [];
  for (let x = -half; x <= half; x += 1) {
    for (let z = -half; z <= half; z += 1) {
      voxels.push({ x, y: 0, z, color: baseColor });
    }
  }

  for (let y = 1; y <= Math.max(2, Math.floor(maxSide / 2)); y += 1) {
    voxels.push({ x: 0, y, z: 0, color: baseColor });
  }

  return voxels;
}

function buildConstraintInjection(
  constraints: VoxelModelConstraint[]
): string | undefined {
  if (!constraints || constraints.length === 0) return undefined;

  const best = constraints[0];
  const lines: string[] = [];

  lines.push(`CATEGORY: ${best.category.toUpperCase()}`);
  lines.push('');
  lines.push('Minimum voxel count: ' + best.min_voxel_count + ' voxels (HARD MINIMUM)');
  lines.push('Maximum voxel count: ' + best.max_voxel_count + ' voxels (HARD LIMIT)');
  lines.push('');

  lines.push('ANATOMY REQUIREMENTS (MUST include ALL of these):');
  for (const rule of best.anatomy_rules) {
    lines.push('  - ' + rule);
  }
  lines.push('');

  lines.push('FORBIDDEN PATTERNS (DO NOT DO any of these):');
  for (const pattern of best.forbidden_patterns) {
    lines.push('  - ' + pattern);
  }

  if (best.color_palette && best.color_palette.length > 0) {
    lines.push('');
    lines.push('Recommended color palette: ' + best.color_palette.join(', '));
  }

  return lines.join('\n');
}

async function resolveConstraintText(prompt: string): Promise<string | undefined> {
  try {
    const constraints = await getConstraintsForPrompt(prompt);
    return buildConstraintInjection(constraints);
  } catch {
    return undefined;
  }
}

async function requestDeepSeekJson<T>(
  prompt: string,
  fallbackMessage: string
): Promise<T> {
  const client = createDeepSeekClient();
  const completion = await client.chat.completions.create({
    model: getDeepSeekModel(),
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

export async function callDeepSeekFastMode(
  systemContext: string,
  prompt: string,
  options?: GenerationOptions
): Promise<{ intent: ModelIntent; voxels: VoxelData[] }> {
  const defaultIntent = buildModelIntent(prompt, options);
  const constraintText = await resolveConstraintText(prompt);
  const envelope = await requestDeepSeekJson<unknown>(
    `${getLLMMessageContent(systemContext, prompt, options, constraintText)}

Return valid JSON in this shape:
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}`,
    'DeepSeek fast mode returned no voxel payload.'
  );

  const voxels = extractVoxelsFromUnknownPayload(envelope);
  if (voxels && voxels.length > 0) {
    return { intent: defaultIntent, voxels };
  }

  // Keep fast mode to a single external call to avoid Vercel duration limits.
  const recoveredIntent = extractIntentFromUnknownPayload(envelope) ?? defaultIntent;
  const fallbackVoxels = buildDeterministicFallbackVoxels(recoveredIntent);
  return { intent: recoveredIntent, voxels: fallbackVoxels };
}

export async function callDeepSeekIntent(
  systemContext: string,
  prompt: string,
  options: GenerationOptions
): Promise<ModelIntent> {
  const constraintText = await resolveConstraintText(prompt);
  const envelope = await requestDeepSeekJson<DeepSeekJsonEnvelope<ModelIntent>>(
    `${getIntentPrompt(systemContext, prompt, options, constraintText)}

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
    'DeepSeek intent stage returned no ModelIntent.'
  );

  const intent = envelope.intent ?? envelope.result;
  if (!intent || typeof intent !== 'object') {
    throw new Error('DeepSeek intent stage returned no ModelIntent.');
  }

  return intent;
}

export async function callDeepSeekVoxelFromIntent(
  systemContext: string,
  intent: ModelIntent
): Promise<VoxelData[]> {
  const constraintText = await resolveConstraintText(intent.subject);
  const envelope = await requestDeepSeekJson<unknown>(
    `${getVoxelPromptFromIntent(systemContext, intent, constraintText)}

Return valid JSON in this shape:
{
  "voxels": [
    { "x": 0, "y": 0, "z": 0, "color": "#FF5500" }
  ]
}`,
    'DeepSeek voxel stage returned no voxel payload.'
  );

  const voxels = extractVoxelsFromUnknownPayload(envelope);
  if (!voxels || voxels.length === 0) {
    return buildDeterministicFallbackVoxels(intent);
  }

  return voxels;
}

export async function generateDeepSeekVoxelResult(
  systemContext: string,
  prompt: string,
  options: GenerationOptions | undefined,
  mode: BackendGenerationMode,
  useTwoStage: boolean
): Promise<{ voxels: VoxelData[]; intent: ModelIntent; usedTwoStage: boolean }> {
  if (mode === 'expert' || useTwoStage) {
    const safeOptions = options ?? {};
    const intent = await callDeepSeekIntent(systemContext, prompt, safeOptions);
    const voxels = await callDeepSeekVoxelFromIntent(systemContext, intent);
    return { voxels, intent, usedTwoStage: true };
  }

  const fastResult = await callDeepSeekFastMode(systemContext, prompt, options);
  return {
    voxels: fastResult.voxels,
    intent: fastResult.intent,
    usedTwoStage: false,
  };
}

export default generateDeepSeekVoxelResult;
