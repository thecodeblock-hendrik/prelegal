import { afterEach, describe, expect, it, vi } from "vitest";
import { applyUpdate, NdaUpdate, sendChat } from "./chat";
import { defaultNdaData } from "./nda";

const noParty = { company: null, name: null, title: null, noticeAddress: null };
const empty: NdaUpdate = {
  purpose: null,
  effectiveDate: null,
  termChoice: null,
  termYears: null,
  confidentialityChoice: null,
  confidentialityYears: null,
  governingLaw: null,
  jurisdiction: null,
  modifications: null,
  party1: null,
  party2: null,
};

describe("applyUpdate", () => {
  it("keeps existing values when the update is all null", () => {
    const data = { ...defaultNdaData(), governingLaw: "Delaware" };
    expect(applyUpdate(data, empty)).toEqual(data);
  });

  it("applies non-null top-level and party values", () => {
    const data = { ...defaultNdaData(), party1: { ...defaultNdaData().party1, name: "Jane" } };
    const result = applyUpdate(data, {
      ...empty,
      governingLaw: "Delaware",
      confidentialityChoice: "perpetuity",
      party1: { ...noParty, company: "Acme" },
    });
    expect(result.governingLaw).toBe("Delaware");
    expect(result.confidentialityChoice).toBe("perpetuity");
    expect(result.party1).toEqual({ ...data.party1, company: "Acme", name: "Jane" });
    expect(result.party2).toEqual(data.party2);
  });
});

describe("sendChat", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts messages and fields to the chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ reply: "Hi", fields: empty }) });
    vi.stubGlobal("fetch", fetchMock);
    const data = defaultNdaData();
    const result = await sendChat([{ role: "user", content: "hello" }], data);
    expect(result.reply).toBe("Hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(JSON.parse(init.body)).toEqual({ messages: [{ role: "user", content: "hello" }], fields: data });
  });

  it("throws when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendChat([], defaultNdaData())).rejects.toThrow("500");
  });
});
