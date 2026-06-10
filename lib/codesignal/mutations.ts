// Mutation documents written against the published CodeSignal GraphQL schema:
// https://developer.codesignal.com/graphql/types/mutation.doc.html
// These perform writes against the caller's live CodeSignal company data.
// All Timestamp/duration fields are milliseconds.

// Shared confirmation selection for mutations that return a CompanyTestSession.
const SESSION_SUMMARY = /* GraphQL */ `
  id
  status
  maxScore
  test {
    id
    title
  }
  testTaker {
    email
    firstName
    lastName
  }
  createDate
  startDate
  expirationDate
  finishDate
  invitationUrl
  labels
`;

const TEST_SUMMARY = /* GraphQL */ `
  id
  title
  externalTitle
  duration
  labels
  createDate
`;

// --- Test sessions (candidate lifecycle) ---

export const CREATE_TEST_SESSION = /* GraphQL */ `
  mutation CreateTestSession($sessionFields: TestSessionInput!) {
    createCompanyTestSession(sessionFields: $sessionFields) {
      ${SESSION_SUMMARY}
      publicInvitationId
    }
  }
`;

export const DELETE_TEST_SESSION = /* GraphQL */ `
  mutation DeleteTestSession($id: ID!, $sendNotificationEmail: Boolean) {
    deleteCompanyTestSession(id: $id, sendNotificationEmail: $sendNotificationEmail)
  }
`;

export const RESEND_TEST_SESSION = /* GraphQL */ `
  mutation ResendTestSession($id: ID!) {
    resendCompanyTestSession(id: $id) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const REACTIVATE_TEST_SESSION = /* GraphQL */ `
  mutation ReactivateTestSession($id: ID!, $sendNotificationEmail: Boolean) {
    reactivateCompanyTestSession(id: $id, sendNotificationEmail: $sendNotificationEmail) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const EDIT_TEST_SESSION_DURATION = /* GraphQL */ `
  mutation EditTestSessionDuration($id: ID!, $customDuration: Float!) {
    editCompanyTestSessionDuration(id: $id, customDuration: $customDuration) {
      ${SESSION_SUMMARY}
      customDuration
    }
  }
`;

export const EDIT_TEST_SESSION_EXPIRATION = /* GraphQL */ `
  mutation EditTestSessionExpiration($id: ID!, $expirationDate: Timestamp!) {
    editCompanyTestSessionExpiration(id: $id, expirationDate: $expirationDate) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const SET_TEST_SESSION_REMINDERS = /* GraphQL */ `
  mutation SetTestSessionReminders($id: ID!, $reminders: [EmailReminder!]!) {
    setCompanyTestSessionReminders(id: $id, reminders: $reminders) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const ARCHIVE_TEST_SESSION = /* GraphQL */ `
  mutation ArchiveTestSession($id: ID!) {
    archiveCompanyTestSession(id: $id) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const UNARCHIVE_TEST_SESSION = /* GraphQL */ `
  mutation UnarchiveTestSession($id: ID!) {
    unarchiveCompanyTestSession(id: $id) {
      ${SESSION_SUMMARY}
    }
  }
`;

export const GRADE_TEST_RESULT = /* GraphQL */ `
  mutation GradeTestResult($id: ID!, $taskId: ID!, $score: Int!) {
    gradeCompanyTestResult(id: $id, taskId: $taskId, score: $score) {
      ${SESSION_SUMMARY}
      result {
        score
      }
    }
  }
`;

export const MARK_TEST_RESULT_GRADED = /* GraphQL */ `
  mutation MarkTestResultGraded($id: ID!) {
    markCompanyTestResultAsGraded(id: $id) {
      ${SESSION_SUMMARY}
    }
  }
`;

// --- Tests ---

export const CREATE_TEST = /* GraphQL */ `
  mutation CreateTest($testFields: CreateCompanyTestInput!) {
    createCompanyTest(testFields: $testFields) {
      ${TEST_SUMMARY}
    }
  }
`;

export const CREATE_TEST_FROM_FRAMEWORK = /* GraphQL */ `
  mutation CreateTestFromFramework($testFields: CreateCompanyTestFromFrameworkInput!) {
    createCompanyTestFromFramework(testFields: $testFields) {
      ${TEST_SUMMARY}
    }
  }
`;

export const EDIT_TEST = /* GraphQL */ `
  mutation EditTest($id: ID!, $testFields: EditCompanyTestInput!) {
    editCompanyTest(id: $id, testFields: $testFields) {
      ${TEST_SUMMARY}
    }
  }
`;

export const DUPLICATE_TEST = /* GraphQL */ `
  mutation DuplicateTest($id: ID!, $testFields: EditCompanyTestInput!) {
    duplicateCompanyTest(id: $id, testFields: $testFields) {
      ${TEST_SUMMARY}
    }
  }
`;

// --- Live interviews ---

export const CREATE_INTERVIEW = /* GraphQL */ `
  mutation CreateInterview($interviewFields: LiveInterviewInput) {
    createLiveInterview(interviewFields: $interviewFields) {
      id
      url
      shortenedUrl
      status
      candidateName
      candidateEmail
    }
  }
`;

export const EDIT_INTERVIEW = /* GraphQL */ `
  mutation EditInterview($id: ID!, $interviewFields: LiveInterviewInput!) {
    editLiveInterview(id: $id, interviewFields: $interviewFields) {
      id
      url
      shortenedUrl
      status
      candidateName
      candidateEmail
    }
  }
`;

export const DELETE_INTERVIEW = /* GraphQL */ `
  mutation DeleteInterview($id: ID!) {
    deleteLiveInterview(id: $id)
  }
`;

// --- Interview templates ---

export const CREATE_INTERVIEW_TEMPLATE = /* GraphQL */ `
  mutation CreateInterviewTemplate($interviewTemplateFields: CreateInterviewTemplateInput!) {
    createInterviewTemplate(interviewTemplateFields: $interviewTemplateFields) {
      id
      name
      isCompanyDefault
      defaultExpirationTime
      tasks {
        id
        title
      }
    }
  }
`;

export const EDIT_INTERVIEW_TEMPLATE = /* GraphQL */ `
  mutation EditInterviewTemplate(
    $interviewTemplateId: ID!
    $interviewTemplateFields: EditInterviewTemplateInput!
  ) {
    editInterviewTemplate(
      interviewTemplateId: $interviewTemplateId
      interviewTemplateFields: $interviewTemplateFields
    ) {
      id
      name
      defaultExpirationTime
      tasks {
        id
        title
      }
    }
  }
`;

export const DELETE_INTERVIEW_TEMPLATE = /* GraphQL */ `
  mutation DeleteInterviewTemplate($interviewTemplateId: ID!) {
    deleteInterviewTemplate(interviewTemplateId: $interviewTemplateId)
  }
`;
