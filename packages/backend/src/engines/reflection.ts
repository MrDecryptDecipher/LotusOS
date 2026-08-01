import { getDb } from "../db.js";
import { getAI, CHAT_MODEL } from "../lib/openai.js";
import { retrieveMemories, storeMemory } from "./memory.js";
import type { Memory } from "./memory.js";
import { reflections } from "../db/schema.js";

export type ReflectionType = "pattern" | "insight" | "question" | "summary";
export type Reflection = typeof reflections.$inferSelect;

// ── prompt builders ──────────────────────────────────────────────

function buildReflectionPrompt(params: {
  messages: Array<{ role: string; content: string }>;
  memories: Array<Memory & { similarity?: number }>;
}): string {
  const conversationText = params.messages
    .map((m) => `${m.role === "user" ? "User" : "Healer-AI"}: ${m.content}`)
    .join("\n\n");

  const memoryText =
    params.memories.length > 0
      ? params.memories.map((m, i) => `${i + 1}. ${m.content}`).join("\n")
      : "(no prior memories available)";

  return `You are the reflective core of Healer-AI, an emotionally intelligent companion. Your role is to observe, synthesize, and gently illuminate — never to diagnose, label, or prescribe.

Below is a recent conversation and relevant memories about this person. Read them carefully, then produce a structured reflection.

## Conversation
${conversationText}

## Relevant Memories
${memoryText}

## Instructions
Analyze the conversation and memories. Identify:

1. **Patterns** — recurring themes, emotional cycles, behavioral loops you notice. Frame these as tentative observations ("It seems that...", "One possible pattern is...").
2. **Insights** — "aha" moments or connections the person might not have made themselves. Help them see their experience with fresh eyes.
3. **Questions** — 2-4 thought-provoking, open-ended questions that invite deeper self-understanding. These should emerge naturally from what was shared.
4. **Summary** — a brief, compassionate synthesis (2-4 sentences) of what was discussed, in the person's own framing.

## Critical Rules
- **Be honest about confidence** (0.0-1.0). If the evidence is thin, say so.
- **Never diagnose or label.** You are not a clinician.
- **Frame observations as possibilities, not truths.** Use tentative language.
- **Prioritize the user's own words and framing.** Don't overwrite their experience with yours.
- **Suggest, don't prescribe.** You are a mirror, not a map.

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "patterns": ["pattern description 1", "pattern description 2"],
  "insights": ["insight 1", "insight 2"],
  "questions": ["question 1?", "question 2?"],
  "summary": "brief compassionate synthesis",
  "confidence": 0.7,
  "type": "insight"
}

Set "type" to the most prominent aspect: "pattern", "insight", "question", or "summary".`;
}

function buildPeriodicReflectionPrompt(params: {
  conversations: Array<{ title: string | null; messages: Array<{ role: string; content: string }> }>;
  memories: Array<Memory & { similarity?: number }>;
  period: "week" | "month";
}): string {
  const conversationSummaries = params.conversations
    .map((c) => {
      const preview = c.messages
        .slice(0, 6)
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 200)}`)
        .join("\n");
      return `### ${c.title ?? "Untitled"}\n${preview}${c.messages.length > 6 ? "\n... (truncated)" : ""}`;
    })
    .join("\n\n---\n\n");

  const memoryText =
    params.memories.length > 0
      ? params.memories.map((m, i) => `${i + 1}. ${m.content}`).join("\n")
      : "(no memories)";

  return `You are the reflective core of Healer-AI. Generate a ${params.period}ly reflection that helps this person see the bigger picture of their journey.

## Conversations This ${params.period === "week" ? "Week" : "Month"}
${conversationSummaries}

## Key Memories
${memoryText}

## Instructions
Synthesize themes, growth edges, challenges, and shifts across all these conversations. Identify:

1. **Patterns** — broader themes spanning multiple conversations
2. **Insights** — what might this person be learning or on the verge of understanding?
3. **Questions** — 3-5 deep, reflective questions for the ${params.period} ahead
4. **Summary** — a warm, honest synthesis of the ${params.period} (3-5 sentences)

## Critical Rules
- Be honest about confidence (0.0-1.0)
- Never diagnose or label
- Frame observations as possibilities
- Prioritize the person's own words
- Suggest, don't prescribe

Return ONLY a JSON object:
{
  "patterns": ["..."],
  "insights": ["..."],
  "questions": ["...?"],
  "summary": "...",
  "confidence": 0.7,
  "type": "summary"
}`;
}

