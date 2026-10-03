"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Disclaimer } from "@/components/Disclaimer";
import { DocumentDef, fetchDocuments, sectionProgress } from "@/lib/documents";
import { deleteDraft, DraftSummary, formatUpdated, listDrafts, partiesLabel, toDraft } from "@/lib/drafts";

export default function DocumentsPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

/** The user's saved drafts, newest first, with links to reopen or delete them. */
function Dashboard() {
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [documents, setDocuments] = useState<DocumentDef[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listDrafts(), fetchDocuments()])
      .then(([drafts, documents]) => {
        setDrafts(drafts);
        setDocuments(documents);
      })
      .catch(() => setError("Could not load your documents. Please refresh the page."));
  }, []);

  async function remove(id: number) {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDraft(id);
      setDrafts((current) => current?.filter((d) => d.id !== id) ?? null);
    } catch {
      setError("Could not delete the document. Please try again.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy">My documents</h1>
          <p className="mt-1 text-sm text-muted">Pick up where you left off, or start a new agreement.</p>
        </div>
        <Link href="/draft/" className="btn-primary">
          New document
        </Link>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {drafts?.length === 0 && (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-navy">No documents yet</h2>
          <p className="max-w-sm text-sm text-muted">
            Tell the assistant what you need and it will draft the agreement with you, one question at a time.
          </p>
          <Link href="/draft/" className="btn-primary mt-2">
            Draft your first document
          </Link>
        </div>
      )}
      {drafts && drafts.length > 0 && (
        <ul className="card divide-y divide-slate-200">
          {drafts.map((summary) => (
            <DraftRow key={summary.id} summary={summary} documents={documents} onDelete={() => remove(summary.id)} />
          ))}
        </ul>
      )}
      <Disclaimer />
    </main>
  );
}

function DraftRow({ summary, documents, onDelete }: { summary: DraftSummary; documents: DocumentDef[]; onDelete: () => void }) {
  const draft = toDraft(summary);
  const definition = documents.find((d) => d.id === summary.documentId);
  const progress = definition && sectionProgress(definition, draft);

  return (
    <li className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-slate-50">
      <Link href={`/draft/?id=${summary.id}`} className="min-w-0 flex-1">
        <p className="truncate font-medium text-navy">{definition?.name ?? "Untitled draft"}</p>
        <p className="truncate text-sm text-muted">
          {partiesLabel(draft)} · Updated {formatUpdated(summary.updatedAt)}
        </p>
      </Link>
      {progress && (
        <div className="w-36 text-xs text-muted">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-primary" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-1">
            {progress.done} of {progress.total} sections
          </p>
        </div>
      )}
      <button type="button" onClick={onDelete} className="text-sm font-medium text-muted hover:text-red-600">
        Delete
      </button>
    </li>
  );
}
