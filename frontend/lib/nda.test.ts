import { describe, expect, it } from "vitest";
import { buildStandardTerms, defaultNdaData, formatDate, isComplete, toPlainText } from "./nda";

describe("nda", () => {
  it("fills cover page references into the standard terms", () => {
    const d = { ...defaultNdaData(new Date("2026-01-15T12:00:00Z")), governingLaw: "Delaware", jurisdiction: "courts located in New Castle, DE" };
    const terms = buildStandardTerms(d);
    expect(terms).not.toContain("coverpage_link");
    expect(terms).toContain("laws of the State of Delaware");
    expect(terms).toContain("courts located in New Castle, DE");
    expect(terms).toContain("Expires 1 year from Effective Date.");
  });

  it("uses blanks for missing values and handles perpetuity", () => {
    const d = { ...defaultNdaData(), confidentialityChoice: "perpetuity" as const };
    const terms = buildStandardTerms(d);
    expect(terms).toContain("________");
    expect(terms).toContain("In perpetuity.");
  });

  it("formats dates and strips markdown", () => {
    expect(formatDate("2026-01-15")).toBe("January 15, 2026");
    expect(formatDate("")).toBe("________");
    expect(toPlainText("**Bold** [link](https://x.y)")).toBe("Bold link");
  });

  it("requires key fields before completion", () => {
    expect(isComplete(defaultNdaData())).toBe(false);
  });
});

describe("nda edge cases", () => {
  it("defaults the effective date to the local calendar date", () => {
    expect(defaultNdaData(new Date(2026, 0, 5, 23, 30)).effectiveDate).toBe("2026-01-05");
  });

  it("renders a cleared year field as one year", () => {
    const d = { ...defaultNdaData(), termYears: 0 };
    expect(buildStandardTerms(d)).toContain("Expires 1 year from Effective Date.");
  });
});
