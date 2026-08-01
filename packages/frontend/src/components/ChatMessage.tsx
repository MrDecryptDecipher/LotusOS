import type { Message } from "~/lib/api";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

/** Minimal markdown → JSX renderer for the subset we need in chat. */
function renderMarkdown(content: string): string {
  return (
    content
      // Bold: **text**
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic: *text*
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // Inline code: `text`
      .replace(/`(.+?)`/g, "<code>$1</code>")
      // Double newlines → paragraphs
      .replace(/\n\n/g, "</p><p>")
      // Single newlines → line breaks
      .replace(/\n/g, "<br>")
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`group flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${
          isUser
            ? "bg-[#b5d4c4] text-[#183b38]"
            : "bg-[#e0eee5] text-[#598879]"
        }`}
        aria-hidden="true"
      >
        {isUser ? "U" : "✦"}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#255b51] text-white rounded-tr-md"
            : "bg-[#eef4f0] text-[#234a42] rounded-tl-md"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="prose-aesthetic"
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(message.content) + (isStreaming ? '<span class="cursor-blink">▌</span>' : ""),
            }}
          />
        )}

        {/* Timestamp on hover */}
        {message.createdAt && !isStreaming && (
          <span
            className={`mt-1 block text-[10px] opacity-0 transition group-hover:opacity-60 ${
              isUser ? "text-right text-white/70" : "text-left text-[#7a9a8e]"
            }`}
          >
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  );
}
