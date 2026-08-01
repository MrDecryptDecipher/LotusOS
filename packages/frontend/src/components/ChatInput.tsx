import { useRef, useEffect, type KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  });

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function send() {
    const el = textareaRef.current;
    if (!el) return;
    const value = el.value.trim();
    if (!value || disabled) return;
    onSend(value);
    el.value = "";
    el.style.height = "auto";
  }

  return (
    <div className="border-t border-[#dbe7df] bg-[#fbfcf8] px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-end gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          disabled={disabled}
          placeholder={
            disabled ? "Healer-AI is responding…" : "What's on your mind?"
          }
          onKeyDown={handleKeyDown}
          className="min-h-[44px] max-h-[200px] flex-1 resize-none rounded-2xl border border-[#dbe7df] bg-white px-4 py-2.5 text-sm text-[#183b38] placeholder-[#b9cec4] outline-none transition focus:border-[#8eb5a4] focus:ring-2 focus:ring-[#d7e9dc]/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled}
          className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-[#255b51] text-white transition hover:bg-[#1e4d44] disabled:opacity-40"
          aria-label="Send message"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
