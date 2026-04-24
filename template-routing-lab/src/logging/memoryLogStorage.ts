import type { LogStorageAdapter, TemplateRoutingLogEvent } from '../contracts/index.js';

export class MemoryLogStorage implements LogStorageAdapter {
  private events: TemplateRoutingLogEvent[] = [];

  append(event: TemplateRoutingLogEvent): void {
    this.events.push(event);
  }

  list(): TemplateRoutingLogEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
