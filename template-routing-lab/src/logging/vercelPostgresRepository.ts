import type { LogEventRepository, TemplateRoutingLogEvent } from '../contracts/index.js';

export interface SqlClientLike {
  query<T = unknown>(sqlText: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export class VercelPostgresLogRepository implements LogEventRepository {
  constructor(private readonly client: SqlClientLike) {}

  async append(event: TemplateRoutingLogEvent): Promise<void> {
    await this.client.query(
      `
        insert into template_routing_log_events (event_type, created_at, payload_json)
        values ($1, $2, $3::jsonb)
      `,
      [event.eventType, event.createdAt, JSON.stringify(event)]
    );
  }

  async list(limit = 100): Promise<TemplateRoutingLogEvent[]> {
    const result = await this.client.query<{ payload_json: TemplateRoutingLogEvent }>(
      `
        select payload_json
        from template_routing_log_events
        order by created_at desc
        limit $1
      `,
      [limit]
    );

    return result.rows.map((row) => row.payload_json);
  }

  async clear(): Promise<void> {
    await this.client.query(`delete from template_routing_log_events`);
  }
}
