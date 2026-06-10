import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GET_USER } from "@/lib/codesignal/queries";
import { errorResult, runGraphql } from "./shared";

export function registerGetUser(server: McpServer) {
  server.registerTool(
    "get_user",
    {
      title: "Get User",
      description:
        "Look up a CodeSignal user by ID or username (provide exactly one). " +
        "Returns profile (name, email) and company membership (company and " +
        "role). Useful for resolving test authors, senders, or interviewers.",
      inputSchema: {
        userId: z.string().optional().describe("Unique user ID."),
        username: z.string().optional().describe("Unique username."),
      },
      annotations: { readOnlyHint: true },
    },
    (args, extra) => {
      if (!args.userId && !args.username) {
        return errorResult(
          new Error("Provide either userId or username to look up a user."),
        );
      }
      return runGraphql(extra.authInfo, GET_USER, args);
    },
  );
}
