import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_COMPANY_ROLES } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerListCompanyRoles(server: McpServer) {
  server.registerTool(
    "list_company_roles",
    {
      title: "List Company Roles",
      description:
        "List the roles available to the company, including their permission " +
        "keys and whether anyone is assigned. Useful for understanding what a " +
        "given API key or user can access.",
      inputSchema: {
        companyId: z
          .string()
          .optional()
          .describe(
            "Company ID. Omit to use the company associated with the API key.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LIST_COMPANY_ROLES, args),
  );
}
