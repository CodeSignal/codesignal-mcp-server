// Query documents written against the published CodeSignal GraphQL schema:
// https://developer.codesignal.com/graphql/types/
// Field selections are curated: lean for list views, rich for detail views.
// All Timestamp fields are milliseconds since epoch.

export const GET_COMPANY = /* GraphQL */ `
  query GetCompany($id: ID) {
    company(id: $id) {
      id
      alias
      name
      status
      clientType
      ownedEmailDomains
    }
  }
`;

export const LIST_TESTS = /* GraphQL */ `
  query ListTests(
    $first: Int!
    $offset: Int
    $titleSearchText: String
    $labels: [String!]
    $sortBy: CompanyTestSortBy
    $sortDirection: SortDirection
  ) {
    companyTests(
      first: $first
      offset: $offset
      titleSearchText: $titleSearchText
      labels: $labels
      sortBy: $sortBy
      sortDirection: $sortDirection
    ) {
      totalCount
      pageInfo {
        hasNextPage
      }
      tests {
        id
        title
        externalTitle
        duration
        labels
        createDate
      }
    }
  }
`;

export const GET_TEST = /* GraphQL */ `
  query GetTest($id: ID!) {
    companyTest(id: $id) {
      id
      title
      externalTitle
      internalDescription
      duration
      labels
      createDate
      scoringModel {
        type
      }
      scoreRangeLabels {
        label
        scoreRange {
          min
          max
        }
      }
      author {
        id
        username
        profile {
          name
        }
      }
    }
  }
`;

export const LIST_TEST_SESSIONS = /* GraphQL */ `
  query ListTestSessions($companyTestId: ID!, $first: Int, $offset: Int) {
    companyTestSessions(
      companyTestId: $companyTestId
      first: $first
      offset: $offset
    ) {
      id
      status
      maxScore
      testTaker {
        email
        firstName
        lastName
      }
      createDate
      startDate
      expirationDate
      finishDate
      result {
        score
        url
      }
    }
  }
`;

export const GET_TEST_SESSION = /* GraphQL */ `
  query GetTestSession($id: ID!) {
    companyTestSession(id: $id) {
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
      customDuration
      verificationStatus
      verificationRejectionReasons {
        name
        description
      }
      integrityReviewFinalized
      integrityReviewSuggested
      result {
        score
        solvedTaskCount
        url
        totalTimeClosed
        coreSkillScores {
          implementation
          problemSolving
          speed
        }
        versionedCodingScore {
          version
          value
        }
        taskResults {
          score
          solveTime
          timeSpent
          replayUrl
          sessionTask {
            maxScore
            task {
              id
              title
            }
          }
          solution {
            id
            __typename
            ... on CodingSolution {
              url
              sources {
                source
                language
                path
              }
            }
            ... on QuizSolution {
              answer
              options {
                description
                isCorrect
                isSelected
              }
            }
          }
        }
      }
    }
  }
`;

export const LOOKUP_ATS_TEST_SESSIONS = /* GraphQL */ `
  query LookupAtsTestSessions($id: String!, $idType: AtsIdType!) {
    atsCompanyTestSessions(id: $id, idType: $idType) {
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
      finishDate
      result {
        score
        url
      }
    }
  }
`;

export const LIST_INTERVIEWS = /* GraphQL */ `
  query ListInterviews($candidateEmail: String, $first: Int, $offset: Int) {
    liveInterviews(
      candidateEmail: $candidateEmail
      first: $first
      offset: $offset
    ) {
      id
      candidateName
      candidateEmail
      status
      startDate
      finishDate
      url
    }
  }
`;

export const GET_INTERVIEW = /* GraphQL */ `
  query GetInterview($liveInterviewId: ID!) {
    liveInterview(liveInterviewId: $liveInterviewId) {
      id
      candidateName
      candidateEmail
      status
      proctoringStatus
      startDate
      finishDate
      url
      shortenedUrl
      trackCandidateLocation
      interviewersFeedback {
        author {
          id
          username
          profile {
            name
          }
        }
        notes
        recommendedLevel
        evaluation
        categories {
          name
          attributes {
            name
            score
            notes
          }
        }
      }
    }
  }
`;

export const LIST_INTERVIEW_TEMPLATES = /* GraphQL */ `
  query ListInterviewTemplates($globalFilter: String, $first: Int!, $offset: Int!) {
    interviewTemplates(
      globalFilter: $globalFilter
      first: $first
      offset: $offset
    ) {
      totalCount
      pageInfo {
        hasNextPage
      }
      interviewTemplates {
        id
        name
        isCompanyDefault
        defaultExpirationTime
        hasAssociatedInterviews
        tasks {
          id
          title
        }
      }
    }
  }
`;

