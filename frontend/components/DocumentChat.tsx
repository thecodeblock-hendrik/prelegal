"use client";

import { useEffect, useRef, useState } from "react";
import { applyUpdate, ChatMessage, GREETING, sendChat } from "@/lib/chat";
import { Draft } from "@/lib/documents";

/** Freeform AI chat that picks the document and fills it in as the user answers. */
export function DocumentChat({ draft, onChange }: { draft: Draft; onChange: (d: Draft) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    const history: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setPending(true);
    setError("");
    try {
      const result = await sendChat(history, draft);
      setMessages([...history, { role: "assistant", content: result.reply }]);
      onChange(applyUpdate(draft, result));
    } catch {
      setError("Something went wrong. Please try again.");
      setMessages(messages);
      setInput(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex h-[32rem] flex-col lg:h-full">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((m, i) => (
          <p
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-primary text-white" : "bg-zinc-100 text-zinc-900"
            }`}
          >
            {m.content}
          </p>
        ))}
        {pending && <p className="text-sm text-muted">Thinking...</p>}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          aria-label="Message"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none"
          placeholder="Type your answer..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
