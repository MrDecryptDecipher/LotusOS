import { getDb } from "../db.js";
import { streamChat, generateTitle } from "../engines/conversation.js";
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

export const conversationsHandler: Handler = async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  try {
    // POST /api/conversations — create a new conversation
    if (method === "POST" && path === "/api/conversations") {
      const b = await body(req);
      const userId = String(b.userId);
      const db = getDb();
      const [conversation] = await db`
        INSERT INTO conversations (user_id) VALUES (${userId})
        RETURNING id, user_id as "userId", title, mood, created_at as "createdAt", updated_at as "updatedAt"`;
      return json(conversation, 201);
    }

    // GET /api/conversations?userId=X — list conversations for a user
    if (method === "GET" && path === "/api/conversations") {
      const userId = url.searchParams.get("userId");
      if (!userId) return err(new Error("userId query parameter is required"));
      const db = getDb();
      const rows = await db`
        SELECT id, user_id as "userId", title, mood, created_at as "createdAt", updated_at as "updatedAt"
        FROM conversations WHERE user_id = ${userId} ORDER BY updated_at DESC`;
      return json(rows);
    }

    // Match /api/conversations/:id and /api/conversations/:id/*
    const convMatch = path.match(/^\/api\/conversations\/([^/]+)(\/.*)?$/);
    if (convMatch) {
      const convId = convMatch[1];
      const subPath = convMatch[2] ?? "";

      // GET /api/conversations/:id — get conversation with messages
      if (method === "GET" && subPath === "") {
        const db = getDb();
        const [conversation] = await db`
          SELECT id, user_id as "userId", title, mood, created_at as "createdAt", updated_at as "updatedAt"
          FROM conversations WHERE id = ${convId}`;
        if (!conversation) return err(new Error("Conversation not found"), 404);

        const msgs = await db`
          SELECT id, conversation_id as "conversationId", role, content, created_at as "createdAt"
          FROM messages WHERE conversation_id = ${convId} ORDER BY created_at ASC`;
        return json({ ...conversation, messages: msgs });
      }

      // POST /api/conversations/:id/messages — SSE streaming response
      if (method === "POST" && subPath === "/messages") {
        const b = await body(req);
        const message = String(b.message);

        // Look up the conversation to get its userId
        const db = getDb();
        const [conv] = await db`
          SELECT user_id as "userId" FROM conversations WHERE id = ${convId}`;
        if (!conv) return err(new Error("Conversation not found"), 404);
        const userId = String(conv.userId);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              await streamChat({
                userId,
                conversationId: convId,
                message,
                onToken: (token: string) => {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ token })}\n\n`,
                    ),
                  );
                },
                onComplete: () => {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                },
                onError: (e: Error) => {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ error: e.message })}\n\n`,
                    ),
                  );
                  controller.close();
                },
              });
            } catch (e) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ error: e instanceof Error ? e.message : "Streaming failed" })}\n\n`,
                ),
              );
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // POST /api/conversations/:id/title — regenerate title
      if (method === "POST" && subPath === "/title") {
        const db = getDb();
        const [firstMsg] = await db`
          SELECT content FROM messages
          WHERE conversation_id = ${convId} AND role = 'user'
          ORDER BY created_at ASC LIMIT 1`;
        if (!firstMsg)
          return err(new Error("No messages in conversation"), 400);

        const title = await generateTitle({
          firstMessage: String(firstMsg.content),
        });
        await db`
          UPDATE conversations SET title = ${title}, updated_at = now()
          WHERE id = ${convId}`;
        return json({ title });
      }
    }

    return err(new Error("Not found"), 404);
  } catch (e) {
    return err(e);
  }
};
