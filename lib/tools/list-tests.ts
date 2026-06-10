import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_TESTS } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListTests(server: McpServer) {
  server.registerTool(
    "list_tests",
    {
      title: "List Tests",
      description:
        "List the company's CodeSignal tests (assessments) with optional title " +
        "search, label filtering, and sorting. Returns lean summaries; use " +
        "get_test for full details. Timestamps are milliseconds since epoch.",
      inputSchema: {
        first: firstSchema,
        offset: offsetSchema,
        titleSearchText: z
          .string()
          .optional()
          .describe("Case-insensitive partial match on test title."),
        labels: z
          .array(z.string())
          .optional()
          .describe("Only tests that have ALL of these labels are returned."),
        sortBy: z
          .enum(["title", "createDate"])
          .optional()
          .describe("Field to sort by. Defaults to title."),
        sortDirection: z
          .enum(["asc", "desc"])
          .optional()
          .describe("Sort direction. Defaults to asc."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LIST_TESTS, args),
  );
}
