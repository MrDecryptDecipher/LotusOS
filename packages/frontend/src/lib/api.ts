export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  mood: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const USER_ID = "00000000-0000-0000-0000-000000000001";

export async function createConversation(): Promise<Conversation> {
  const res = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to create conversation");
  }
  return res.json() as Promise<Conversation>;
}

export async function getConversations(): Promise<Conversation[]> {
  const res = await fetch(`/api/conversations?userId=${USER_ID}`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json() as Promise<Conversation[]>;
}

export async function getConversation(
  id: string,
): Promise<ConversationWithMessages> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch conversation");
  return res.json() as Promise<ConversationWithMessages>;
}

export function streamMessage(
  conversationId: string,
  message: string,
  onToken: (token: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        onError(
          new Error(
            (err as { error?: string }).error ??
              `Server error: ${response.status}`,
          ),
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError(new Error("No response body"));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              token?: string;
              error?: string;
            };
            if (parsed.token !== undefined) {
              onToken(parsed.token);
            } else if (parsed.error) {
              onError(new Error(parsed.error));
              return;
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }
    })
    .catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onError(err instanceof Error ? err : new Error("Stream failed"));
    });

  return controller;
}
