import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_ROLE } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetRole(server: McpServer) {
  server.registerTool(
    "get_role",
    {
      title: "Get Role",
      description:
        "Get a single role by its key, including the full list of permission " +
        "keys it grants. Find role keys with list_company_roles.",
      inputSchema: {
        key: z.string().describe("Role key."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_ROLE, args),
  );
}
