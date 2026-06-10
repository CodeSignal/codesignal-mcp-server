import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_INTERVIEW_TEMPLATES } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListInterviewTemplates(server: McpServer) {
  server.registerTool(
    "list_interview_templates",
    {
      title: "List Interview Templates",
      description:
        "List the company's CodeSignal interview templates with optional name " +
        "search. Each template includes its questions (id and title), default " +
        "expiration time (ms), and whether it is the company default.",
      inputSchema: {
        globalFilter: z
          .string()
          .optional()
          .describe("Search templates by name."),
        first: firstSchema,
        offset: offsetSchema,
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LIST_INTERVIEW_TEMPLATES, args),
  );
}
