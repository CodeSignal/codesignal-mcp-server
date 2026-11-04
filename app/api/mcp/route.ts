import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { AUTH_ERROR_MESSAGE, verifyToken } from "@/lib/auth";
import { registerAllTools } from "@/lib/tools/registry";

export const maxDuration = 60;

const mcpHandler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {
    serverInfo: {
      name: "codesignal",
      version: "1.0.0",
    },
    instructions:
      "Access to CodeSignal hiring data: tests (assessments), certified " +
      "assessments, test sessions (candidate attempts and reports, including " +
      "submitted solutions/answers), live interviews, interview templates, " +
      "questions, users, and roles. Read tools (get_*/list_*) are safe; write " +
      "tools (create_*/edit_*/delete_*/grade_*/archive_*/etc.) modify live " +
      "production data — confirm intent before calling them, and prefer reading " +
      "first to obtain valid IDs. Timestamps and durations are milliseconds " +
      "unless a field name says otherwise (e.g. defaultExpirationTimeInHours). " +
      "Requests run as the signed-in CodeSignal user or with the caller's own " +
      "API key; a permission error means that user or key lacks access to the " +
      "resource.",
  },
  {
    basePath: "/api",
    maxDuration: 60,
    disableSse: true,
  },
);

const authedHandler = withMcpAuth(mcpHandler, verifyToken, { required: true });

// withMcpAuth answers a missing credential with a bare "No authorization
// provided"; give it an actionable body. A rejected credential keeps the
// library's OAuth error.
async function handler(req: Request): Promise<Response> {
  const response = await authedHandler(req);
  if (response.status !== 401 || hasCredential(req)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json");
  return new Response(
    JSON.stringify({
      error: "invalid_token",
      error_description: AUTH_ERROR_MESSAGE,
    }),
    { status: 401, headers },
  );
}

export { handler as GET, handler as POST, handler as DELETE };

// Mirrors what withMcpAuth and verifyToken accept as a credential.
function hasCredential(req: Request): boolean {
  const [scheme, token] = req.headers.get("authorization")?.split(" ") ?? [];
  const hasBearer = scheme?.toLowerCase() === "bearer" && Boolean(token?.trim());
  return hasBearer || Boolean(req.headers.get("x-codesignal-key")?.trim());
}
