"use client";

import { NdaData, Party } from "@/lib/nda";

const input =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-zinc-800">{label}</span>
      {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}

function PartyFields({ title, party, onChange }: { title: string; party: Party; onChange: (p: Party) => void }) {
  const set = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...party, [k]: e.target.value });
  return (
    <fieldset className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-semibold text-zinc-900">{title}</legend>
      <Field label="Company *"><input className={input} value={party.company} onChange={set("company")} /></Field>
      <Field label="Print name"><input className={input} value={party.name} onChange={set("name")} /></Field>
      <Field label="Title"><input className={input} value={party.title} onChange={set("title")} /></Field>
      <Field label="Notice address" hint="Email or postal address">
        <textarea className={input} rows={2} value={party.noticeAddress} onChange={set("noticeAddress")} />
      </Field>
    </fieldset>
  );
}

export function NdaForm({ data, onChange }: { data: NdaData; onChange: (d: NdaData) => void }) {
  const set = <K extends keyof NdaData>(k: K, v: NdaData[K]) => onChange({ ...data, [k]: v });
  const num = (v: string) => Math.max(1, Number.parseInt(v, 10) || 1);

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      <Field label="Purpose *" hint="How Confidential Information may be used">
        <textarea className={input} rows={3} value={data.purpose} onChange={(e) => set("purpose", e.target.value)} />
      </Field>
      <Field label="Effective date">
        <input type="date" className={input} value={data.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-800">MNDA term</legend>
        <div className="flex items-center gap-2 text-sm">
          <input type="radio" id="t1" checked={data.termChoice === "expires"} onChange={() => set("termChoice", "expires")} />
          <label htmlFor="t1">Expires</label>
          <input type="number" min={1} aria-label="Term years" className={`${input} !w-20`} value={data.termYears} onChange={(e) => set("termYears", num(e.target.value))} />
          <span>year(s) from Effective Date</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="radio" id="t2" checked={data.termChoice === "continues"} onChange={() => set("termChoice", "continues")} />
          <label htmlFor="t2">Continues until terminated</label>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-800">Term of confidentiality</legend>
        <div className="flex items-center gap-2 text-sm">
          <input type="radio" id="c1" checked={data.confidentialityChoice === "years"} onChange={() => set("confidentialityChoice", "years")} />
          <input type="number" min={1} aria-label="Confidentiality years" className={`${input} !w-20`} value={data.confidentialityYears} onChange={(e) => set("confidentialityYears", num(e.target.value))} />
          <label htmlFor="c1">year(s) from Effective Date (trade secrets protected longer)</label>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <input type="radio" id="c2" checked={data.confidentialityChoice === "perpetuity"} onChange={() => set("confidentialityChoice", "perpetuity")} />
          <label htmlFor="c2">In perpetuity</label>
        </div>
      </fieldset>

      <Field label="Governing law (state) *"><input className={input} placeholder="e.g. Delaware" value={data.governingLaw} onChange={(e) => set("governingLaw", e.target.value)} /></Field>
      <Field label="Jurisdiction *" hint="e.g. courts located in New Castle, DE">
        <input className={input} value={data.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} />
      </Field>
      <Field label="MNDA modifications" hint="Optional; overrides the Standard Terms">
        <textarea className={input} rows={2} value={data.modifications} onChange={(e) => set("modifications", e.target.value)} />
      </Field>

      <PartyFields title="Party 1" party={data.party1} onChange={(p) => set("party1", p)} />
      <PartyFields title="Party 2" party={data.party2} onChange={(p) => set("party2", p)} />
    </form>
  );
}
