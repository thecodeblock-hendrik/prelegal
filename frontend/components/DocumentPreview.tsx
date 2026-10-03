import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { changedSection, DocumentDef, Draft, highlightTerms, variableValue } from "@/lib/documents";

/** Scrolls the page just enough to show the cover page section the latest update filled in. */
function useFollowChanges(document: DocumentDef | undefined, draft: Draft) {
  const previous = useRef(draft);
  useEffect(() => {
    const section = document && changedSection(document, previous.current, draft);
    previous.current = draft;
    if (section) window.document.getElementById(`section-${section}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [document, draft]);
}

function SupportedDocuments({ documents }: { documents: DocumentDef[] }) {
  return (
    <article className="space-y-4 bg-white p-8 text-sm text-zinc-900 shadow">
      <h1 className="text-2xl font-bold text-navy">Your document will appear here</h1>
      <p className="text-muted">Tell the assistant what you need. These are the agreements it can draft:</p>
      <ul className="space-y-2">
        {documents.map((d) => (
          <li key={d.id}>
            <span className="font-semibold">{d.name}</span> &ndash; {d.description}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function DocumentPreview({ document, documents, draft }: { document?: DocumentDef; documents: DocumentDef[]; draft: Draft }) {
  useFollowChanges(document, draft);
  if (!document) return <SupportedDocuments documents={documents} />;

  const [role1, role2] = document.parties;
  const rows: [string, string, string][] = [
    ["Signature", "", ""],
    ["Print Name", draft.party1.name, draft.party2.name],
    ["Title", draft.party1.title, draft.party2.title],
    ["Company", draft.party1.company, draft.party2.company],
    ["Notice Address", draft.party1.noticeAddress, draft.party2.noticeAddress],
    ["Date", "", ""],
  ];
  return (
    <article className="space-y-4 bg-white p-8 font-serif text-sm leading-relaxed text-zinc-900 shadow">
      <h1 className="text-2xl font-bold">{document.name}</h1>
      <h2 className="text-lg font-semibold">Cover Page</h2>
      <p>
        This {document.name} consists of this Cover Page and the Common Paper standard terms that follow. The values on
        this Cover Page define the capitalized terms used in the standard terms and control over any conflict with them.
      </p>
      {document.variables.map((name) => (
        <div key={name} id={`section-${name}`}>
          <h3 className="font-semibold">{name}</h3>
          <p className="whitespace-pre-wrap">{variableValue(draft, name)}</p>
        </div>
      ))}
      <p>By signing this Cover Page, each party agrees to enter into this {document.name}.</p>
      <table id="section-parties" className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border p-2" />
            <th className="border p-2 uppercase">{role1}</th>
            <th className="border p-2 uppercase">{role2}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <th className="border p-2 font-medium">{label}</th>
              <td className="h-10 whitespace-pre-wrap border p-2">{a}</td>
              <td className="h-10 whitespace-pre-wrap border p-2">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 border-t pt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_h1]:text-lg [&_h1]:font-semibold [&_a]:underline">
        <ReactMarkdown>{highlightTerms(document.body)}</ReactMarkdown>
      </div>
    </article>
  );
}
