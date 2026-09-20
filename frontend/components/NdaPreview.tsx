import ReactMarkdown from "react-markdown";
import { buildStandardTerms, confidentialityText, formatDate, NdaData, termText } from "@/lib/nda";

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h3 className="font-semibold">{label}</h3>
      <p className="whitespace-pre-wrap">{value.trim() || "—"}</p>
    </div>
  );
}

export function NdaPreview({ data }: { data: NdaData }) {
  const rows: [string, string, string][] = [
    ["Signature", "", ""],
    ["Print Name", data.party1.name, data.party2.name],
    ["Title", data.party1.title, data.party2.title],
    ["Company", data.party1.company, data.party2.company],
    ["Notice Address", data.party1.noticeAddress, data.party2.noticeAddress],
    ["Date", "", ""],
  ];
  return (
    <article className="space-y-4 bg-white p-8 font-serif text-sm leading-relaxed text-zinc-900 shadow">
      <h1 className="text-2xl font-bold">Mutual Non-Disclosure Agreement</h1>
      <h2 className="text-lg font-semibold">Cover Page</h2>
      <p>
        This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists of: (1) this Cover Page and (2) the
        Common Paper Mutual NDA Standard Terms Version 1.0. Any modifications of the Standard Terms should be made on
        the Cover Page, which will control over conflicts with the Standard Terms.
      </p>
      <Item label="Purpose" value={data.purpose} />
      <Item label="Effective Date" value={formatDate(data.effectiveDate)} />
      <Item label="MNDA Term" value={termText(data)} />
      <Item label="Term of Confidentiality" value={confidentialityText(data)} />
      <Item label="Governing Law" value={data.governingLaw} />
      <Item label="Jurisdiction" value={data.jurisdiction} />
      <Item label="MNDA Modifications" value={data.modifications} />
      <p>By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.</p>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border p-2" />
            <th className="border p-2">PARTY 1</th>
            <th className="border p-2">PARTY 2</th>
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
      <div className="space-y-3 border-t pt-4 [&_ol]:list-decimal [&_h1]:text-lg [&_h1]:font-semibold [&_a]:underline">
        <ReactMarkdown>{buildStandardTerms(data)}</ReactMarkdown>
      </div>
    </article>
  );
}
