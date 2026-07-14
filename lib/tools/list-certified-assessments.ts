import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CodeSignalApiError, executeQuery } from "@/lib/codesignal/client";
import {
  LIST_COMPANY_TEST_FRAMEWORKS,
  LIST_FRAMEWORKS,
} from "@/lib/codesignal/queries";
import {
  errorResult,
  firstSchema,
  getApiKey,
  jsonResult,
  offsetSchema,
} from "./shared";

// The frameworks query rejects first > 20; companyTests allows up to 100.
const FRAMEWORKS_PAGE_SIZE = 20;
const SCAN_PAGE_SIZE = 100;
const DEFAULT_MAX_TESTS = 2000;
const MAX_TESTS_LIMIT = 10000;
// Hard ceiling on page requests so a bad pageInfo can never loop forever.
const MAX_PAGES = 200;

// Certified assessments are returned by the CodeSignal API as Framework nodes.
interface CertifiedAssessment {
  id: string;
  title: string;
  description: string | null;
  format: string | null;
  duration: number;
  scoringModel: { type: string } | null;
  skillSets: { name: string }[];
}

interface FrameworksPage {
  frameworks: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean };
    frameworks: CertifiedAssessment[];
  };
}

interface CompanyTestsPage {
  companyTests: {
    totalCount: number;
    pageInfo: { hasNextPage: boolean };
    tests: { id: string; framework: CertifiedAssessment | null }[];
  };
}

// Direct path: works only when the key has framework_read. Pages through the
// full result so the returned list is complete.
async function collectViaFrameworks(
  apiKey: string,
  globalFilter: string | undefined,
): Promise<CertifiedAssessment[]> {
  const all: CertifiedAssessment[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await executeQuery<FrameworksPage>(apiKey, LIST_FRAMEWORKS, {
      globalFilter,
      first: FRAMEWORKS_PAGE_SIZE,
      offset,
    });
    all.push(...data.frameworks.frameworks);
    if (!data.frameworks.pageInfo.hasNextPage) {
      break;
    }
    offset += data.frameworks.frameworks.length;
  }
  return all;
}

interface DerivedAssessment extends CertifiedAssessment {
  usedByTestCount: number;
  exampleTestId: string;
}

// Fallback path: derive assessments from company-owned test nodes, which only
// needs company_test_read. Dedupes by id and counts usage.
async function collectViaCompanyTests(
  apiKey: string,
  companyId: string | undefined,
  maxTests: number,
): Promise<{
  assessments: DerivedAssessment[];
  scannedTestCount: number;
  totalTestCount: number;
  truncated: boolean;
}> {
  const byId = new Map<string, DerivedAssessment>();
  let offset = 0;
  let scannedTestCount = 0;
  let totalTestCount = 0;
  let truncated = false;

  for (let page = 0; page < MAX_PAGES; page++) {
    const remaining = maxTests - scannedTestCount;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const data = await executeQuery<CompanyTestsPage>(
      apiKey,
      LIST_COMPANY_TEST_FRAMEWORKS,
      { companyId, first: Math.min(SCAN_PAGE_SIZE, remaining), offset },
    );
    const { tests, totalCount, pageInfo } = data.companyTests;
    totalTestCount = totalCount;

    for (const test of tests) {
      scannedTestCount++;
      if (!test.framework) {
        continue;
      }
      const existing = byId.get(test.framework.id);
      if (existing) {
        existing.usedByTestCount++;
      } else {
        byId.set(test.framework.id, {
          ...test.framework,
          usedByTestCount: 1,
          exampleTestId: test.id,
        });
      }
    }

    if (!pageInfo.hasNextPage) {
      break;
    }
    offset += tests.length;
    if (scannedTestCount >= maxTests) {
      truncated = true;
      break;
    }
  }

  return {
    assessments: [...byId.values()],
    scannedTestCount,
    totalTestCount,
    truncated,
  };
}

export function registerListCertifiedAssessments(server: McpServer) {
  server.registerTool(
    "list_certified_assessments",
    {
      title: "List Certified Assessments",
      description:
        "List the certified assessments (CodeSignal-built, pre-validated " +
        "assessment blueprints; the CodeSignal API calls these frameworks) " +
        "available to the company. Use a returned assessment id with " +
        "create_test_from_certified_assessment to spin up a ready-to-send test. " +
        "Results are sorted by title and paginated; a company can have hundreds " +
        "of assessments, so use globalFilter to narrow by title. Prefers the " +
        "direct frameworks query (needs the framework_read permission); if the " +
        "key lacks it, falls back to deriving assessments from existing company " +
        "tests — in that mode, assessments not attached to any test are not " +
        "listed. Durations are milliseconds.",
      inputSchema: {
        companyId: z
          .string()
          .optional()
          .describe(
            "Company ID, used only by the fallback test scan. Omit to use " +
              "the key's company; the direct query is always scoped to the " +
              "key's company.",
          ),
        globalFilter: z
          .string()
          .optional()
          .describe("Case-insensitive filter on assessment title."),
        first: firstSchema,
        offset: offsetSchema,
        maxTestsToScan: z
          .number()
          .int()
          .min(1)
          .max(MAX_TESTS_LIMIT)
          .default(DEFAULT_MAX_TESTS)
          .describe(
            "Fallback only: max company tests to scan when deriving " +
              "assessments from test nodes. Raise this if the result is marked " +
              "truncated.",
          ),
      },
      annotations: { readOnlyHint: true },
    },
    async (args, extra) => {
      try {
        const apiKey = getApiKey(extra.authInfo);
        const { companyId, globalFilter, first, offset, maxTestsToScan } = args;

        let source: "frameworks_query" | "company_tests";
        let allAssessments: CertifiedAssessment[];
        let scanMeta: Record<string, unknown> = {};

        try {
          allAssessments = await collectViaFrameworks(apiKey, globalFilter);
          source = "frameworks_query";
        } catch (error) {
          const denied =
            error instanceof CodeSignalApiError && error.code === "FORBIDDEN";
          if (!denied) {
            throw error;
          }
          const result = await collectViaCompanyTests(
            apiKey,
            companyId,
            maxTestsToScan,
          );
          // companyTests cannot filter on framework fields, so filter on title
          // client-side here; the direct path is filtered by the server.
          const filter = globalFilter?.toLowerCase();
          allAssessments = filter
            ? result.assessments.filter((a) =>
                a.title.toLowerCase().includes(filter),
              )
            : result.assessments;
          source = "company_tests";
          scanMeta = {
            note:
              "Key lacks framework_read; assessments derived from existing " +
              "company tests. Assessments not used by any test are not included.",
            scannedTestCount: result.scannedTestCount,
            totalTestCount: result.totalTestCount,
            scanTruncated: result.truncated,
          };
        }

        const sorted = allAssessments.sort((a, b) =>
          a.title.localeCompare(b.title),
        );
        const page = sorted.slice(offset, offset + first);

        return jsonResult({
          source,
          ...scanMeta,
          totalCount: sorted.length,
          offset,
          first,
          returnedCount: page.length,
          hasNextPage: offset + first < sorted.length,
          certifiedAssessments: page,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
