import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_CERTIFIED_ASSESSMENTS } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListCertifiedAssessments(server: McpServer) {
  server.registerTool(
    "list_certified_assessments",
    {
      title: "List Certified Assessments",
      description:
        "List the certified assessments (CodeSignal-built, pre-validated " +
        "frameworks) available to the company. Use the returned framework id " +
        "with create_test_from_certified_assessment to spin up a ready-to-send " +
        "test. Durations are milliseconds.",
      inputSchema: {
        first: firstSchema,
        offset: offsetSchema,
        companyId: z
          .string()
          .optional()
          .describe(
            "Company ID. Omit to use the company associated with the API key.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, LIST_CERTIFIED_ASSESSMENTS, args),
  );
}
