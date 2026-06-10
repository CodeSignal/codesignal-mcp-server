import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ARCHIVE_TEST_SESSION,
  CREATE_TEST_SESSION,
  DELETE_TEST_SESSION,
  EDIT_TEST_SESSION_DURATION,
  EDIT_TEST_SESSION_EXPIRATION,
  GRADE_TEST_RESULT,
  MARK_TEST_RESULT_GRADED,
  REACTIVATE_TEST_SESSION,
  RESEND_TEST_SESSION,
  SET_TEST_SESSION_REMINDERS,
  UNARCHIVE_TEST_SESSION,
} from "@/lib/codesignal/mutations";
import { emailReminderSchema, runGraphql } from "./shared";

const sendNotificationEmailSchema = z
  .boolean()
  .optional()
  .describe("Whether to send the candidate a notification email.");

export function registerCreateTestSession(server: McpServer) {
  server.registerTool(
    "create_test_session",
    {
      title: "Create Test Session (Invite Candidate)",
      description:
        "Create a test session for a candidate (i.e. invite them to a test). " +
        "Returns the session with its invitation URL. Durations are " +
        "milliseconds. Find test IDs with list_tests.",
      inputSchema: {
        testId: z.string().describe("ID of the test to send."),
        candidateEmail: z
          .string()
          .optional()
          .describe("Candidate email address."),
        candidateFirstName: z
          .string()
          .optional()
          .describe("Candidate first name."),
        candidateLastName: z
          .string()
          .optional()
          .describe("Candidate last name."),
        noInvitationEmail: z
          .boolean()
          .optional()
          .describe(
            "If true, do not send an invitation email (generate a link only).",
          ),
        preferExisting: z
          .boolean()
          .optional()
          .describe(
            "If true, reuse an existing matching session instead of creating a " +
              "new one when possible.",
          ),
        customDuration: z
          .number()
          .optional()
          .describe("Override the test duration for this session, in ms."),
        expireDuration: z
          .number()
          .optional()
          .describe("Milliseconds until the invitation expires if unused."),
        externalId: z
          .string()
          .optional()
          .describe("Your own external identifier to attach to the session."),
        postSessionRedirectUrl: z
          .string()
          .optional()
          .describe("URL to redirect the candidate to after finishing."),
        emailReminders: z
          .array(emailReminderSchema)
          .optional()
          .describe("Reminder emails to schedule for this session."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, CREATE_TEST_SESSION, { sessionFields: args }),
  );
}

export function registerDeleteTestSession(server: McpServer) {
  server.registerTool(
    "delete_test_session",
    {
      title: "Delete Test Session",
      description:
        "Permanently delete a test session by ID. This cannot be undone. " +
        "Optionally notify the candidate.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        sendNotificationEmail: sendNotificationEmailSchema,
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, DELETE_TEST_SESSION, args),
  );
}

export function registerResendTestSession(server: McpServer) {
  server.registerTool(
    "resend_test_session",
    {
      title: "Resend Test Session Invitation",
      description: "Resend the invitation email for a test session by ID.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => runGraphql(extra.authInfo, RESEND_TEST_SESSION, args),
  );
}

export function registerReactivateTestSession(server: McpServer) {
  server.registerTool(
    "reactivate_test_session",
    {
      title: "Reactivate Test Session",
      description:
        "Reactivate an expired or finished test session by ID so the candidate " +
        "can take it again. Optionally notify the candidate.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        sendNotificationEmail: sendNotificationEmailSchema,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => runGraphql(extra.authInfo, REACTIVATE_TEST_SESSION, args),
  );
}

export function registerEditTestSessionDuration(server: McpServer) {
  server.registerTool(
    "edit_test_session_duration",
    {
      title: "Edit Test Session Duration",
      description:
        "Set a custom duration (in milliseconds) for a test session by ID.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        customDuration: z
          .number()
          .describe("New duration for this session, in milliseconds."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, EDIT_TEST_SESSION_DURATION, args),
  );
}

export function registerEditTestSessionExpiration(server: McpServer) {
  server.registerTool(
    "edit_test_session_expiration",
    {
      title: "Edit Test Session Expiration",
      description:
        "Extend a test session's expiration. Provide the new expiration as " +
        "milliseconds since epoch. Can only extend, not shorten.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        expirationDate: z
          .number()
          .describe("New expiration time, in milliseconds since epoch."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, EDIT_TEST_SESSION_EXPIRATION, args),
  );
}

export function registerSetTestSessionReminders(server: McpServer) {
  server.registerTool(
    "set_test_session_reminders",
    {
      title: "Set Test Session Reminders",
      description:
        "Replace the scheduled reminder emails for a test session by ID. " +
        "Reminder template names must match templates configured on the test.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        reminders: z
          .array(emailReminderSchema)
          .describe("The full set of reminders to apply (replaces existing)."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, SET_TEST_SESSION_REMINDERS, args),
  );
}

export function registerArchiveTestSession(server: McpServer) {
  server.registerTool(
    "archive_test_session",
    {
      title: "Archive Test Session",
      description: "Archive a test session by ID (reversible with unarchive).",
      inputSchema: {
        id: z.string().describe("Test session ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => runGraphql(extra.authInfo, ARCHIVE_TEST_SESSION, args),
  );
}

export function registerUnarchiveTestSession(server: McpServer) {
  server.registerTool(
    "unarchive_test_session",
    {
      title: "Unarchive Test Session",
      description: "Unarchive a previously archived test session by ID.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => runGraphql(extra.authInfo, UNARCHIVE_TEST_SESSION, args),
  );
}

export function registerGradeTestResult(server: McpServer) {
  server.registerTool(
    "grade_test_result",
    {
      title: "Grade Test Result",
      description:
        "Manually set the score for one question (task) within a test session. " +
        "Provide the session ID, the task ID, and the score.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
        taskId: z.string().describe("Question (task) ID to grade."),
        score: z.number().int().describe("Score to assign for the task."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, GRADE_TEST_RESULT, args),
  );
}

export function registerMarkTestResultAsGraded(server: McpServer) {
  server.registerTool(
    "mark_test_result_graded",
    {
      title: "Mark Test Result As Graded",
      description:
        "Mark a test session's result as fully graded (finalizes manual " +
        "grading) by session ID.",
      inputSchema: {
        id: z.string().describe("Test session ID."),
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => runGraphql(extra.authInfo, MARK_TEST_RESULT_GRADED, args),
  );
}
