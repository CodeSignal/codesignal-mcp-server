const DEFAULT_RESOURCE_URL = "https://codesignal.com/api/mcp";

export interface OAuthConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  resourceUrl: string;
}

let warnedIncompleteConfig = false;

export function isOAuthIssuerConfigured(): boolean {
  return Boolean(process.env.OAUTH_ISSUER_URL?.trim());
}

export function getOAuthConfig(): OAuthConfig | null {
  const issuerUrl = process.env.OAUTH_ISSUER_URL?.trim();
  if (!issuerUrl) {
    return null;
  }

  const clientId = process.env.OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    if (!warnedIncompleteConfig) {
      warnedIncompleteConfig = true;
      console.warn(
        "OAUTH_ISSUER_URL is set but OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET is missing; OAuth stays disabled.",
      );
    }
    return null;
  }

  return {
    issuerUrl,
    clientId,
    clientSecret,
    resourceUrl: (process.env.MCP_RESOURCE_URL?.trim() || DEFAULT_RESOURCE_URL).replace(
      /\/+$/,
      "",
    ),
  };
}
