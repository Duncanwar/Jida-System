/**
 * Integration tests for the frontend API client (src/lib/api.ts)
 * against a mocked fetch — verifies URLs, headers, auth token handling,
 * and error propagation exactly as the backend contract expects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { login, register } from "@/lib/api";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("api client", () => {
  it("POSTs credentials to /api/auth/login with JSON headers", async () => {
    const payload = {
      accessToken: "tok",
      expiresInMinutes: 15,
      user: { id: "u1", email: "a@b.c", role: "AUTHOR" },
    };
    fetchMock.mockResolvedValue(jsonResponse(payload));

    const result = await login("a@b.c", "password123", "AUTHOR");

    expect(result.accessToken).toBe("tok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/login$/);
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toMatchObject({ email: "a@b.c", password: "password123" });
  });

  it("attaches the Authorization header when a token is stored", async () => {
    localStorage.setItem("token", "stored-token");
    fetchMock.mockResolvedValue(jsonResponse({}));

    await login("a@b.c", "password123", "AUTHOR");

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBe("Bearer stored-token");
  });

  it("sends no Authorization header without a token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await login("a@b.c", "password123", "AUTHOR");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Authorization"]).toBeUndefined();
  });

  it("throws the server's error message on a failed request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Invalid credentials" }, false, 401));
    await expect(login("a@b.c", "wrong", "AUTHOR")).rejects.toThrow("Invalid credentials");
  });

  it("registers via POST /api/auth/register", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ user: { id: "u2" } }));
    await register({ email: "new@b.c", password: "password123", role: "AUTHOR" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/register$/);
    expect(init.method).toBe("POST");
  });
});
