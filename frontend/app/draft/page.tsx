"use client";

import { useEffect, useState } from "react";
import { DocumentChat } from "@/components/DocumentChat";
import { DocumentPreview } from "@/components/DocumentPreview";
import { DocumentDef, Draft, emptyDraft, fetchDocuments, isComplete } from "@/lib/documents";
import { generateDocumentPdf } from "@/lib/pdf";

export default function DraftPage() {
  const [documents, setDocuments] = useState<DocumentDef[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const document = documents.find((d) => d.id === draft.documentId);
  const complete = isComplete(draft) && document !== undefined;

  useEffect(() => {
    fetchDocuments().then(setDocuments);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-900">
          Prelegal &middot; {document ? document.name : "Document Creator"}
        </h1>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section className="flex flex-col gap-4 rounded-lg bg-white p-5 shadow lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:self-start">
          <div className="min-h-0 flex-1">
            <DocumentChat draft={draft} onChange={setDraft} />
          </div>
          <button
            type="button"
            disabled={!complete}
            onClick={() => document && generateDocumentPdf(document, draft).save(`${document.name}.pdf`)}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Download PDF
          </button>
          {!complete && <p className="text-xs text-zinc-500">Download unlocks once a document is chosen and both party company names are filled in.</p>}
        </section>
        <section aria-label="Document preview">
          <DocumentPreview document={document} documents={documents} draft={draft} />
        </section>
      </main>
    </div>
  );
}
