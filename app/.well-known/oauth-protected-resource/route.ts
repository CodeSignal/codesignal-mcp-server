import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { getOAuthConfig } from "@/lib/oauth/config";

export function GET(req: Request): Response {
  const config = getOAuthConfig();
  if (!config) {
    return new Response(null, { status: 404 });
  }

  return protectedResourceHandler({
    authServerUrls: [config.issuerUrl],
    resourceUrl: config.resourceUrl,
  })(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
