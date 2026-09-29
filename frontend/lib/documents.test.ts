import { afterEach, describe, expect, it, vi } from "vitest";
import { BLANK, emptyDraft, fetchDocuments, highlightTerms, isComplete, toPlainText, variableValue } from "./documents";
import { SLA } from "./testing/fixtures";

describe("documents", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("starts with no document and empty parties", () => {
    const draft = emptyDraft();
    expect(draft.documentId).toBeNull();
    expect(draft.variables).toEqual({});
    expect(draft.party1.company).toBe("");
  });

  it("renders missing variable values as blanks", () => {
    const draft = { ...emptyDraft(), variables: { "Target Uptime": "99.9%", "Support Channel": "  " } };
    expect(variableValue(draft, "Target Uptime")).toBe("99.9%");
    expect(variableValue(draft, "Support Channel")).toBe(BLANK);
    expect(variableValue(draft, "Missing")).toBe(BLANK);
  });

  it("is complete once a document is chosen and both companies are named", () => {
    const named = { ...emptyDraft(), party1: { ...emptyDraft().party1, company: "Acme" }, party2: { ...emptyDraft().party2, company: "Globex" } };
    expect(isComplete(named)).toBe(false);
    expect(isComplete({ ...named, documentId: "sla" })).toBe(true);
    expect(isComplete({ ...named, documentId: "sla", party2: { ...named.party2, company: " " } })).toBe(false);
  });

  it("turns spans into bold headings and italic variables", () => {
    const md = highlightTerms(SLA.body);
    expect(md).toContain("1. **Uptime**");
    expect(md).toContain("**Target Uptime.** *Provider* will meet the *Target Uptime*.");
    expect(md).not.toContain("<span");
    expect(highlightTerms('<span id="4.1"></span><span id="x">**"Terms"**</span>')).toBe('**"Terms"**');
  });

  it("strips tags and markdown for plain text", () => {
    expect(toPlainText(SLA.body)).toContain("1. Target Uptime. Provider will meet the Target Uptime.");
    expect(toPlainText("**Bold** [link](https://x.y)")).toBe("Bold link");
  });

  it("fetches the supported documents", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [SLA] }));
    expect(await fetchDocuments()).toEqual([SLA]);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/documents");
  });

  it("throws when the documents request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchDocuments()).rejects.toThrow("500");
  });
});
