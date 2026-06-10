import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_TEST } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetTest(server: McpServer) {
  server.registerTool(
    "get_test",
    {
      title: "Get Test",
      description:
        "Get detailed configuration for a single CodeSignal test by ID: " +
        "description, duration (ms), labels, scoring model, score range labels, " +
        "and author. Find test IDs with list_tests.",
      inputSchema: {
        id: z.string().describe("Company test ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_TEST, args),
  );
}
