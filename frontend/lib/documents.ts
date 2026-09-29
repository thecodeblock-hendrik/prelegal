/** A supported legal document, as served by GET /api/documents. */
export interface DocumentDef {
  id: string;
  name: string;
  description: string;
  parties: [string, string];
  variables: string[];
  body: string;
}

export interface Party {
  name: string;
  title: string;
  company: string;
  noticeAddress: string;
}

/** What the user has filled in so far: the chosen document, its variable values and both parties. */
export interface Draft {
  documentId: string | null;
  variables: Record<string, string>;
  party1: Party;
  party2: Party;
}

const emptyParty: Party = { name: "", title: "", company: "", noticeAddress: "" };

export function emptyDraft(): Draft {
  return { documentId: null, variables: {}, party1: { ...emptyParty }, party2: { ...emptyParty } };
}

export async function fetchDocuments(): Promise<DocumentDef[]> {
  const response = await fetch("/api/documents");
  if (!response.ok) throw new Error(`Documents request failed: ${response.status}`);
  return response.json();
}

export const BLANK = "________";

export function variableValue(draft: Draft, name: string): string {
  return draft.variables[name]?.trim() || BLANK;
}

/** The document is ready to download once chosen and both party company names are known. */
export function isComplete(draft: Draft): boolean {
  return draft.documentId !== null && [draft.party1.company, draft.party2.company].every((c) => c.trim() !== "");
}

/** Turns the templates' spans into markdown: bold clause headings, italic variables, other tags dropped. */
export function highlightTerms(markdown: string): string {
  return markdown
    .replace(/<span class="header_\d"[^>]*>([^<]+)<\/span>/g, "**$1**")
    .replace(/<span class="[a-z]+_link">([^<]+)<\/span>/g, "*$1*")
    .replace(/<\/?span[^>]*>/g, "");
}

/** Strips the markdown syntax and HTML tags the templates use, for PDF output. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}
