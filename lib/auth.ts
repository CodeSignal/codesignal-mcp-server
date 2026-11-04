import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getOAuthConfig } from "@/lib/oauth/config";
import { looksLikeJwt, verifyUserToken } from "@/lib/oauth/verifyUserToken";

export const AUTH_ERROR_MESSAGE =
  "Missing credentials. Either sign in with your CodeSignal account (OAuth, " +
  "used by Claude.ai and ChatGPT connectors) or provide your CodeSignal API key " +
  'as a Bearer token ("Authorization: Bearer <your CodeSignal API key>") or in ' +
  'an "X-CodeSignal-Key" header. Keys are issued by CodeSignal — contact ' +
  "support@codesignal.com if you do not have one.";

export type CredentialKind = "apiKey" | "user";

/**
 * A signed JWT is a user token and is verified against the authorization server.
 * API keys are only required to be present, not validated here: every tool call
 * hits the CodeSignal API with the key anyway.
 */
export async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const bearer = bearerToken?.trim();
  if (bearer) {
    const oauth = looksLikeJwt(bearer) ? getOAuthConfig() : null;
    if (oauth) {
      return verifyUserToken(bearer, oauth);
    }
    return apiKeyAuth(bearer);
  }

  const key = req.headers.get("x-codesignal-key")?.trim() || devFallbackKey();
  return key ? apiKeyAuth(key) : undefined;
}

export function credentialKind(authInfo: AuthInfo | undefined): CredentialKind {
  return authInfo?.extra?.credential === "user" ? "user" : "apiKey";
}

function apiKeyAuth(key: string): AuthInfo {
  return {
    token: key,
    clientId: "codesignal-mcp",
    scopes: [],
    extra: { credential: "apiKey" satisfies CredentialKind },
  };
}

// Gated to non-production so a deployed server can never silently serve the
// operator's own CodeSignal data to unauthenticated callers. Note: in dev this
// also lets write tools run against the operator's key without an explicit
// token, so treat a local dev server as privileged.
function devFallbackKey(): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  return process.env.CODESIGNAL_API_KEY?.trim() || undefined;
}
