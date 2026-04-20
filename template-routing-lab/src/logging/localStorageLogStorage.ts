import type { LogStorageAdapter, TemplateRoutingLogEvent } from '../contracts/index.js';

export class LocalStorageLogStorage implements LogStorageAdapter {
  constructor(private readonly storageKey = 'template-routing-log-events') {}

  append(event: TemplateRoutingLogEvent): void {
    const next = [...this.list(), event];
    globalThis.localStorage?.setItem(this.storageKey, JSON.stringify(next));
  }

  list(): TemplateRoutingLogEvent[] {
    const raw = globalThis.localStorage?.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as TemplateRoutingLogEvent[];
    } catch {
      return [];
    }
  }

  clear(): void {
    globalThis.localStorage?.removeItem(this.storageKey);
  }
}
