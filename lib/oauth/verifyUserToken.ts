import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
} from "jose";
import { getAuthorizationServerMetadata } from "@/lib/oauth/authorizationServer";
import type { OAuthConfig } from "@/lib/oauth/config";

const SIGNING_ALGORITHMS = ["RS256"];

const jwkSets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function looksLikeJwt(token: string): boolean {
  try {
    return typeof decodeProtectedHeader(token).alg === "string";
  } catch {
    return false;
  }
}

export async function verifyUserToken(
  token: string,
  config: OAuthConfig,
): Promise<AuthInfo> {
  // withMcpAuth turns any throw here into a 401, so an unreachable or malformed
  // authorization server shows up to clients as a rejected token.
  const metadata = await getAuthorizationServerMetadata(config.issuerUrl);
  if (!metadata.jwks_uri) {
    throw new Error("Authorization server metadata has no jwks_uri.");
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, getJwkSet(metadata.jwks_uri), {
      issuer: config.issuerUrl,
      audience: config.resourceUrl,
      algorithms: SIGNING_ALGORITHMS,
      requiredClaims: ["exp", "sub"],
    }));
  } catch (error) {
    // jose errors carry the decoded claims; only the error code may reach logs.
    const code = error instanceof joseErrors.JOSEError ? error.code : "unknown";
    throw new Error(`Token rejected (${code}).`);
  }

  return {
    token,
    clientId: typeof payload.client_id === "string" ? payload.client_id : "unknown",
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
    expiresAt: payload.exp,
    resource: new URL(config.resourceUrl),
    extra: { credential: "user", subject: payload.sub },
  };
}

function getJwkSet(jwksUri: string) {
  let jwkSet = jwkSets.get(jwksUri);
  if (!jwkSet) {
    jwkSet = createRemoteJWKSet(new URL(jwksUri));
    jwkSets.set(jwksUri, jwkSet);
  }
  return jwkSet;
}
