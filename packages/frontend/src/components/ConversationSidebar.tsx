import type { Conversation } from "~/lib/api";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  loading: boolean;
  open: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  loading,
  open,
  onClose,
}: ConversationSidebarProps) {
  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#f6f8f3] border-r border-[#dbe7df]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#dbe7df]">
        <a
          href="/about"
          className="flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-[#183b38] hover:text-[#255b51]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#b5d4c4] text-xs text-[#183b38]">
            ✦
          </span>
          healer<span className="font-normal text-[#73968a]">.ai</span>
        </a>
        {/* Close button — mobile only */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden grid h-8 w-8 place-items-center rounded-full text-[#598879] hover:bg-[#e0eee5] transition"
          aria-label="Close sidebar"
        >
          <svg
            width="16"
            height="16"
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

      {/* New Conversation */}
      <div className="px-3 py-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-[#dbe7df] bg-white px-4 py-2.5 text-sm font-medium text-[#255b51] transition hover:bg-[#eef4f0] hover:border-[#8eb5a4]"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Conversation
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-3">
        {loading ? (
          <div className="space-y-2 px-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-[#e5efe9]"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-[#a1b8ae]">
            No conversations yet.
            <br />
            Start one above.
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(conv.id);
                    onClose();
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    conv.id === activeId
                      ? "bg-[#d7e9dc] text-[#183b38] font-medium"
                      : "text-[#52766c] hover:bg-[#eef4f0]"
                  }`}
                >
                  <div className="truncate">
                    {conv.title ?? "New conversation"}
                  </div>
                  <div className="mt-0.5 text-[10px] text-[#a1b8ae]">
                    {formatDate(conv.updatedAt)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#dbe7df] px-4 py-3">
        <p className="text-[10px] text-[#b9cec4] leading-relaxed">
          LotusOS · Reflection before advice
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile: overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
          <nav className="absolute left-0 top-0 bottom-0 w-72 shadow-xl animate-slide-in">
            {sidebarContent}
          </nav>
        </div>
      )}
    </>
  );
}
