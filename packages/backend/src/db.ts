import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb(): ReturnType<typeof postgres> {
  if (!sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set — set it before running database queries."
      );
    }
    sql = postgres(url, {
      ssl: "require",
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }
  return sql;
}

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  const db = getDb();
  const [result] = await db`SELECT 1 as one`;
  const latencyMs = Math.round((performance.now() - start) * 100) / 100;
  return { ok: result.one === 1, latencyMs };
}
