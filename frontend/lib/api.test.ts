import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./api";

const reply = (status: number, body?: unknown) => ({ ok: status < 400, status, json: async () => body });

describe("api", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends a JSON body and returns the JSON reply", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await api("/api/drafts", "POST", { a: 1 })).toEqual({ id: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/drafts");
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" }, body: '{"a":1}' });
  });

  it("returns undefined for 204", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(204)));
    expect(await api("/api/drafts/1", "DELETE")).toBeUndefined();
  });

  it("throws the status and the server's detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(409, { detail: "Email taken" })));
    const error = await api<never>("/api/auth/signup", "POST", {}).catch((e: ApiError) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe("Email taken");
  });

  it("sends the user back to sign in when the session has ended", async () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(401, { detail: "Not signed in" })));
    await expect(api("/api/drafts")).rejects.toThrow("Not signed in");
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("leaves a failed sign in on the page", async () => {
    const replace = vi.fn();
    vi.stubGlobal("window", { location: { replace } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(401, { detail: "Incorrect email or password" })));
    await expect(api("/api/auth/signin", "POST", {})).rejects.toThrow("Incorrect");
    expect(replace).not.toHaveBeenCalled();
  });

  it("falls back to the status when the detail is not text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.reject(new Error()) }));
    await expect(api("/api/chat")).rejects.toThrow("Request failed: 500");
  });
});
