import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthorizationServerMetadata } from "@/lib/oauth/authorizationServer";
import { json } from "./fakeAuthorizationServer";

const ISSUER_URL = "https://auth.test";

function serveMetadata(metadata: Record<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ issuer: ISSUER_URL, ...metadata })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAuthorizationServerMetadata", () => {
  it("rejects a token endpoint on another host", async () => {
    serveMetadata({ token_endpoint: "https://elsewhere.test/oauth/token" });

    await expect(getAuthorizationServerMetadata(ISSUER_URL)).rejects.toThrow(
      "token_endpoint is not on the issuer's origin",
    );
  });

  it("rejects a token endpoint that drops TLS", async () => {
    serveMetadata({ token_endpoint: "http://auth.test/oauth/token" });

    await expect(getAuthorizationServerMetadata(ISSUER_URL)).rejects.toThrow(
      "token_endpoint is not on the issuer's origin",
    );
  });

  it("rejects signing keys hosted on another origin", async () => {
    serveMetadata({
      token_endpoint: `${ISSUER_URL}/oauth/token`,
      jwks_uri: "https://elsewhere.test/jwks.json",
    });

    await expect(getAuthorizationServerMetadata(ISSUER_URL)).rejects.toThrow(
      "jwks_uri is not on the issuer's origin",
    );
  });

  it("accepts endpoints on the issuer's origin", async () => {
    const endpoints = {
      token_endpoint: `${ISSUER_URL}/oauth/token`,
      jwks_uri: `${ISSUER_URL}/.well-known/jwks.json`,
    };
    serveMetadata(endpoints);

    await expect(getAuthorizationServerMetadata(ISSUER_URL)).resolves.toMatchObject(endpoints);
  });
});
