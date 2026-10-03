"use client";

import { useEffect, useRef, useState } from "react";
import { applyUpdate, ChatMessage, sendChat } from "@/lib/chat";
import { Draft } from "@/lib/documents";

interface Props {
  draft: Draft;
  initialMessages: ChatMessage[];
  /** Called after each successful reply; input stays locked until it resolves so saves never overlap. */
  onTurn: (messages: ChatMessage[], draft: Draft) => Promise<void>;
}

/** Freeform AI chat that picks the document and fills it in as the user answers. */
export function DocumentChat({ draft, initialMessages, onTurn }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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
      const all: ChatMessage[] = [...history, { role: "assistant", content: result.reply }];
      setMessages(all);
      await onTurn(all, applyUpdate(draft, result));
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
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              m.role === "user" ? "ml-auto rounded-br-sm bg-primary text-white" : "rounded-bl-sm bg-slate-100 text-slate-800"
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
          className="input flex-1"
          placeholder="Type your answer..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="btn-submit"
        >
          Send
        </button>
      </form>
    </div>
  );
}
