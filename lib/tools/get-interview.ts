import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_INTERVIEW } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetInterview(server: McpServer) {
  server.registerTool(
    "get_interview",
    {
      title: "Get Interview",
      description:
        "Get details for a single CodeSignal live interview by ID: candidate, " +
        "status, proctoring status, interviewer feedback (notes, evaluation, " +
        "scored categories), and interview links. Timestamps are milliseconds " +
        "since epoch.",
      inputSchema: {
        liveInterviewId: z.string().describe("Live interview ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_INTERVIEW, args),
  );
}
