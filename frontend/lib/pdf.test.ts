import { describe, expect, it } from "vitest";
import { defaultNdaData } from "./nda";
import { generateNdaPdf } from "./pdf";

describe("generateNdaPdf", () => {
  it("produces a multi-page PDF with cover page and terms", () => {
    const doc = generateNdaPdf({ ...defaultNdaData(), governingLaw: "Delaware", jurisdiction: "New Castle, DE" });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  });
});
