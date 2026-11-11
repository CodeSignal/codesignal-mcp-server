import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthErrorMessage, verifyToken } from "@/lib/auth";
import { startFakeAuthorizationServer, stubOAuthEnv } from "./fakeAuthorizationServer";

const MCP_URL = "https://mcp.test/api/mcp";

let server: Awaited<ReturnType<typeof startFakeAuthorizationServer>>;

beforeAll(async () => {
  server = await startFakeAuthorizationServer();
});

beforeEach(() => {
  vi.stubEnv("CODESIGNAL_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyToken with OAuth enabled", () => {
  beforeEach(stubOAuthEnv);

  it("treats a verified JWT as a user credential", async () => {
    const token = await server.signUserToken();

    const authInfo = await verifyToken(new Request(MCP_URL), token);

    expect(authInfo?.extra?.credential).toBe("user");
  });

  it("rejects an invalid JWT instead of passing it on as an API key", async () => {
    const token = await server.signUserToken({ audience: "https://other.test/api" });

    await expect(verifyToken(new Request(MCP_URL), token)).rejects.toThrow("Token rejected");
  });

  it("treats an opaque bearer as an API key", async () => {
    const authInfo = await verifyToken(new Request(MCP_URL), "opaque-api-key");

    expect(authInfo?.token).toBe("opaque-api-key");
    expect(authInfo?.extra?.credential).toBe("apiKey");
  });
});

describe("verifyToken with OAuth disabled", () => {
  it("accepts an API key from the X-CodeSignal-Key header", async () => {
    const request = new Request(MCP_URL, { headers: { "X-CodeSignal-Key": "header-key" } });

    const authInfo = await verifyToken(request);

    expect(authInfo?.token).toBe("header-key");
    expect(authInfo?.extra?.credential).toBe("apiKey");
  });

  it("returns nothing when no credential is sent", async () => {
    expect(await verifyToken(new Request(MCP_URL))).toBeUndefined();
  });
});

describe("getAuthErrorMessage", () => {
  it("only asks for an API key while OAuth is disabled", () => {
    expect(getAuthErrorMessage()).toMatch(/^Missing CodeSignal API key\./);
    expect(getAuthErrorMessage()).not.toContain("sign in");
  });

  it("offers sign-in once OAuth is enabled", () => {
    stubOAuthEnv();

    expect(getAuthErrorMessage()).toContain("sign in with your CodeSignal account");
  });
});
