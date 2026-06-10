import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LOOKUP_ATS_TEST_SESSIONS } from "@/lib/codesignal/queries";
import { runGraphql } from "./shared";

export function registerLookupAtsTestSessions(server: McpServer) {
  server.registerTool(
    "lookup_ats_test_sessions",
    {
      title: "Lookup ATS Test Sessions",
      description:
        "Find CodeSignal test sessions by an ATS-specific ID (currently " +
        "Greenhouse application or candidate IDs). Useful for connecting ATS " +
        "records to CodeSignal results.",
      inputSchema: {
        id: z.string().describe("The ATS application or candidate ID."),
        idType: z
          .enum(["greenhouseApplicationId", "greenhouseCandidateId"])
          .describe("The type of ATS ID provided."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, LOOKUP_ATS_TEST_SESSIONS, args),
  );
}
