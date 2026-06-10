import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetCompany } from "./get-company";
import { registerGetInterview } from "./get-interview";
import { registerGetInterviewTemplate } from "./get-interview-template";
import { registerGetRole } from "./get-role";
import { registerGetStandardizedTest } from "./get-standardized-test";
import { registerGetStandardizedTestSession } from "./get-standardized-test-session";
import { registerGetTask } from "./get-task";
import { registerGetTest } from "./get-test";
import { registerGetTestSession } from "./get-test-session";
import { registerGetUser } from "./get-user";
import {
  registerCreateInterview,
  registerDeleteInterview,
  registerEditInterview,
} from "./interview-mutations";
import {
  registerCreateInterviewTemplate,
  registerDeleteInterviewTemplate,
  registerEditInterviewTemplate,
} from "./interview-template-mutations";
import { registerListCertifiedAssessments } from "./list-certified-assessments";
import { registerListCompanyRoles } from "./list-company-roles";
import { registerListInterviews } from "./list-interviews";
import { registerListInterviewTemplates } from "./list-interview-templates";
import { registerListTestLabels } from "./list-test-labels";
import { registerListTestSessions } from "./list-test-sessions";
import { registerListTests } from "./list-tests";
import { registerLookupAtsTestSessions } from "./lookup-ats-test-sessions";
import {
  registerCreateTest,
  registerCreateTestFromCertifiedAssessment,
  registerDuplicateTest,
  registerEditTest,
} from "./test-mutations";
import {
  registerArchiveTestSession,
  registerCreateTestSession,
  registerDeleteTestSession,
  registerEditTestSessionDuration,
  registerEditTestSessionExpiration,
  registerGradeTestResult,
  registerMarkTestResultAsGraded,
  registerReactivateTestSession,
  registerResendTestSession,
  registerSetTestSessionReminders,
  registerUnarchiveTestSession,
} from "./test-session-mutations";

// Read-only tools.
const readRegistrations = [
  registerGetCompany,
  registerListTests,
  registerGetTest,
  registerListTestLabels,
  registerListCertifiedAssessments,
  registerGetStandardizedTest,
  registerListTestSessions,
  registerGetTestSession,
  registerGetStandardizedTestSession,
  registerLookupAtsTestSessions,
  registerGetTask,
  registerListInterviews,
  registerGetInterview,
  registerListInterviewTemplates,
  registerGetInterviewTemplate,
  registerGetUser,
  registerListCompanyRoles,
  registerGetRole,
];

// Write tools (mutations against live CodeSignal data).
const writeRegistrations = [
  registerCreateTestSession,
  registerDeleteTestSession,
  registerResendTestSession,
  registerReactivateTestSession,
  registerEditTestSessionDuration,
  registerEditTestSessionExpiration,
  registerSetTestSessionReminders,
  registerArchiveTestSession,
  registerUnarchiveTestSession,
  registerGradeTestResult,
  registerMarkTestResultAsGraded,
  registerCreateTest,
  registerCreateTestFromCertifiedAssessment,
  registerEditTest,
  registerDuplicateTest,
  registerCreateInterview,
  registerEditInterview,
  registerDeleteInterview,
  registerCreateInterviewTemplate,
  registerEditInterviewTemplate,
  registerDeleteInterviewTemplate,
];

export function registerAllTools(server: McpServer) {
  for (const register of [...readRegistrations, ...writeRegistrations]) {
    register(server);
  }
}