function buildMemoryExtractionPrompt(params: {
  messages: Array<{ role: string; content: string }>;
}): string {
  const conversationText = params.messages
    .map((m) => `${m.role === "user" ? "User" : "Healer-AI"}: ${m.content}`)
    .join("\n\n");

  return `You are the memory extraction layer of Healer-AI. Read this conversation and extract facts, preferences, experiences, relationships, and values that are worth remembering about this person for future conversations.

## Conversation
${conversationText}

## What to extract
- **Facts** — concrete information the person shared (job, family, location, events)
- **Preferences** — likes, dislikes, what matters to them
- **Experiences** — meaningful events, challenges, achievements they described
- **Relationships** — people they mentioned and what those relationships mean
- **Values** — principles, beliefs, what they care about deeply
- **Emotional patterns** — recurring emotional states or triggers they described

## Rules
- Extract only what the person explicitly shared or strongly implied
- Write each memory as a standalone statement in third person ("The user...")
- Be concise — one sentence per memory
- Include an importance score (0.0-1.0) based on how central this seems to the person's identity/wellbeing
- If nothing meaningful to extract, return an empty array

Return ONLY a JSON array (no markdown, no extra text):
[
  { "content": "The user works as a...", "importance": 0.8 },
  { "content": "The user values...", "importance": 0.9 }
]`;
}

// ── helpers ──────────────────────────────────────────────────────

function parseJsonResponse<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return JSON.parse(cleaned) as T;
}

// ── main exports ─────────────────────────────────────────────────

export async function generateReflection(params: {
  userId: string;
  conversationId: string;
}): Promise<Reflection> {
  const db = getDb();

  // 1. Load all messages from this conversation
  const messages = await db<Array<{ role: string; content: string }>>`
    SELECT role, content FROM messages
    WHERE conversation_id = ${params.conversationId}
    ORDER BY created_at ASC`;

  if (messages.length === 0) {
    throw new Error("Conversation has no messages to reflect on");
  }

  // 2. Retrieve top 10 relevant memories for this user
  let relevantMemories: Array<Memory & { similarity?: number }> = [];
  try {
    const userMessages = messages.filter((m) => m.role === "user");
    const query = userMessages.map((m) => m.content).join(" ").slice(0, 2000);
    const memoryResults = await retrieveMemories({
      userId: params.userId,
      query: query || "general life context",
      limit: 10,
      threshold: 0.6,
    });
    relevantMemories = memoryResults;
  } catch {
    // Non-fatal: proceed without memories
  }

  // 3. Call GPT-4o-mini with reflection prompt
  const prompt = buildReflectionPrompt({
    messages,
    memories: relevantMemories,
  });

  const response = await getAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: "You are a structured reflection engine. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("NIM returned empty reflection response");

  let parsed: {
    patterns: string[];
    insights: string[];
    questions: string[];
    summary: string;
    confidence: number;
    type: string;
  };
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    throw new Error(`Failed to parse reflection JSON: ${raw.slice(0, 200)}`);
  }

  // 4. Validate and normalize
  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
  const type = (["pattern", "insight", "question", "summary"].includes(parsed.type)
    ? parsed.type
    : "insight") as ReflectionType;

  const content = JSON.stringify({
    patterns: parsed.patterns ?? [],
    insights: parsed.insights ?? [],
    questions: parsed.questions ?? [],
    summary: parsed.summary ?? "",
  });

  // 5. Collect related memory IDs
  const relatedMemoryIds = relevantMemories.map((m) => m.id);

  // 6. Store in reflections table
  const [reflection] = await db<Reflection[]>`
    INSERT INTO reflections (user_id, content, type, confidence, related_memory_ids)
    VALUES (${params.userId}, ${content}, ${type}, ${confidence}, ${db(relatedMemoryIds)})
    RETURNING id, user_id as "userId", content, type, confidence,
      related_memory_ids as "relatedMemoryIds",
      created_at as "createdAt", updated_at as "updatedAt"`;

  if (!reflection) throw new Error("Reflection insert returned no row");
  return reflection;
}

