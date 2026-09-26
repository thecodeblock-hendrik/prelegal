import { NdaData, Party } from "./nda";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Nullable<T> = { [K in keyof T]: T[K] | null };

/** Field values the AI learned this turn; null means unchanged. */
export type NdaUpdate = Nullable<Omit<NdaData, "party1" | "party2">> & {
  party1: Nullable<Party> | null;
  party2: Nullable<Party> | null;
};

export const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you draft a Mutual Non-Disclosure Agreement. To start, which two companies are entering into the NDA, and what is the purpose of sharing confidential information?",
};

const withoutNulls = <T extends object>(update: Nullable<T>): Partial<T> =>
  Object.fromEntries(Object.entries(update).filter(([, v]) => v !== null)) as Partial<T>;

/** Merges the non-null values of an AI update into the current NDA data. */
export function applyUpdate(data: NdaData, update: NdaUpdate): NdaData {
  const { party1, party2, ...rest } = update;
  return {
    ...data,
    ...withoutNulls(rest),
    party1: party1 ? { ...data.party1, ...withoutNulls(party1) } : data.party1,
    party2: party2 ? { ...data.party2, ...withoutNulls(party2) } : data.party2,
  };
}

/** Sends the conversation and current values to the backend and returns its reply. */
export async function sendChat(
  messages: ChatMessage[],
  fields: NdaData,
): Promise<{ reply: string; fields: NdaUpdate }> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields }),
  });
  if (!response.ok) throw new Error(`Chat request failed: ${response.status}`);
  return response.json();
}
