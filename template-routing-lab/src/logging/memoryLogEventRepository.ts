import type { LogEventRepository, TemplateRoutingLogEvent } from '../contracts/index.js';

export class MemoryLogEventRepository implements LogEventRepository {
  private events: TemplateRoutingLogEvent[] = [];

  async append(event: TemplateRoutingLogEvent): Promise<void> {
    this.events.push(event);
  }

  async list(limit = 100): Promise<TemplateRoutingLogEvent[]> {
    return [...this.events]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}