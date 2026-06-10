import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  CREATE_TEST,
  CREATE_TEST_FROM_FRAMEWORK,
  DUPLICATE_TEST,
  EDIT_TEST,
} from "@/lib/codesignal/mutations";
import {
  emailReminderSchema,
  emailReminderTemplateSchema,
  runGraphql,
  scoreRangeLabelSchema,
  taskSlotSchema,
} from "./shared";

// Optional fields common to creating and editing a test.
const sharedTestFields = {
  internalDescription: z
    .string()
    .optional()
    .describe("Internal (recruiter-facing) description."),
  labels: z.array(z.string()).optional().describe("Test labels."),
  defaultExpiration: z
    .number()
    .optional()
    .describe("Default invitation expiration, in milliseconds."),
  scoreRangeLabels: z
    .array(scoreRangeLabelSchema)
    .optional()
    .describe("Labeled score ranges shown on results."),
  hideScoresFromCandidate: z
    .boolean()
    .optional()
    .describe("Hide scores from the candidate."),
  autoResolveTitleConflict: z
    .boolean()
    .optional()
    .describe("Auto-append a suffix if the title already exists."),
  defaultSender: z
    .string()
    .optional()
    .describe("User ID of the default invitation sender."),
  timeZone: z.string().optional().describe("IANA time zone for the test."),
  emailReminderTemplates: z
    .array(emailReminderTemplateSchema)
    .optional()
    .describe("Reminder email templates available on the test."),
  emailReminders: z
    .array(emailReminderSchema)
    .optional()
    .describe("Default reminders applied to new sessions."),
};

export function registerCreateTest(server: McpServer) {
  server.registerTool(
    "create_test",
    {
      title: "Create Test",
      description:
        "Create a new company test (assessment) from your own questions. " +
        "Durations are milliseconds. Find question (task) IDs to put in slots " +
        "via interview templates, existing tests, or get_task.",
      inputSchema: {
        title: z.string().describe("Internal test title."),
        externalTitle: z
          .string()
          .describe("Title shown to candidates."),
        introMessage: z
          .string()
          .describe("Message shown before the test starts."),
        outroMessage: z
          .string()
          .describe("Message shown after the test finishes."),
        duration: z
          .number()
          .describe("Total test duration, in milliseconds."),
        tasks: z
          .array(taskSlotSchema)
          .min(1)
          .describe("Question slots that make up the test."),
        companyId: z
          .string()
          .optional()
          .describe("Company ID. Omit to use the key's company."),
        authorUserId: z
          .string()
          .optional()
          .describe("User ID to record as the test author."),
        ...sharedTestFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => runGraphql(extra.authInfo, CREATE_TEST, { testFields: args }),
  );
}

export function registerCreateTestFromCertifiedAssessment(server: McpServer) {
  server.registerTool(
    "create_test_from_certified_assessment",
    {
      title: "Create Test From Certified Assessment",
      description:
        "Create a ready-to-send test from a certified assessment (framework). " +
        "Duration and questions come from the framework; title, messaging, and " +
        "labels are customizable. Find framework IDs with " +
        "list_certified_assessments.",
      inputSchema: {
        frameworkId: z
          .string()
          .describe("Certified assessment (framework) ID."),
        title: z.string().describe("Internal test title."),
        externalTitle: z.string().describe("Title shown to candidates."),
        introMessage: z
          .string()
          .optional()
          .describe("Message shown before the test starts."),
        outroMessage: z
          .string()
          .optional()
          .describe("Message shown after the test finishes."),
        companyId: z
          .string()
          .optional()
          .describe("Company ID. Omit to use the key's company."),
        authorUserId: z
          .string()
          .optional()
          .describe("User ID to record as the test author."),
        resultDateLimit: z
          .number()
          .optional()
          .describe("Result availability cutoff, in milliseconds since epoch."),
        ...sharedTestFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) =>
      runGraphql(extra.authInfo, CREATE_TEST_FROM_FRAMEWORK, {
        testFields: args,
      }),
  );
}

// Editable fields for an existing test (all optional).
const editableTestFields = {
  title: z.string().optional().describe("Internal test title."),
  externalTitle: z.string().optional().describe("Title shown to candidates."),
  introMessage: z.string().optional().describe("Pre-test message."),
  outroMessage: z.string().optional().describe("Post-test message."),
  duration: z
    .number()
    .optional()
    .describe("Total test duration, in milliseconds."),
  tasks: z
    .array(taskSlotSchema)
    .optional()
    .describe("Question slots (replaces existing slots)."),
  resultDateLimit: z
    .number()
    .optional()
    .describe("Result availability cutoff, in milliseconds since epoch."),
  ...sharedTestFields,
};

export function registerEditTest(server: McpServer) {
  server.registerTool(
    "edit_test",
    {
      title: "Edit Test",
      description:
        "Update an existing company test by ID. Only the fields you provide are " +
        "changed; note that providing `tasks` replaces the test's question " +
        "slots. Durations are milliseconds.",
      inputSchema: {
        id: z.string().describe("Company test ID to edit."),
        ...editableTestFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    (args, extra) => {
      const { id, ...testFields } = args;
      return runGraphql(extra.authInfo, EDIT_TEST, { id, testFields });
    },
  );
}

export function registerDuplicateTest(server: McpServer) {
  server.registerTool(
    "duplicate_test",
    {
      title: "Duplicate Test",
      description:
        "Duplicate an existing company test by ID, optionally overriding fields " +
        "on the copy. If no title is provided, a unique one is derived from the " +
        "source test's title.",
      inputSchema: {
        id: z.string().describe("Company test ID to duplicate."),
        ...editableTestFields,
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (args, extra) => {
      const { id, ...testFields } = args;
      return runGraphql(extra.authInfo, DUPLICATE_TEST, { id, testFields });
    },
  );
}
