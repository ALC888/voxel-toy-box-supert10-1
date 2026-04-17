import type { TemplateRoutingLogEvent } from './logging';

export interface LogEventRepository {
  append(event: TemplateRoutingLogEvent): Promise<void>;
  list(limit?: number): Promise<TemplateRoutingLogEvent[]>;
  clear(): Promise<void>;
}
