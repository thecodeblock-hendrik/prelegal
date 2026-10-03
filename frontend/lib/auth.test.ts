import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticate, fetchMe, signOut } from "./auth";

describe("auth", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the endpoint for each action", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ email: "a@b.co" }) });
    vi.stubGlobal("fetch", fetchMock);
    await authenticate("signup", "a@b.co", "secret-pass");
    await authenticate("signin", "a@b.co", "secret-pass");
    await signOut();
    await fetchMe();
    expect(fetchMock.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      "POST /api/auth/signup",
      "POST /api/auth/signin",
      "POST /api/auth/signout",
      "GET /api/auth/me",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "a@b.co", password: "secret-pass" });
  });
});
