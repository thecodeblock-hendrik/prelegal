import { describe, expect, it } from "vitest";
import { emptyDraft } from "./documents";
import { generateDocumentPdf } from "./pdf";
import { SLA } from "./testing/fixtures";

describe("generateDocumentPdf", () => {
  it("produces a cover page followed by the standard terms", () => {
    const draft = { ...emptyDraft(), documentId: "sla", variables: { "Target Uptime": "99.9%" } };
    const doc = generateDocumentPdf(SLA, draft);
    expect(doc.getNumberOfPages()).toBe(2);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
});
