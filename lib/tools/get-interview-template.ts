import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_INTERVIEW_TEMPLATE } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerGetInterviewTemplate(server: McpServer) {
  server.registerTool(
    "get_interview_template",
    {
      title: "Get Interview Template",
      description:
        "Get a single interview template by ID: questions, per-question custom " +
        "scores, feedback settings (categories/attributes), author, and default " +
        "expiration. Find template IDs with list_interview_templates.",
      inputSchema: {
        interviewTemplateId: z
          .string()
          .describe("Interview template ID."),
        liveInterviewId: z
          .string()
          .optional()
          .describe(
            "Optional live interview ID to resolve the template in the context " +
              "of that interview.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GET_INTERVIEW_TEMPLATE, args),
  );
}
