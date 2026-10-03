import { afterEach, describe, expect, it, vi } from "vitest";
import { applyUpdate, ChatUpdate, sendChat } from "./chat";
import { emptyDraft } from "./documents";

const noParty = { company: null, name: null, title: null, noticeAddress: null };
const empty: ChatUpdate = { documentId: null, variables: [], party1: null, party2: null };

describe("applyUpdate", () => {
  it("keeps the draft when the update is empty", () => {
    const draft = { ...emptyDraft(), documentId: "sla", variables: { "Target Uptime": "99.9%" } };
    expect(applyUpdate(draft, empty)).toEqual(draft);
  });

  it("applies the document, variable values and non-null party fields", () => {
    const draft = { ...emptyDraft(), variables: { "Target Uptime": "99%" }, party1: { ...emptyDraft().party1, name: "Jane" } };
    const result = applyUpdate(draft, {
      documentId: "sla",
      variables: [{ name: "Target Uptime", value: "99.9%" }, { name: "Support Channel", value: "Email" }],
      party1: { ...noParty, company: "Acme" },
      party2: null,
    });
    expect(result.documentId).toBe("sla");
    expect(result.variables).toEqual({ "Target Uptime": "99.9%", "Support Channel": "Email" });
    expect(result.party1).toEqual({ ...draft.party1, company: "Acme", name: "Jane" });
    expect(result.party2).toEqual(draft.party2);
  });
});

describe("sendChat", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts messages, the document id and field values to the chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: "Hi", ...empty }) });
    vi.stubGlobal("fetch", fetchMock);
    const draft = { ...emptyDraft(), documentId: "sla" };
    const result = await sendChat([{ role: "user", content: "hello" }], draft);
    expect(result.reply).toBe("Hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(init.body)).toEqual({
      messages: [{ role: "user", content: "hello" }],
      documentId: "sla",
      fields: { variables: {}, party1: draft.party1, party2: draft.party2 },
    });
  });

  it("throws when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendChat([], emptyDraft())).rejects.toThrow("500");
  });
});