export async function getReflections(params: {
  userId: string;
  type?: ReflectionType;
  limit?: number;
  offset?: number;
}): Promise<Reflection[]> {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  if (params.type) {
    return await db<Reflection[]>`
      SELECT id, user_id as "userId", content, type, confidence,
        related_memory_ids as "relatedMemoryIds",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM reflections
      WHERE user_id = ${params.userId} AND type = ${params.type}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}`;
  }

  return await db<Reflection[]>`
    SELECT id, user_id as "userId", content, type, confidence,
      related_memory_ids as "relatedMemoryIds",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reflections
    WHERE user_id = ${params.userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function getReflection(
  id: string,
): Promise<Reflection & { relatedMemories: Memory[] }> {
  const db = getDb();

  const [reflection] = await db<Reflection[]>`
    SELECT id, user_id as "userId", content, type, confidence,
      related_memory_ids as "relatedMemoryIds",
      created_at as "createdAt", updated_at as "updatedAt"
    FROM reflections WHERE id = ${id}`;

  if (!reflection) throw new Error("Reflection not found");

  let relatedMemories: Memory[] = [];
  if (reflection.relatedMemoryIds && reflection.relatedMemoryIds.length > 0) {
    relatedMemories = await db<Memory[]>`
      SELECT id, user_id as "userId", content, embedding, source, source_id as "sourceId",
        importance, decay_score as "decayScore", last_recalled_at as "lastRecalledAt",
        recall_count as "recallCount", created_at as "createdAt", updated_at as "updatedAt"
      FROM memories WHERE id IN ${db(reflection.relatedMemoryIds)}`;
  }

  return { ...reflection, relatedMemories };
}

export async function generatePeriodicReflection(params: {
  userId: string;
  period: "week" | "month";
}): Promise<Reflection> {
  const db = getDb();

  const interval = params.period === "week" ? "7 days" : "30 days";

  const convRows = await db<Array<{ id: string; title: string | null }>>`
    SELECT id, title FROM conversations
    WHERE user_id = ${params.userId}
      AND created_at >= now() - INTERVAL '${db.unsafe(interval)}'
    ORDER BY created_at DESC
    LIMIT 20`;

  const conversations = await Promise.all(
    convRows.map(async (c) => {
      const msgs = await db<Array<{ role: string; content: string }>>`
        SELECT role, content FROM messages
        WHERE conversation_id = ${c.id}
        ORDER BY created_at ASC
        LIMIT 30`;
      return { title: c.title, messages: msgs };
    }),
  );

  let memories: Array<Memory & { similarity?: number }> = [];
  try {
    memories = await retrieveMemories({
      userId: params.userId,
      query: `${params.period}ly reflection synthesis`,
      limit: 15,
      threshold: 0.5,
    });
  } catch {
    // Non-fatal
  }

  const prompt = buildPeriodicReflectionPrompt({
    conversations,
    memories,
    period: params.period,
  });

  const response = await getAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: "You are a structured reflection engine. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("NIM returned empty periodic reflection response");

  let parsed: {
    patterns: string[];
    insights: string[];
    questions: string[];
    summary: string;
    confidence: number;
  };
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    throw new Error(`Failed to parse periodic reflection JSON: ${raw.slice(0, 200)}`);
  }

  const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5));
  const content = JSON.stringify({
    patterns: parsed.patterns ?? [],
    insights: parsed.insights ?? [],
    questions: parsed.questions ?? [],
    summary: parsed.summary ?? "",
  });

  const relatedMemoryIds = memories.map((m) => m.id);

  const [reflection] = await db<Reflection[]>`
    INSERT INTO reflections (user_id, content, type, confidence, related_memory_ids)
    VALUES (${params.userId}, ${content}, 'summary', ${confidence}, ${db(relatedMemoryIds)})
    RETURNING id, user_id as "userId", content, type, confidence,
      related_memory_ids as "relatedMemoryIds",
      created_at as "createdAt", updated_at as "updatedAt"`;

  if (!reflection) throw new Error("Periodic reflection insert returned no row");
  return reflection;
}

export async function extractMemories(params: {
  userId: string;
  conversationId: string;
}): Promise<Memory[]> {
  const db = getDb();

  const messages = await db<Array<{ role: string; content: string }>>`
    SELECT role, content FROM messages
    WHERE conversation_id = ${params.conversationId}
    ORDER BY created_at ASC`;

  if (messages.length === 0) return [];

  const prompt = buildMemoryExtractionPrompt({ messages });

  const response = await getAI().chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: "You are a memory extraction engine. Always respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return [];

  let extracted: Array<{ content: string; importance: number }>;
  try {
    extracted = parseJsonResponse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(extracted) || extracted.length === 0) return [];

  const stored: Memory[] = [];
  for (const item of extracted) {
    if (!item.content || typeof item.content !== "string") continue;
    try {
      const memory = await storeMemory({
        userId: params.userId,
        content: item.content,
        source: "conversation",
        sourceId: params.conversationId,
        importance: Math.min(1, Math.max(0, Number(item.importance) || 0.5)),
      });
      stored.push(memory);
    } catch {
      // Skip individual failures — non-fatal
    }
  }

  return stored;
}
