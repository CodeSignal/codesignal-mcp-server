import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_TASK } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetTask(server: McpServer) {
  server.registerTool(
    "get_task",
    {
      title: "Get Question",
      description:
        "Get a single question (task) by ID: title, description/prompt, type, " +
        "mode, labels, and max score. Question IDs appear in test, test " +
        "session, and interview template results.",
      inputSchema: {
        id: z.string().describe("Question (task) ID."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_TASK, args),
  );
}
