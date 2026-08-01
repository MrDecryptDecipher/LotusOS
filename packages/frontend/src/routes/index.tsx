import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import type { Conversation, Message } from "~/lib/api";
import {
  createConversation,
  getConversations,
  getConversation,
  streamMessage,
} from "~/lib/api";
import { ChatMessage } from "~/components/ChatMessage";
import { ChatInput } from "~/components/ChatInput";
import { ConversationSidebar } from "~/components/ConversationSidebar";
import { ConversationStarter } from "~/components/ConversationStarter";

export const Route = createFileRoute("/")({ component: ChatPage });

function ChatPage() {
  const navigate = useNavigate();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const convIdFromUrl = searchParams.get("conversation");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    convIdFromUrl,
  );
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Load conversations list
  useEffect(() => {
    setLoadingList(true);
    getConversations()
      .then(setConversations)
      .catch(() => setError("Failed to load conversations"))
      .finally(() => setLoadingList(false));
  }, []);

  // Load active conversation messages
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    setLoadingConv(true);
    setError(null);
    getConversation(activeConvId)
      .then((conv) => setMessages(conv.messages ?? []))
      .catch(() => {
        setError("Failed to load conversation");
        setMessages([]);
      })
      .finally(() => setLoadingConv(false));

    // Sync URL
    const params = new URLSearchParams(window.location.search);
    params.set("conversation", activeConvId);
    navigate({
      to: "/",
      search: { conversation: activeConvId },
      replace: true,
    } as never);
  }, [activeConvId, navigate]);

  async function handleNewConversation() {
    setError(null);
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch {
      setError("Failed to create conversation");
    }
  }

  function handleSelectConversation(id: string) {
    if (id === activeConvId) return;
    // Abort any active stream
    streamAbortRef.current?.abort();
    setStreaming(false);
    setStreamingContent("");
    setActiveConvId(id);
  }

  async function handleSend(text: string) {
    if (streaming) return;
    setError(null);

    let convId = activeConvId;

    // Auto-create conversation if none active
    if (!convId) {
      try {
        const conv = await createConversation();
        setConversations((prev) => [conv, ...prev]);
        convId = conv.id;
        setActiveConvId(convId);
      } catch {
        setError("Failed to create conversation");
        return;
      }
    }

    // Add user message optimistically
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: convId,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Start streaming
    setStreaming(true);
    setStreamingContent("");

    const controller = streamMessage(
      convId,
      text,
      // onToken
      (token) => {
        setStreamingContent((prev) => prev + token);
      },
      // onComplete
      () => {
        setStreamingContent((prev) => {
          // Add assistant message
          const assistantMsg: Message = {
            id: crypto.randomUUID(),
            conversationId: convId,
            role: "assistant",
            content: prev,
            createdAt: new Date().toISOString(),
          };
          setMessages((msgs) => [...msgs, assistantMsg]);

          // Refresh conversations list to get updated title
          getConversations()
            .then(setConversations)
            .catch(() => {});

          return "";
        });
        setStreaming(false);
        streamAbortRef.current = null;
      },
      // onError
      (err) => {
        setError(err.message);
        // Save what we got so far as the assistant message
        setStreamingContent((prev) => {
          if (prev) {
            const partialMsg: Message = {
              id: crypto.randomUUID(),
              conversationId: convId,
              role: "assistant",
              content: prev + "\n\n*(Response interrupted)*",
              createdAt: new Date().toISOString(),
            };
            setMessages((msgs) => [...msgs, partialMsg]);
          }
          return "";
        });
        setStreaming(false);
        streamAbortRef.current = null;
      },
    );

    streamAbortRef.current = controller;
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  const hasContent = messages.length > 0 || streaming;

  return (
    <div className="flex h-screen bg-[#fbfcf8]">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        loading={loadingList}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 border-b border-[#dbe7df] bg-[#fbfcf8] px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="grid h-8 w-8 place-items-center rounded-full text-[#598879] hover:bg-[#eef4f0] transition"
            aria-label="Open conversations"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <a
            href="/about"
            className="flex items-center gap-1.5 text-sm font-semibold tracking-[-0.02em] text-[#183b38]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-[#b5d4c4] text-[10px] text-[#183b38]">
              ✦
            </span>
            healer<span className="font-normal text-[#73968a]">.ai</span>
          </a>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="flex flex-1 items-center justify-center py-16">
              <div className="flex items-center gap-2 text-sm text-[#a1b8ae]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#b5d4c4]" />
                Loading conversation…
              </div>
            </div>
          ) : !hasContent ? (
            <ConversationStarter onSelect={handleSend} />
          ) : (
            <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Streaming message */}
              {streaming && streamingContent && (
                <ChatMessage
                  message={{
                    id: "streaming",
                    conversationId: activeConvId ?? "",
                    role: "assistant",
                    content: streamingContent,
                    createdAt: new Date().toISOString(),
                  }}
                  isStreaming
                />
              )}

              {/* Streaming indicator — empty */}
              {streaming && !streamingContent && (
                <div className="flex items-center gap-2 pl-11 text-sm text-[#a1b8ae]">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b5d4c4] [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b5d4c4] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#b5d4c4] [animation-delay:300ms]" />
                  </span>
                  <span>Healer-AI is reflecting…</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="mx-auto max-w-2xl px-4 pb-4">
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600 transition"
                  aria-label="Dismiss"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
