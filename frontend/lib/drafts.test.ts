import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyDraft } from "./documents";
import { formatUpdated, partiesLabel, saveDraft, toDraft } from "./drafts";

const named = (a: string, b: string) => {
  const draft = emptyDraft();
  return { ...draft, party1: { ...draft.party1, company: a }, party2: { ...draft.party2, company: b } };
};

describe("drafts", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates a new draft, then updates it by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 7 }) });
    vi.stubGlobal("fetch", fetchMock);
    const messages = [{ role: "user" as const, content: "hi" }];
    await saveDraft(null, messages, emptyDraft());
    await saveDraft(7, messages, emptyDraft());
    expect(fetchMock.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["/api/drafts", "POST"],
      ["/api/drafts/7", "PUT"],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).messages).toEqual(messages);
  });

  it("restores a draft from its saved form", () => {
    const { documentId, ...fields } = { ...named("Acme", ""), documentId: "sla" };
    expect(toDraft({ id: 1, documentId, fields, updatedAt: "" })).toEqual({ ...named("Acme", ""), documentId: "sla" });
  });

  it("labels the parties by company", () => {
    expect(partiesLabel(named("Acme", "Globex"))).toBe("Acme and Globex");
    expect(partiesLabel(named("", "Globex"))).toBe("Globex");
    expect(partiesLabel(named(" ", ""))).toBe("Parties not yet named");
  });

  it("formats the last update time", () => {
    expect(formatUpdated("2026-10-03T09:30:00Z")).toMatch(/^Oct 3, 2026, \d{1,2}:30 [AP]M$/);
  });
});
