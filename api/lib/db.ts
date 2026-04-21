export type DatabaseClient = {
  insertGenerationLog?: (payload: Record<string, unknown>) => Promise<void>;
};

let db: DatabaseClient | null = null;

export function getDb(): DatabaseClient {
  if (db) return db;

  db = {
    async insertGenerationLog(payload) {
      console.log('Mock DB insert:', payload);
    },
  };

  return db;
}
