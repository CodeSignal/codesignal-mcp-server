import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_TEST_SESSION } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetTestSession(server: McpServer) {
  server.registerTool(
    "get_test_session",
    {
      title: "Get Test Session",
      description:
        "Get the full report for a single test session (candidate attempt) by " +
        "ID: candidate, status, overall and per-task scores, core skill scores, " +
        "coding score, replay URLs, proctoring/verification status, and " +
        "integrity review flags. Timestamps are milliseconds since epoch.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_TEST_SESSION, args),
  );
}
