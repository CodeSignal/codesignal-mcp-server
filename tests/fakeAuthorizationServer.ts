import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { vi } from "vitest";

export const ISSUER_URL = "https://auth.test";
export const RESOURCE_URL = "https://mcp.test/api/mcp";
export const TOKEN_ENDPOINT = `${ISSUER_URL}/oauth/token`;
const JWKS_URI = `${ISSUER_URL}/.well-known/jwks.json`;
const KEY_ID = "test-key";

type ExchangeResponder = (request: { headers: Headers; body: URLSearchParams }) => Response;

interface TokenOverrides {
  issuer?: string;
  audience?: string;
  subject?: string | null;
  expiresAt?: number | string;
  signingKey?: CryptoKey | Uint8Array;
  algorithm?: string;
}

/**
 * Stands in for the authorization server by stubbing `fetch`: serves metadata and
 * a JWKS, signs user tokens, and answers token exchanges however a test decides.
 */
export async function startFakeAuthorizationServer() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: KEY_ID, alg: "RS256", use: "sig" };
  let respondToExchange: ExchangeResponder = () => json({ error: "server_error" }, 500);

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === `${ISSUER_URL}/.well-known/oauth-authorization-server`) {
      return json({ issuer: ISSUER_URL, token_endpoint: TOKEN_ENDPOINT, jwks_uri: JWKS_URI });
    }
    if (url === JWKS_URI) {
      return json({ keys: [jwk] });
    }
    if (url === TOKEN_ENDPOINT) {
      return respondToExchange({
        headers: new Headers(init?.headers),
        body: new URLSearchParams(String(init?.body)),
      });
    }
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);

  return {
    signUserToken({
      issuer = ISSUER_URL,
      audience = RESOURCE_URL,
      subject = "user-1",
      expiresAt = "5m",
      signingKey = privateKey,
      algorithm = "RS256",
    }: TokenOverrides = {}): Promise<string> {
      const jwt = new SignJWT({ client_id: "connector-client" })
        .setProtectedHeader({ alg: algorithm, kid: KEY_ID })
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime(expiresAt);
      if (subject !== null) {
        jwt.setSubject(subject);
      }
      return jwt.sign(signingKey);
    },
    onExchange(responder: ExchangeResponder) {
      respondToExchange = responder;
    },
    exchangeRequestCount(): number {
      return fetchMock.mock.calls.filter(([input]) => String(input) === TOKEN_ENDPOINT).length;
    },
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function stubOAuthEnv() {
  vi.stubEnv("OAUTH_ISSUER_URL", ISSUER_URL);
  vi.stubEnv("OAUTH_CLIENT_ID", "mcp-server");
  vi.stubEnv("OAUTH_CLIENT_SECRET", "mcp-secret");
  vi.stubEnv("MCP_RESOURCE_URL", RESOURCE_URL);
}
