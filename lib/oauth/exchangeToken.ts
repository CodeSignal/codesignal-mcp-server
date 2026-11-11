import { createHash } from "node:crypto";
import { CodeSignalApiError } from "@/lib/codesignal/client";
import { getAuthorizationServerMetadata } from "@/lib/oauth/authorizationServer";
import type { OAuthConfig } from "@/lib/oauth/config";

const TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";
const ACCESS_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";
const REQUEST_TIMEOUT_MS = 10_000;
const EXPIRY_MARGIN_MS = 30_000;
// RFC 6749 only recommends expires_in; cache briefly when it is absent.
const DEFAULT_LIFETIME_SECONDS = 60;
const MAX_CACHE_ENTRIES = 1000;

const RECONNECT_HINT =
  "CodeSignal could not exchange your sign-in for API access. " +
  "Reconnect the CodeSignal connector and try again.";

const UNAVAILABLE_HINT =
  "CodeSignal sign-in is temporarily unavailable. Try again in a moment; " +
  "if it keeps failing, contact support@codesignal.com.";

const REJECTED_SIGN_IN_ERROR = "invalid_grant";

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Keyed by a hash so user tokens are not retained in memory.
const cache = new Map<string, CachedToken>();
const inFlight = new Map<string, Promise<string>>();

/**
 * RFC 8693 token exchange. The MCP spec forbids passing the client's token
 * upstream, so the CodeSignal API gets an exchanged token instead.
 */
export async function exchangeForApiToken(
  userToken: string,
  config: OAuthConfig,
  audience: string,
): Promise<string> {
  const cacheKey = createHash("sha256").update(userToken).digest("hex");
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
    return cached.accessToken;
  }

  const pending = inFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const exchange = requestExchange(userToken, config, audience)
    .then((token) => {
      remember(cacheKey, token);
      return token.accessToken;
    })
    .finally(() => {
      inFlight.delete(cacheKey);
    });
  inFlight.set(cacheKey, exchange);
  return exchange;
}

async function requestExchange(
  userToken: string,
  config: OAuthConfig,
  audience: string,
): Promise<CachedToken> {
  // RFC 6749 §2.3.1: client credentials are form-urlencoded before Basic encoding.
  const credentials = Buffer.from(
    `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`,
  ).toString("base64");

  let response: Response;
  try {
    const metadata = await getAuthorizationServerMetadata(config.issuerUrl);
    response = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: TOKEN_EXCHANGE_GRANT,
        subject_token: userToken,
        subject_token_type: ACCESS_TOKEN_TYPE,
        resource: audience,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw unavailableError(error instanceof Error ? error.name : "unknown error");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const failure = describeFailure(response.status, body);
    if (oauthErrorCode(body) === REJECTED_SIGN_IN_ERROR) {
      throw new CodeSignalApiError(
        `${RECONNECT_HINT} (${failure})`,
        401,
        "UNAUTHENTICATED",
      );
    }
    throw unavailableError(failure);
  }
  if (!isTokenResponse(body)) {
    throw unavailableError(`malformed token response, HTTP ${response.status}`);
  }

  const lifetimeSeconds =
    typeof body.expires_in === "number" ? body.expires_in : DEFAULT_LIFETIME_SECONDS;
  return {
    accessToken: body.access_token,
    expiresAt: Date.now() + lifetimeSeconds * 1000,
  };
}

function isTokenResponse(
  body: unknown,
): body is { access_token: string; expires_in?: unknown } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { access_token?: unknown }).access_token === "string"
  );
}

function unavailableError(failure: string): CodeSignalApiError {
  console.error(`Token exchange failed (${failure}).`);
  return new CodeSignalApiError(`${UNAVAILABLE_HINT} (${failure})`, 503);
}

function oauthErrorCode(body: unknown): string | undefined {
  const code =
    typeof body === "object" && body !== null
      ? (body as { error?: unknown }).error
      : undefined;
  return typeof code === "string" ? code : undefined;
}

function describeFailure(status: number, body: unknown): string {
  const code = oauthErrorCode(body);
  return code ? `${code}, HTTP ${status}` : `HTTP ${status}`;
}

function remember(cacheKey: string, token: CachedToken) {
  cache.set(cacheKey, token);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}
