/**
 * Integration tests for the frontend API client (src/lib/api.ts)
 * against a mocked fetch — verifies URLs, headers, auth token handling,
 * and error propagation exactly as the backend contract expects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVerificationStatus,
  googleSignIn,
  login,
  register,
  resendVerification,
  verifyEmail,
} from "@/lib/api";

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
    await register({ email: "new@b.c", password: "password123" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/register$/);
    expect(init.method).toBe("POST");
    // Signing up may only ever create an author. Sending a role would let a
    // stranger ask to be an editor, which is what this closes.
    expect(JSON.parse(init.body).role).toBeUndefined();
  });

  // The backend replies with `{ error }`; only reading `message` turned every
  // failure into the useless "Request failed".
  it("reads the backend's `error` field, not just `message`", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "Email already registered" }, false, 409));
    await expect(login("a@b.c", "wrong", "AUTHOR")).rejects.toThrow("Email already registered");
  });

  it("exposes the machine-readable error code and status on ApiError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Verify your email", code: "EMAIL_NOT_VERIFIED" }, false, 403),
    );

    await expect(login("a@b.c", "pw12345678", "AUTHOR")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
    });
  });
});

describe("email verification client (FR-AUTH-1)", () => {
  it("POSTs the token to /api/auth/verify-email", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ accessToken: "tok", user: { id: "u1", role: "AUTHOR" } }),
    );

    await verifyEmail("raw-token");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/verify-email$/);
    expect(JSON.parse(init.body)).toEqual({ token: "raw-token" });
  });

  it("POSTs the address to /api/auth/resend-verification", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "sent" }));

    await resendVerification("a@b.c");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/resend-verification$/);
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.c" });
  });

  it("url-encodes the address when checking verification status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ emailVerified: false }));

    await getVerificationStatus("a+tag@b.c");

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("email=a%2Btag%40b.c");
  });
});

describe("google sign-in client (FR-AUTH-2)", () => {
  it("forwards the credential and the chosen role", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ accessToken: "tok", user: { id: "g1", role: "REVIEWER" }, created: true }),
    );

    await googleSignIn("google-id-token", "AUCA");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/auth\/google$/);
    expect(JSON.parse(init.body)).toEqual({
      credential: "google-id-token",
      institution: "AUCA",
    });
  });

  // Google sign-in is the second door into registration. It must not carry a
  // role either, or closing the signup form would achieve nothing.
  it("never sends a role, whatever the caller does", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ accessToken: "tok", user: { id: "g1" } }));

    await (googleSignIn as unknown as (c: string, i?: string, r?: string) => Promise<unknown>)(
      "google-id-token",
      "AUCA",
      "EDITOR",
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).role).toBeUndefined();
  });
});
