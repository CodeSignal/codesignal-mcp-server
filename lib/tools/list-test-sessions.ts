import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_TEST_SESSIONS } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListTestSessions(server: McpServer) {
  server.registerTool(
    "list_test_sessions",
    {
      title: "List Test Sessions",
      description:
        "List test sessions (candidate attempts) for a given CodeSignal test, " +
        "ordered by finish date descending. Returns summaries with candidate, " +
        "status, and score; use get_test_session for the full report. The " +
        "CodeSignal API has no company-wide session listing, so a test ID is " +
        "required (find one with list_tests). Timestamps are milliseconds since epoch.",
      inputSchema: {
        companyTestId: z
          .string()
          .describe("ID of the test whose sessions should be listed."),
        first: firstSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LIST_TEST_SESSIONS, args),
  );
}
