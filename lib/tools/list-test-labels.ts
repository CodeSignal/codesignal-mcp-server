import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LIST_TEST_LABELS } from "@/lib/codesignal/queries";
import { firstSchema, offsetSchema, runGraphql } from "./shared";

export function registerListTestLabels(server: McpServer) {
  server.registerTool(
    "list_test_labels",
    {
      title: "List Test Labels",
      description:
        "List the test labels defined for the company, with optional search. " +
        "Useful for discovering valid values to pass to list_tests (labels " +
        "filter) or when creating/editing tests.",
      inputSchema: {
        searchText: z
          .string()
          .optional()
          .describe("Case-insensitive partial match on label title."),
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
    (args, extra) => runGraphql(extra.authInfo, LIST_TEST_LABELS, args),
  );
}
