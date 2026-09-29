import { Draft, Party } from "./documents";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

/** What the AI learned this turn; null means unchanged. */
export interface ChatUpdate {
  documentId: string | null;
  variables: { name: string; value: string }[];
  party1: Nullable<Party> | null;
  party2: Nullable<Party> | null;
}

export const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you draft a legal agreement. What kind of agreement do you need, and who is it between?",
};

const withoutNulls = <T extends object>(update: Nullable<T>): Partial<T> =>
  Object.fromEntries(Object.entries(update).filter(([, v]) => v !== null)) as Partial<T>;

/** Merges the non-null values of an AI update into the current draft. */
export function applyUpdate(draft: Draft, update: ChatUpdate): Draft {
  return {
    documentId: update.documentId ?? draft.documentId,
    variables: { ...draft.variables, ...Object.fromEntries(update.variables.map((v) => [v.name, v.value])) },
    party1: update.party1 ? { ...draft.party1, ...withoutNulls(update.party1) } : draft.party1,
    party2: update.party2 ? { ...draft.party2, ...withoutNulls(update.party2) } : draft.party2,
  };
}

/** Sends the conversation and current draft to the backend and returns its reply. */
export async function sendChat(
  messages: ChatMessage[],
  draft: Draft,
): Promise<ChatUpdate & { reply: string }> {
  const { documentId, ...fields } = draft;
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, documentId, fields }),
  });
  if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
  return response.json();
}
