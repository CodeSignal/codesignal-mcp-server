import { generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import type { OAuthConfig } from "@/lib/oauth/config";
import { verifyUserToken } from "@/lib/oauth/verifyUserToken";
import {
  ISSUER_URL,
  RESOURCE_URL,
  startFakeAuthorizationServer,
} from "./fakeAuthorizationServer";

const config: OAuthConfig = {
  issuerUrl: ISSUER_URL,
  clientId: "mcp-server",
  clientSecret: "mcp-secret",
  resourceUrl: RESOURCE_URL,
};

let server: Awaited<ReturnType<typeof startFakeAuthorizationServer>>;

beforeAll(async () => {
  server = await startFakeAuthorizationServer();
});

describe("verifyUserToken", () => {
  it("accepts a token issued for this server and exposes the user and client", async () => {
    const token = await server.signUserToken();

    const authInfo = await verifyUserToken(token, config);

    expect(authInfo.token).toBe(token);
    expect(authInfo.clientId).toBe("connector-client");
    expect(authInfo.extra).toEqual({ credential: "user", subject: "user-1" });
  });

  it("rejects a token issued for another resource", async () => {
    const token = await server.signUserToken({ audience: "https://other.test/api" });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JWT_CLAIM_VALIDATION_FAILED).",
    );
  });

  it("rejects a token from another issuer", async () => {
    const token = await server.signUserToken({ issuer: "https://evil.test" });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JWT_CLAIM_VALIDATION_FAILED).",
    );
  });

  it("rejects an expired token", async () => {
    const token = await server.signUserToken({
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JWT_EXPIRED).",
    );
  });

  it("rejects a token without a subject", async () => {
    const token = await server.signUserToken({ subject: null });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JWT_CLAIM_VALIDATION_FAILED).",
    );
  });

  it("rejects a token signed with a symmetric algorithm", async () => {
    const token = await server.signUserToken({
      algorithm: "HS256",
      signingKey: new TextEncoder().encode("a-shared-secret-of-sufficient-length"),
    });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JOSE_ALG_NOT_ALLOWED).",
    );
  });

  it("rejects a token signed with a key the authorization server does not publish", async () => {
    const { privateKey } = await generateKeyPair("RS256");
    const token = await server.signUserToken({ signingKey: privateKey });

    await expect(verifyUserToken(token, config)).rejects.toThrow(
      "Token rejected (ERR_JWS_SIGNATURE_VERIFICATION_FAILED).",
    );
  });
});
