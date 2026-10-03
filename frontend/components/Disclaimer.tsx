import { DISCLAIMER } from "@/lib/documents";

/** Notice that generated documents are drafts subject to legal review. */
export function Disclaimer() {
  return (
    <p role="note" className="rounded-lg border border-accent/40 border-l-4 border-l-accent bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <span className="font-semibold">Draft only.</span> {DISCLAIMER}
    </p>
  );
}
