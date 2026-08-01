import { getDb } from "../db.js";
import { memories } from "../db/schema.js";
import { getOpenAI } from "../lib/openai.js";

export type Memory = typeof memories.$inferSelect;
export type MemorySource = "conversation" | "reflection" | "journal" | "explicit";

async function embed(input: string): Promise<number[]> {
  try {
    const response = await getOpenAI().embeddings.create({ model: "text-embedding-3-small", input, dimensions: 1536 });
    return response.data[0]?.embedding ?? (() => { throw new Error("OpenAI returned no embedding"); })();
  } catch (error) {
    throw new Error(`Failed to generate memory embedding: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const vector = (values: number[]) => `[${values.join(",")}]`;

export async function storeMemory(params: { userId: string; content: string; source: MemorySource; sourceId?: string; importance?: number }): Promise<Memory> {
  const importance = params.importance ?? 0.5;
  if (importance < 0 || importance > 1) throw new Error("importance must be between 0 and 1");
  const embedding = await embed(params.content);
  const db = getDb();
  const [row] = await db<Memory[]>`
    INSERT INTO memories (user_id, content, embedding, source, source_id, importance)
    VALUES (${params.userId}, ${params.content}, ${vector(embedding)}::vector, ${params.source}, ${params.sourceId ?? null}, ${importance})
    RETURNING id, user_id as "userId", content, embedding, source, source_id as "sourceId", importance,
      decay_score as "decayScore", last_recalled_at as "lastRecalledAt", recall_count as "recallCount",
      created_at as "createdAt", updated_at as "updatedAt"`;
  if (!row) throw new Error("Memory insert returned no row");
  return row;
}

export async function retrieveMemories(params: { userId: string; query: string; limit?: number; threshold?: number }): Promise<Array<Memory & { similarity: number }>> {
  const embedding = await embed(params.query);
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
  const threshold = params.threshold ?? 0.7;
  const db = getDb();
  const rows = await db<Array<Memory & { similarity: number }>>`
    SELECT id, user_id as "userId", content, embedding, source, source_id as "sourceId", importance,
      decay_score as "decayScore", last_recalled_at as "lastRecalledAt", recall_count as "recallCount",
      created_at as "createdAt", updated_at as "updatedAt",
      1 - (embedding <=> ${vector(embedding)}::vector) AS similarity
    FROM memories
    WHERE user_id = ${params.userId} AND 1 - (embedding <=> ${vector(embedding)}::vector) >= ${threshold}
    ORDER BY embedding <=> ${vector(embedding)}::vector LIMIT ${limit}`;
  if (rows.length) await db`UPDATE memories SET last_recalled_at = now(), recall_count = recall_count + 1, updated_at = now() WHERE id IN ${db(rows.map((r) => r.id))}`;
  return rows;
}

export async function consolidateMemories(params: { userId: string }): Promise<{ merged: number; updated: number }> {
  const db = getDb();
  const rows = await db<Array<Memory>>`SELECT id, user_id as "userId", content, embedding, source, source_id as "sourceId", importance, decay_score as "decayScore", last_recalled_at as "lastRecalledAt", recall_count as "recallCount", created_at as "createdAt", updated_at as "updatedAt" FROM memories WHERE user_id = ${params.userId} ORDER BY importance DESC`;
  let merged = 0;
  const deleted = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    if (deleted.has(rows[i].id)) continue;
    for (let j = i + 1; j < rows.length; j++) {
      if (deleted.has(rows[j].id)) continue;
      const [{ similarity }] = await db<Array<{ similarity: number }>>`SELECT 1 - (${rows[i].embedding}::vector <=> ${rows[j].embedding}::vector) AS similarity`;
      if (similarity >= 0.92) {
        await db`UPDATE memories SET content = ${`${rows[i].content}\n${rows[j].content}`}, recall_count = recall_count + ${rows[j].recallCount}, updated_at = now() WHERE id = ${rows[i].id}`;
        await db`DELETE FROM memories WHERE id = ${rows[j].id}`;
        deleted.add(rows[j].id); merged++;
      }
    }
  }
  const updated = await db<Array<{ id: string }>>`UPDATE memories SET importance = LEAST(1, GREATEST(0, (importance + LEAST(recall_count, 20)::real / 20) / 2)), updated_at = now() WHERE user_id = ${params.userId} RETURNING id`;
  return { merged, updated: updated.length };
}

export async function applyDecay(params: { userId: string }): Promise<{ decayed: number; removed: number }> {
  const db = getDb();
  const result = await db<Array<{ decayed: number; removed: number }>>`
    WITH scored AS (SELECT id, decay_score * exp(-0.01 * EXTRACT(EPOCH FROM (now() - COALESCE(last_recalled_at, created_at))) / 86400) AS score FROM memories WHERE user_id = ${params.userId}),
    removed AS (DELETE FROM memories WHERE id IN (SELECT id FROM scored WHERE score < 0.05) RETURNING id),
    updated AS (UPDATE memories m SET decay_score = s.score, updated_at = now() FROM scored s WHERE m.id = s.id AND s.score >= 0.05 RETURNING m.id)
    SELECT (SELECT count(*) FROM updated)::int AS decayed, (SELECT count(*) FROM removed)::int AS removed`;
  return result[0] ?? { decayed: 0, removed: 0 };
}

export async function getMemories(params: { userId: string; source?: string; limit?: number; offset?: number; sortBy?: "importance" | "recency" | "decay" }): Promise<Memory[]> {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);
  const order = params.sortBy === "importance" ? "importance" : params.sortBy === "decay" ? "decay_score" : "created_at";
  const sourceClause = params.source ? ` AND source = '${params.source.replaceAll("'", "''")}'` : "";
  const userId = params.userId.replaceAll("'", "''");
  return await db.unsafe(`SELECT id, user_id as "userId", content, embedding, source, source_id as "sourceId", importance, decay_score as "decayScore", last_recalled_at as "lastRecalledAt", recall_count as "recallCount", created_at as "createdAt", updated_at as "updatedAt" FROM memories WHERE user_id = '${userId}' ${sourceClause} ORDER BY ${order} DESC LIMIT ${limit} OFFSET ${offset}`) as Memory[];
}
