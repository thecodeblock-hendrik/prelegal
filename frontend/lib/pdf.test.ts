import { describe, expect, it } from "vitest";
import { DISCLAIMER, emptyDraft } from "./documents";
import { FOOTER, generateDocumentPdf } from "./pdf";
import { SLA } from "./testing/fixtures";

describe("generateDocumentPdf", () => {
  it("produces a cover page followed by the standard terms", () => {
    const draft = { ...emptyDraft(), documentId: "sla", variables: { "Target Uptime": "99.9%" } };
    const doc = generateDocumentPdf(SLA, draft);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });

  it("states the disclaimer on the cover and in every page footer", () => {
    const doc = generateDocumentPdf(SLA, emptyDraft());
    const output = doc.output();
    expect(output).toContain(DISCLAIMER.slice(0, 40));
    expect(output).toContain(`${FOOTER}    Page 1 of 2`);
    expect(output).toContain(`${FOOTER}    Page 2 of 2`);
  });
});
