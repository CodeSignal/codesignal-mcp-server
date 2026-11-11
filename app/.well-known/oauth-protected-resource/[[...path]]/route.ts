import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { getOAuthConfig } from "@/lib/oauth/config";

const WELL_KNOWN_PATH = "/.well-known/oauth-protected-resource";

export function GET(req: Request): Response {
  const config = getOAuthConfig();
  if (!config || !isMetadataPath(new URL(req.url).pathname, config.resourceUrl)) {
    return new Response(null, { status: 404 });
  }

  return protectedResourceHandler({
    authServerUrls: [config.issuerUrl],
    resourceUrl: config.resourceUrl,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();

function isMetadataPath(pathname: string, resourceUrl: string): boolean {
  const requested = pathname.replace(/\/+$/, "");
  const resourcePath = new URL(resourceUrl).pathname.replace(/\/+$/, "");
  return requested === WELL_KNOWN_PATH || requested === `${WELL_KNOWN_PATH}${resourcePath}`;
}
