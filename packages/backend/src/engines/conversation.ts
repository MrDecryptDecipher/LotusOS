import { getDb } from "../db.js";
import { getOpenAI } from "../lib/openai.js";
import { retrieveMemories } from "./memory.js";
import { safetyCheck } from "./safety.js";

const SYSTEM_PROMPT = `You are Healer-AI, an emotionally intelligent companion built on LotusOS. You help people understand themselves through reflection, not advice.

Core principles:
- You are here to listen deeply and help people find their own answers
- Your role is companion, not clinician — never diagnose or claim expertise you don't have
- Reflection over direction: ask questions that illuminate, don't tell people what to do

Safety rules:
- Never diagnose medical, psychological, or mental health conditions
- Never suggest you can replace therapists, doctors, or counselors
- When someone is in distress, acknowledge it sincerely and gently encourage professional support
- Remember you are an AI — be honest about your limits

Reflection-first approach:
- Validate the person's emotions before exploring them further
- Ask thoughtful, open-ended questions that invite deeper self-understanding
- Help identify patterns in thoughts, feelings, and behaviors without jumping to conclusions
- Guide toward insight rather than handing out answers
- Mirror back what you hear with care and curiosity`;

function buildSystemPrompt(memoryContext: string): string {
  if (memoryContext) {
    return (
      SYSTEM_PROMPT +
      `\n\nRelevant context from past conversations with this person:\n${memoryContext}\n\nUse this context to deepen your understanding, but don't assume it tells the whole story — people change, and context is always partial.`
    );
  }
  return SYSTEM_PROMPT;
}

export async function streamChat(params: {
  userId: string;
  conversationId: string;
  message: string;
  onToken: (token: string) => void;
  onComplete: (fullResponse: string) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const { userId, conversationId, message, onToken, onComplete, onError } = params;
  const db = getDb();

  try {
    // 1. Fetch conversation history (last 20 messages, in chronological order)
    const historyRows = await db`
      SELECT role, content FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at DESC LIMIT 20`;
    const history = [...historyRows].reverse(); // oldest first

    // 2. Retrieve relevant memories
    let memoryContext = "";
    try {
      const memories = await retrieveMemories({
        userId,
        query: message,
        limit: 5,
        threshold: 0.7,
      });
      if (memories.length > 0) {
        memoryContext = memories
          .map((m, i) => `${i + 1}. ${m.content}`)
          .join("\n");
      }
    } catch {
      // Non-fatal: continue without memory context
    }

    // 3. Build system prompt with memories
    const systemContent = buildSystemPrompt(memoryContext);

    // 4. Assemble message array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemContent },
      ...history.map((m) => ({
        role: m.role as string,
        content: m.content as string,
      })),
      { role: "user", content: message },
    ];

    // 5. Stream from OpenAI
    const stream = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages as never,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        onToken(delta);
      }
    }

    // 6. Safety check before saving
    let finalResponse = fullResponse;
    try {
      const safety = await safetyCheck({
        userId,
        userMessage: message,
        assistantResponse: fullResponse,
      });
      if (safety.flags.includes("crisis") && safety.reason) {
        finalResponse = fullResponse + "\n\n" + safety.reason;
      }
    } catch {
      // Non-fatal: proceed with original response
    }

    // 7. Save both messages
    await db`
      INSERT INTO messages ${db([
        { conversation_id: conversationId, role: "user", content: message },
        { conversation_id: conversationId, role: "assistant", content: finalResponse },
      ])}`;

    // Update conversation timestamp
    await db`
      UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}`;

    onComplete(finalResponse);
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function generateTitle(params: {
  firstMessage: string;
}): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Generate a concise 2-5 word title for a conversation that begins with this message. Return ONLY the title — no quotes, no punctuation, no extra text.",
      },
      { role: "user", content: params.firstMessage },
    ],
    max_tokens: 20,
    temperature: 0.3,
  });
  return (
    response.choices[0]?.message?.content?.trim() || "New Conversation"
  );
}
