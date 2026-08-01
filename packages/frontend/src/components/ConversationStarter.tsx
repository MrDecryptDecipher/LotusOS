const suggestions = [
  "What's weighing on my mind right now?",
  "I want to understand why I've been feeling this way lately.",
  "Help me reflect on something that happened today.",
];

interface ConversationStarterProps {
  onSelect: (prompt: string) => void;
}

export function ConversationStarter({ onSelect }: ConversationStarterProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[#d7e9dc] text-2xl text-[#598879] mb-6">
        ✦
      </div>
      <h2 className="text-xl font-medium tracking-[-0.03em] text-[#234a42]">
        What&rsquo;s on your mind today?
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#779088]">
        Take a breath. There&rsquo;s no rush, no judgment — just space to
        reflect.
      </p>

      <div className="mt-8 flex flex-col gap-2 w-full max-w-sm">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(s)}
            className="rounded-2xl border border-[#dbe7df] bg-white px-5 py-3 text-left text-sm leading-relaxed text-[#52766c] transition hover:bg-[#eef4f0] hover:border-[#8eb5a4] hover:text-[#183b38]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
