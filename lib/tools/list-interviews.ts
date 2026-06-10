import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_INTERVIEWS } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListInterviews(server: McpServer) {
  server.registerTool(
    "list_interviews",
    {
      title: "List Interviews",
      description:
        "List the company's CodeSignal live interviews, optionally filtered by " +
        "candidate email (the only filter the CodeSignal API supports). Returns " +
        "summaries; use get_interview for details including interviewer " +
        "feedback. Timestamps are milliseconds since epoch.",
      inputSchema: {
        candidateEmail: z
          .string()
          .optional()
          .describe("Filter interviews by the candidate's email address."),
        first: firstSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LIST_INTERVIEWS, args),
  );
}
