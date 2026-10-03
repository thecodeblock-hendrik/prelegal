import { api } from "./api";
import { ChatMessage, toPayload } from "./chat";
import { Draft } from "./documents";

/** A saved draft as listed on the dashboard. */
export interface DraftSummary {
  id: number;
  documentId: string | null;
  fields: Omit<Draft, "documentId">;
  updatedAt: string;
}

export interface SavedDraft extends DraftSummary {
  messages: ChatMessage[];
}

export const listDrafts = () => api<DraftSummary[]>("/api/drafts");
export const getDraft = (id: number) => api<SavedDraft>(`/api/drafts/${id}`);
export const deleteDraft = (id: number) => api<void>(`/api/drafts/${id}`, "DELETE");

/** Creates the draft when it has no id yet, otherwise replaces it. */
export const saveDraft = (id: number | null, messages: ChatMessage[], draft: Draft) =>
  api<SavedDraft>(id === null ? "/api/drafts" : `/api/drafts/${id}`, id === null ? "POST" : "PUT", toPayload(messages, draft));

/** The editable draft held in a saved one. */
export function toDraft(saved: DraftSummary): Draft {
  return { documentId: saved.documentId, ...saved.fields };
}

/** "Acme and Globex", one company, or a placeholder before either is known. */
export function partiesLabel(draft: Draft): string {
  const companies = [draft.party1.company, draft.party2.company].filter((c) => c.trim());
  return companies.join(" and ") || "Parties not yet named";
}

/** A saved time such as "Oct 3, 2026, 9:30 AM". */
export function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}
