"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { DocumentChat } from "@/components/DocumentChat";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ChatMessage, GREETING } from "@/lib/chat";
import { DocumentDef, Draft, emptyDraft, fetchDocuments, isComplete, sectionProgress } from "@/lib/documents";
import { getDraft, saveDraft, toDraft } from "@/lib/drafts";
import { generateDocumentPdf } from "@/lib/pdf";

export default function DraftPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <DraftEditor />
      </Suspense>
    </AppShell>
  );
}

/** Chat and live preview for one draft; ?id=N reopens a saved draft and every reply saves it. */
function DraftEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reopenId] = useState(() => Number(searchParams.get("id")) || null);
  const [draftId, setDraftId] = useState(reopenId);
  const [documents, setDocuments] = useState<DocumentDef[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  /** The chat to start from; null while a reopened draft is loading. */
  const [messages, setMessages] = useState<ChatMessage[] | null>(reopenId ? null : [GREETING]);
  const [saveFailed, setSaveFailed] = useState(false);
  const definition = documents.find((d) => d.id === draft.documentId);
  const complete = isComplete(draft) && definition !== undefined;
  const progress = definition && sectionProgress(definition, draft);

  useEffect(() => {
    fetchDocuments().then(setDocuments);
  }, []);

  useEffect(() => {
    if (reopenId === null) return;
    getDraft(reopenId)
      .then((saved) => {
        setDraft(toDraft(saved));
        setMessages(saved.messages);
      })
      .catch(() => router.replace("/documents/"));
  }, [reopenId, router]);

  async function handleTurn(nextMessages: ChatMessage[], next: Draft) {
    setDraft(next);
    try {
      const saved = await saveDraft(draftId, nextMessages, next);
      setSaveFailed(false);
      if (draftId === null) {
        setDraftId(saved.id);
        window.history.replaceState(null, "", `/draft/?id=${saved.id}`);
      }
    } catch {
      setSaveFailed(true);
    }
  }

  if (!messages) return null;
  return (
    <main className="page max-w-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-title font-semibold text-primary">{definition ? definition.name : "New document"}</h1>
          <p className="mt-1 text-muted tabular-nums">
            {progress ? `${progress.done} of ${progress.total} sections complete` : "Describe the agreement you need to get started."}
            {draftId !== null && !saveFailed && " · Saved"}
            {saveFailed && <span className="text-error"> · Could not save your latest changes</span>}
          </p>
        </div>
        <button
          type="button"
          disabled={!complete}
          title={complete ? undefined : "Available once a document is chosen and both party companies are named"}
          onClick={() => definition && generateDocumentPdf(definition, draft).save(`${definition.name}.pdf`)}
          className="btn-secondary"
        >
          Download PDF
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section className="card flex flex-col p-4 sm:p-5 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:self-start">
          <DocumentChat draft={draft} initialMessages={messages} onTurn={handleTurn} />
        </section>
        <section aria-label="Document preview" className="space-y-4">
          <Disclaimer />
          <DocumentPreview document={definition} documents={documents} draft={draft} />
        </section>
      </div>
    </main>
  );
}
