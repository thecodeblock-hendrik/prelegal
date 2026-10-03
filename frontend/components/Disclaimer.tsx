import { DISCLAIMER } from "@/lib/documents";

/** Notice that generated documents are drafts subject to legal review. */
export function Disclaimer() {
  return (
    <p role="note" className="alert-warning text-caption">
      <span className="font-semibold text-warning">Draft only.</span> {DISCLAIMER}
    </p>
  );
}
