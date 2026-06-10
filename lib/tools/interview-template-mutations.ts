import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CREATE_INTERVIEW_TEMPLATE,
  DELETE_INTERVIEW_TEMPLATE,
  EDIT_INTERVIEW_TEMPLATE,
} from "@/lib/codesignal/mutations";
import { runGraphql } from "./shared";

const taskCustomScoreSchema = z
  .object({
    id: z.string().describe("Question (task) ID."),
    score: z.number().int().describe("Custom max score for this question."),
  })
  .describe("Per-question custom score (TaskCustomScoreInput).");

const defaultExpirationTimeInHoursSchema = z
  .number()
  .int()
  .optional()
  .describe("Default interview link expiration, in hours.");

export function registerCreateInterviewTemplate(server: McpServer) {
  server.registerTool(
    "create_interview_template",
    {
      title: "Create Interview Template",
      description:
        "Create a live-interview template from a set of questions. companyId is " +
        "required by the API — get it from get_company. Find question IDs via " +
        "get_task or existing templates.",
      inputSchema: {
        name: z.string().describe("Template name."),
        taskIds: z
          .array(z.string())
          .min(1)
          .describe("Question (task) IDs included in the template."),
        companyId: z
          .string()
          .describe("Company ID (see get_company)."),
        teamId: z.string().optional().describe("Team ID to own the template."),
        taskCustomScores: z
          .array(taskCustomScoreSchema)
          .optional()
          .describe("Optional per-question custom scores."),
        defaultExpirationTimeInHours: defaultExpirationTimeInHoursSchema,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, CREATE_INTERVIEW_TEMPLATE, {
        interviewTemplateFields: args,
      }),
  );
}

export function registerEditInterviewTemplate(server: McpServer) {
  server.registerTool(
    "edit_interview_template",
    {
      title: "Edit Interview Template",
      description:
        "Update an interview template by ID. Only the fields you provide are " +
        "changed; providing taskIds replaces the template's questions.",
      inputSchema: {
        interviewTemplateId: z
          .string()
          .describe("Interview template ID to edit."),
        name: z.string().optional().describe("Template name."),
        taskIds: z
          .array(z.string())
          .optional()
          .describe("Question (task) IDs (replaces existing)."),
        teamId: z.string().optional().describe("Team ID to own the template."),
        taskCustomScores: z
          .array(taskCustomScoreSchema)
          .optional()
          .describe("Per-question custom scores (replaces existing)."),
        defaultExpirationTimeInHours: defaultExpirationTimeInHoursSchema,
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => {
      const { interviewTemplateId, ...fields } = args;
      return runGraphql(extra.authInfo, EDIT_INTERVIEW_TEMPLATE, {
        interviewTemplateId,
        interviewTemplateFields: fields,
      });
    },
  );
}

export function registerDeleteInterviewTemplate(server: McpServer) {
  server.registerTool(
    "delete_interview_template",
    {
      title: "Delete Interview Template",
      description:
        "Permanently delete an interview template by ID. Cannot be undone.",
      inputSchema: {
        interviewTemplateId: z.string().describe("Interview template ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, DELETE_INTERVIEW_TEMPLATE, args),
  );
}
