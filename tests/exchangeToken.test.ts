import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CodeSignalApiError } from "@/lib/codesignal/client";
import type { OAuthConfig } from "@/lib/oauth/config";
import { exchangeForApiToken } from "@/lib/oauth/exchangeToken";
import {
  ISSUER_URL,
  json,
  RESOURCE_URL,
  startFakeAuthorizationServer,
} from "./fakeAuthorizationServer";

const API_AUDIENCE = "https://api.test/graphql";
const config: OAuthConfig = {
  issuerUrl: ISSUER_URL,
  clientId: "mcp-server",
  clientSecret: "mcp-secret",
  resourceUrl: RESOURCE_URL,
};

let server: Awaited<ReturnType<typeof startFakeAuthorizationServer>>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  server = await startFakeAuthorizationServer();
});

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

async function exchangeError(userToken: string): Promise<CodeSignalApiError> {
  const error = await exchangeForApiToken(userToken, config, API_AUDIENCE).catch(
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(CodeSignalApiError);
  return error as CodeSignalApiError;
}

describe("exchangeForApiToken", () => {
  it("exchanges the user token as a confidential client and caches the result", async () => {
    let received: { headers: Headers; body: URLSearchParams } | undefined;
    server.onExchange((request) => {
      received = request;
      return json({ access_token: "api-token", expires_in: 300 });
    });
    const before = server.exchangeRequestCount();

    const first = await exchangeForApiToken("user-token-success", config, API_AUDIENCE);
    const second = await exchangeForApiToken("user-token-success", config, API_AUDIENCE);

    expect(first).toBe("api-token");
    expect(second).toBe("api-token");
    expect(server.exchangeRequestCount() - before).toBe(1);
    expect(received?.headers.get("authorization")).toBe(
      `Basic ${Buffer.from("mcp-server:mcp-secret").toString("base64")}`,
    );
    expect(Object.fromEntries(received?.body ?? [])).toEqual({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: "user-token-success",
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      resource: API_AUDIENCE,
    });
  });

  it("asks the user to reconnect when their sign-in is rejected", async () => {
    server.onExchange(() => json({ error: "invalid_grant" }, 400));

    const error = await exchangeError("user-token-revoked");

    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.message).toContain("Reconnect the CodeSignal connector");
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("logs rejected client credentials and does not ask the user to reconnect", async () => {
    server.onExchange(() =>
      json({ error: "invalid_client", error_description: "user-token-bad-client" }, 401),
    );

    const error = await exchangeError("user-token-bad-client");

    expect(error.status).toBe(503);
    expect(error.code).toBeUndefined();
    expect(error.message).not.toContain("Reconnect");
    expect(consoleError).toHaveBeenCalledWith(
      "Token exchange failed (invalid_client, HTTP 401).",
    );
  });

  it("reports an unreachable authorization server as temporarily unavailable", async () => {
    server.onExchange(() => {
      throw new TypeError("fetch failed for user-token-outage");
    });

    const error = await exchangeError("user-token-outage");

    expect(error.status).toBe(503);
    expect(error.message).toContain("temporarily unavailable");
    expect(consoleError).toHaveBeenCalledWith("Token exchange failed (TypeError).");
  });

  it("reports a malformed token response as temporarily unavailable", async () => {
    server.onExchange(() => json({ token_type: "Bearer" }));

    const error = await exchangeError("user-token-malformed");

    expect(error.status).toBe(503);
    expect(consoleError).toHaveBeenCalledWith(
      "Token exchange failed (malformed token response, HTTP 200).",
    );
  });
});
