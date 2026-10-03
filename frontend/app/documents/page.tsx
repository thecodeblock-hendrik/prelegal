"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([listDrafts(), fetchDocuments()])
      .then(([drafts, documents]) => {
        setDrafts(drafts);
        setDocuments(documents);
      })
      .catch(() => setError("Could not load your documents. Please refresh the page."));
  }, []);

  async function remove(id: number) {
    setPendingDelete(null);
    try {
      await deleteDraft(id);
      setDrafts((current) => current?.filter((d) => d.id !== id) ?? null);
    } catch {
      setError("Could not delete the document. Please try again.");
    }
  }

  return (
    <main className="page max-w-narrow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-title font-semibold text-primary">My documents</h1>
          <p className="mt-1 text-muted">Pick up where you left off, or start a new agreement.</p>
        </div>
        <Link href="/draft/" className="btn-primary">
          New document
        </Link>
      </div>
      {error && (
        <p role="alert" className="alert-error">
          {error}
        </p>
      )}
      {drafts?.length === 0 && (
        <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
          <h2 className="text-heading font-semibold text-primary">No documents yet</h2>
          <p className="max-w-sm text-muted">
            Tell the assistant what you need and it will draft the agreement with you, one question at a time.
          </p>
          <Link href="/draft/" className="btn-primary mt-2">
            Draft your first document
          </Link>
        </div>
      )}
      {drafts && drafts.length > 0 && (
        <ul className="card divide-y divide-border">
          {drafts.map((summary) => (
            <DraftRow key={summary.id} summary={summary} documents={documents} onDelete={() => setPendingDelete(summary.id)} />
          ))}
        </ul>
      )}
      <Disclaimer />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this document?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => remove(pendingDelete!)}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}

function DraftRow({ summary, documents, onDelete }: { summary: DraftSummary; documents: DocumentDef[]; onDelete: () => void }) {
  const draft = toDraft(summary);
  const definition = documents.find((d) => d.id === summary.documentId);
  const progress = definition && sectionProgress(definition, draft);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-background sm:px-5">
      <Link href={`/draft/?id=${summary.id}`} className="group w-full min-w-0 rounded-sm sm:w-auto sm:flex-1">
        <p className="truncate font-medium text-primary group-hover:text-accent group-hover:underline group-active:text-primary">{definition?.name ?? "Untitled draft"}</p>
        <p className="truncate text-caption text-muted">
          {partiesLabel(draft)} · Updated {formatUpdated(summary.updatedAt)}
        </p>
      </Link>
      {progress && (
        <div className="flex-1 text-caption text-muted sm:w-36 sm:flex-none">
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-secondary" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="mt-1 tabular-nums">
            {progress.done} of {progress.total} sections
          </p>
        </div>
      )}
      <button type="button" onClick={onDelete} className="btn-ghost ml-auto min-h-8 px-3 py-1 text-error">
        Delete
      </button>
    </li>
  );
}