export const GET_INTERVIEW_TEMPLATE = /* GraphQL */ `
  query GetInterviewTemplate($interviewTemplateId: ID!, $liveInterviewId: ID) {
    interviewTemplate(
      interviewTemplateId: $interviewTemplateId
      liveInterviewId: $liveInterviewId
    ) {
      id
      name
      isCompanyDefault
      defaultExpirationTime
      hasAssociatedInterviews
      canEdit
      tasks {
        id
        title
      }
      taskCustomScores {
        id
        score
      }
      feedbackSettings {
        categories {
          name
          attributes {
            name
          }
        }
      }
      author {
        id
        username
        profile {
          name
        }
      }
    }
  }
`;

// Certified assessments available to the company, returned as Framework nodes.
// Powers list_certified_assessments. Requires the framework_read permission on
// the key; list_certified_assessments falls back to LIST_COMPANY_TEST_FRAMEWORKS
// when the key lacks it.
export const LIST_FRAMEWORKS = /* GraphQL */ `
  query ListFrameworks($globalFilter: String, $first: Int!, $offset: Int) {
    frameworks(globalFilter: $globalFilter, first: $first, offset: $offset) {
      totalCount
      pageInfo {
        hasNextPage
      }
      frameworks {
        id
        title
        description
        format
        duration
        scoringModel {
          type
        }
        skillSets {
          name
        }
      }
    }
  }
`;

// Frameworks are reachable from company-owned test nodes even when a key lacks
// framework_read (which the direct frameworks query requires). Tests built from
// a framework expose it here; tests built from scratch have framework: null.
export const LIST_COMPANY_TEST_FRAMEWORKS = /* GraphQL */ `
  query ListCompanyTestFrameworks(
    $companyId: ID
    $first: Int!
    $offset: Int
  ) {
    companyTests(companyId: $companyId, first: $first, offset: $offset) {
      totalCount
      pageInfo {
        hasNextPage
      }
      tests {
        id
        framework {
          id
          title
          description
          format
          duration
          scoringModel {
            type
          }
          skillSets {
            name
          }
        }
      }
    }
  }
`;

export const GET_STANDARDIZED_TEST = /* GraphQL */ `
  query GetStandardizedTest($id: ID!) {
    standardizedTest(id: $id) {
      id
      title
      type
      duration
      internalDescription
      introMessage
      outroMessage
      framework {
        id
        title
        description
        format
        duration
        scoringModel {
          type
        }
        skillSets {
          name
        }
      }
    }
  }
`;

export const GET_STANDARDIZED_TEST_SESSION = /* GraphQL */ `
  query GetStandardizedTestSession($id: ID!) {
    standardizedTestSession(id: $id) {
      id
      status
      maxScore
      test {
        id
        title
        type
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
      labels
      customDuration
      verificationStatus
      integrityReviewFinalized
      result {
        score
        solvedTaskCount
        certificationStatus
        coreSkillScores {
          implementation
          problemSolving
          speed
        }
        versionedCodingScore {
          version
          value
        }
        taskResults {
          score
          solveTime
          timeSpent
          replayUrl
          sessionTask {
            maxScore
            task {
              id
              title
            }
          }
        }
      }
    }
  }
`;

export const GET_TASK = /* GraphQL */ `
  query GetTask($id: ID!) {
    task(id: $id) {
      id
      title
      description
      generalType
      overviewType
      mode
      labels
      maxScore
    }
  }
`;

export const LIST_TEST_LABELS = /* GraphQL */ `
  query ListTestLabels($companyId: ID, $searchText: String, $first: Int!, $offset: Int) {
    testLabels(
      companyId: $companyId
      searchText: $searchText
      first: $first
      offset: $offset
    ) {
      totalCount
      pageInfo {
        hasNextPage
      }
      labels {
        title
        variant
      }
    }
  }
`;

export const GET_USER = /* GraphQL */ `
  query GetUser($userId: ID, $username: String) {
    user(userId: $userId, username: $username) {
      id
      username
      profile {
        name
        email
        avatarUrl
      }
      companyFields {
        company {
          id
          name
        }
        role {
          key
          title
        }
      }
    }
  }
`;

export const LIST_COMPANY_ROLES = /* GraphQL */ `
  query ListCompanyRoles($companyId: ID) {
    companyRoles(companyId: $companyId) {
      key
      title
      permissions
      companyId
      hasAssignees
    }
  }
`;

export const GET_ROLE = /* GraphQL */ `
  query GetRole($key: ID!) {
    role(key: $key) {
      key
      title
      permissions
      companyId
      hasAssignees
    }
  }
`;
