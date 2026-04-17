import type { PromptMode } from './retrieval.js';
import type { RouteDecision } from './routing.js';

export type FeedbackSignal = 'helpful' | 'not_helpful';

export type LogEventType = 'retrieval' | 'route' | 'feedback';

export interface CandidateScoreSnapshot {
  templateId: string;
  score: number;
  matchedSignalTypes: string[];
}

export interface RetrievalLogEvent {
  eventType: 'retrieval';
  createdAt: string;
  promptMode: PromptMode;
  rawPrompt: string;
  normalizedPrompt: string;
  promptTokenCount: number;
  candidateScores: CandidateScoreSnapshot[];
  selectedTemplateId: string | null;
}

export interface RouteLogEvent {
  eventType: 'route';
  createdAt: string;
  promptMode: PromptMode;
  decision: RouteDecision;
  topTemplateId: string | null;
  reasonCodes: string[];
  candidateCount: number;
}

export interface FeedbackLogEvent {
  eventType: 'feedback';
  createdAt: string;
  promptMode: PromptMode;
  routeDecision: RouteDecision;
  templateId: string | null;
  feedback: FeedbackSignal;
}

export type TemplateRoutingLogEvent =
  | RetrievalLogEvent
  | RouteLogEvent
  | FeedbackLogEvent;

export interface LogStorageAdapter {
  append(event: TemplateRoutingLogEvent): void;
  list(): TemplateRoutingLogEvent[];
  clear(): void;
}
