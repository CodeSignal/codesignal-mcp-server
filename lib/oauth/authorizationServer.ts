import { z } from "zod";

const METADATA_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

const MetadataSchema = z.object({
  issuer: z.string(),
  token_endpoint: z.string().url(),
  jwks_uri: z.string().url().optional(),
});

export type AuthorizationServerMetadata = z.infer<typeof MetadataSchema>;

let cached: {
  issuerUrl: string;
  metadata: AuthorizationServerMetadata;
  fetchedAt: number;
} | null = null;
let inFlight: { issuerUrl: string; promise: Promise<AuthorizationServerMetadata> } | null =
  null;

export async function getAuthorizationServerMetadata(
  issuerUrl: string,
): Promise<AuthorizationServerMetadata> {
  if (
    cached &&
    cached.issuerUrl === issuerUrl &&
    Date.now() - cached.fetchedAt < METADATA_TTL_MS
  ) {
    return cached.metadata;
  }
  if (inFlight && inFlight.issuerUrl === issuerUrl) {
    return inFlight.promise;
  }

  const promise = fetchMetadata(issuerUrl)
    .then((metadata) => {
      cached = { issuerUrl, metadata, fetchedAt: Date.now() };
      return metadata;
    })
    .finally(() => {
      inFlight = null;
    });
  inFlight = { issuerUrl, promise };
  return promise;
}

function discoveryUrls(issuerUrl: string): string[] {
  const issuer = new URL(issuerUrl);
  const path = issuer.pathname.replace(/\/+$/, "");
  const origin = issuer.origin;
  const urls = [
    `${origin}/.well-known/oauth-authorization-server${path}`,
    `${origin}/.well-known/openid-configuration${path}`,
  ];
  if (path) {
    urls.push(`${origin}${path}/.well-known/openid-configuration`);
  }
  return urls;
}

async function fetchMetadata(
  issuerUrl: string,
): Promise<AuthorizationServerMetadata> {
  for (const url of discoveryUrls(issuerUrl)) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status === 404) {
      continue;
    }
    if (!response.ok) {
      throw new Error(
        `Authorization server metadata request failed (HTTP ${response.status}).`,
      );
    }

    const metadata = MetadataSchema.parse(await response.json());
    if (metadata.issuer !== issuerUrl) {
      throw new Error(
        "Authorization server metadata issuer does not match OAUTH_ISSUER_URL.",
      );
    }
    return metadata;
  }

  throw new Error("Authorization server metadata not found.");
}
