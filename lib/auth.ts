import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

export const AUTH_ERROR_MESSAGE =
  "Missing CodeSignal API key. Provide your key as a Bearer token " +
  '("Authorization: Bearer <your CodeSignal API key>") or in an ' +
  '"X-CodeSignal-Key" header. Keys are issued by CodeSignal — contact ' +
  "support@codesignal.com if you do not have one.";

/**
 * BYOK pass-through "verification": the key is not validated against
 * CodeSignal here (every tool call hits the API with it anyway); we only
 * require that a key is present. The key is carried to tool handlers as
 * `extra.authInfo.token` and is never stored or logged.
 */
export async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const key =
    bearerToken?.trim() ||
    req.headers.get("x-codesignal-key")?.trim() ||
    devFallbackKey();

  if (!key) {
    return undefined;
  }

  return {
    token: key,
    clientId: "codesignal-mcp",
    scopes: [],
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
