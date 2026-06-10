import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_STANDARDIZED_TEST } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetStandardizedTest(server: McpServer) {
  server.registerTool(
    "get_standardized_test",
    {
      title: "Get Standardized / Certified Test",
      description:
        "Get detailed configuration for a standardized or certified assessment " +
        "by ID: type, duration (ms), description, intro/outro messages, and the " +
        "underlying framework (skill sets, scoring model). Find IDs with " +
        "list_certified_assessments.",
      inputSchema: {
        id: z.string().describe("Standardized/certified test ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_STANDARDIZED_TEST, args),
  );
}
