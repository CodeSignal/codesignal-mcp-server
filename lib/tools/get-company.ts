import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_COMPANY } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetCompany(server: McpServer) {
  server.registerTool(
    "get_company",
    {
      title: "Get Company",
      description:
        "Get the CodeSignal company profile associated with the API key, or a " +
        "specific company by ID. Also useful as a quick connectivity and API-key check.",
      inputSchema: {
        id: z
          .string()
          .optional()
          .describe(
            "Company ID. Omit to use the company associated with the API key.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_COMPANY, args),
  );
}
