import {
  generateReflection,
  generatePeriodicReflection,
  extractMemories,
  getReflections,
  getReflection,
} from "../engines/reflection.js";
import type { Handler } from "./index.js";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const err = (e: unknown, status = 400) =>
  json({ error: e instanceof Error ? e.message : "Request failed" }, status);

async function body(req: Request): Promise<Record<string, unknown>> {
  return (await req.json()) as Record<string, unknown>;
}

export const reflectionsHandler: Handler = async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  try {
    // POST /api/reflections — generate a reflection from a conversation
    if (method === "POST" && path === "/api/reflections") {
      const b = await body(req);
      const userId = String(b.userId);
      const conversationId = String(b.conversationId);
      const reflection = await generateReflection({ userId, conversationId });
      return json(reflection, 201);
    }

    // POST /api/reflections/periodic — generate weekly/monthly reflection
    if (method === "POST" && path === "/api/reflections/periodic") {
      const b = await body(req);
      const userId = String(b.userId);
      const period = b.period as "week" | "month";
      if (period !== "week" && period !== "month") {
        return err(new Error('period must be "week" or "month"'));
      }
      const reflection = await generatePeriodicReflection({ userId, period });
      return json(reflection, 201);
    }

    // POST /api/reflections/extract-memories — extract memories from a conversation
    if (method === "POST" && path === "/api/reflections/extract-memories") {
      const b = await body(req);
      const userId = String(b.userId);
      const conversationId = String(b.conversationId);
      const memories = await extractMemories({ userId, conversationId });
      return json(memories, 201);
    }

    // GET /api/reflections?userId=X&type=Y — list reflections
    if (method === "GET" && path === "/api/reflections") {
      const userId = url.searchParams.get("userId");
      if (!userId) return err(new Error("userId query parameter is required"));
      const type = url.searchParams.get("type") as
        | "pattern"
        | "insight"
        | "question"
        | "summary"
        | null;
      const limit = url.searchParams.has("limit")
        ? Number(url.searchParams.get("limit"))
        : undefined;
      const offset = url.searchParams.has("offset")
        ? Number(url.searchParams.get("offset"))
        : undefined;
      const reflections = await getReflections({
        userId,
        type: type ?? undefined,
        limit,
        offset,
      });
      return json(reflections);
    }

    // Match /api/reflections/:id — get a single reflection
    const reflectionMatch = path.match(/^\/api\/reflections\/([^/]+)$/);
    if (reflectionMatch && method === "GET") {
      const id = reflectionMatch[1];
      const result = await getReflection(id);
      return json(result);
    }

    return err(new Error("Not found"), 404);
  } catch (e) {
    return err(e);
  }
};
