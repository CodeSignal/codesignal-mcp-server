import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CREATE_INTERVIEW,
  DELETE_INTERVIEW,
  EDIT_INTERVIEW,
} from "@/lib/codesignal/mutations";
import { runGraphql } from "./shared";

const interviewFields = {
  candidateEmail: z.string().optional().describe("Candidate email address."),
  candidateName: z.string().optional().describe("Candidate name."),
  teamId: z.string().optional().describe("Team ID to own the interview."),
  interviewerId: z
    .string()
    .optional()
    .describe("User ID of the assigned interviewer."),
  templateId: z
    .string()
    .optional()
    .describe("Interview template ID to base the interview on."),
  lockTemplate: z
    .boolean()
    .optional()
    .describe("Prevent the interviewer from changing the template's questions."),
  expirationTime: z
    .number()
    .int()
    .optional()
    .describe("Milliseconds until the interview link expires."),
  trackCandidateLocation: z
    .boolean()
    .optional()
    .describe("Track the candidate's location during the interview."),
  disableDescriptionCopy: z
    .boolean()
    .optional()
    .describe("Disable copying of question descriptions."),
};

export function registerCreateInterview(server: McpServer) {
  server.registerTool(
    "create_interview",
    {
      title: "Create Live Interview",
      description:
        "Create a live interview, optionally from a template and assigned to an " +
        "interviewer. Returns the interview with its shareable URL.",
      inputSchema: { ...interviewFields },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, CREATE_INTERVIEW, { interviewFields: args }),
  );
}

export function registerEditInterview(server: McpServer) {
  server.registerTool(
    "edit_interview",
    {
      title: "Edit Live Interview",
      description:
        "Update a live interview by ID. Only the fields you provide are changed.",
      inputSchema: {
        id: z.string().describe("Live interview ID to edit."),
        ...interviewFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => {
      const { id, ...fields } = args;
      return runGraphql(extra.authInfo, EDIT_INTERVIEW, {
        id,
        interviewFields: fields,
      });
    },
  );
}

export function registerDeleteInterview(server: McpServer) {
  server.registerTool(
    "delete_interview",
    {
      title: "Delete Live Interview",
      description: "Permanently delete a live interview by ID. Cannot be undone.",
      inputSchema: {
        id: z.string().describe("Live interview ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, DELETE_INTERVIEW, args),
  );
}
