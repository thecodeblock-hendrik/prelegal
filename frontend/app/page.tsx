"use client";

import { useState } from "react";
import { NdaForm } from "@/components/NdaForm";
import { NdaPreview } from "@/components/NdaPreview";
import { defaultNdaData, isComplete, NdaData } from "@/lib/nda";
import { generateNdaPdf } from "@/lib/pdf";

export default function Home() {
  const [data, setData] = useState<NdaData>(() => defaultNdaData());
  const complete = isComplete(data);

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-zinc-900">Prelegal &middot; Mutual NDA Creator</h1>
      </header>
      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <section className="space-y-4 rounded-lg bg-white p-5 shadow lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
          <NdaForm data={data} onChange={setData} />
          <button
            type="button"
            disabled={!complete}
            onClick={() => generateNdaPdf(data).save("Mutual-NDA.pdf")}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Download PDF
          </button>
          {!complete && <p className="text-xs text-zinc-500">Fill in all fields marked * to enable download.</p>}
        </section>
        <section aria-label="Document preview">
          <NdaPreview data={data} />
        </section>
      </main>
    </div>
  );
}
