import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { AUTH_ERROR_MESSAGE } from "@/lib/auth";
import { CodeSignalApiError, executeQuery } from "@/lib/codesignal/client";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const firstSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_SIZE)
  .default(DEFAULT_PAGE_SIZE)
  .describe(`Number of results to return (1-${MAX_PAGE_SIZE}).`);

export const offsetSchema = z
  .number()
  .int()
  .min(0)
  .default(0)
  .describe("Number of results to skip, for pagination.");

function getApiKey(authInfo: AuthInfo | undefined): string {
  const key = authInfo?.token;
  if (!key) {
    throw new CodeSignalApiError(AUTH_ERROR_MESSAGE, 401);
  }
  return key;
}

function jsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(error: unknown): CallToolResult {
  const message =
    error instanceof Error ? error.message : "Unexpected error.";
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

/**
 * Runs a GraphQL document with the caller's key and wraps the result as a tool
 * response. Used by every tool so auth, execution, and error formatting stay
 * identical across reads and writes.
 */
export async function runGraphql(
  authInfo: AuthInfo | undefined,
  document: string,
  variables: Record<string, unknown> = {},
): Promise<CallToolResult> {
  try {
    const data = await executeQuery(getApiKey(authInfo), document, variables);
    return jsonResult(data);
  } catch (error) {
    return errorResult(error);
  }
}

// Reusable input sub-schemas mirroring CodeSignal GraphQL input objects, shared
// by the test/session/interview write tools.

export const emailReminderSchema = z
  .object({
    templateName: z
      .string()
      .describe("Name of an email reminder template configured on the test."),
    timeBeforeExpiration: z
      .number()
      .optional()
      .describe(
        "Milliseconds before the session expiration when the reminder is sent.",
      ),
  })
  .describe("A scheduled candidate email reminder (EmailReminder).");

export const emailReminderTemplateSchema = z
  .object({
    name: z.string().describe("Template name."),
    subjectLine: z.string().describe("Email subject line."),
    message: z.string().describe("Email body."),
  })
  .describe("An email reminder template definition (EmailReminderTemplate).");

export const scoreRangeLabelSchema = z
  .object({
    label: z.string().describe("Label shown for this score range."),
    scoreRange: z
      .object({
        min: z.number().int().optional().describe("Minimum score (inclusive)."),
        max: z.number().int().optional().describe("Maximum score (inclusive)."),
      })
      .describe("Inclusive score bounds for the label."),
  })
  .describe("A labeled score range (ScoreRangeLabelInput).");

export const taskSlotSchema = z
  .object({
    taskIds: z
      .array(z.string())
      .min(1)
      .describe(
        "Question (task) IDs for this slot. Multiple IDs make the slot " +
          "randomized across those questions.",
      ),
    availableLanguages: z
      .array(z.string())
      .optional()
      .describe("Restrict the languages a candidate may use (LanguageName)."),
    availableTestingTools: z
      .array(z.string())
      .optional()
      .describe("Restrict available testing tools (TestingToolName)."),
    score: z
      .number()
      .int()
      .optional()
      .describe("Max score for this slot."),
  })
  .describe("A question slot within a test (TaskSlotInput).");
