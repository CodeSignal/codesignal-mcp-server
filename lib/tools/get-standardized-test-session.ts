import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_STANDARDIZED_TEST_SESSION } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetStandardizedTestSession(server: McpServer) {
  server.registerTool(
    "get_standardized_test_session",
    {
      title: "Get Standardized Test Session",
      description:
        "Get the report for a single standardized/certified test session " +
        "(candidate attempt) by ID, including certification status, overall and " +
        "per-task scores, core skill scores, and coding score. Timestamps are " +
        "milliseconds since epoch.",
      inputSchema: {
        id: z.string().describe("Standardized test session ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, GET_STANDARDIZED_TEST_SESSION, args),
  );
}
