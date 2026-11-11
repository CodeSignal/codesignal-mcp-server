export const CODESIGNAL_APP_ORIGIN = "https://app.codesignal.com";
const DEFAULT_GRAPHQL_URL = `${CODESIGNAL_APP_ORIGIN}/graphql`;
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RATE_LIMIT_RETRIES = 1;
const MAX_RETRY_DELAY_MS = 5_000;
const MAX_ERROR_BODY_CHARS = 300;

const INVALID_KEY_HINT =
  "CodeSignal rejected the credential. Check that the API key is valid and active, " +
  "or reconnect the connector to sign in again.";

const ACCESS_DENIED_HINT =
  "This usually means the signed-in user or the API key lacks the permission required for " +
  "this resource (keys carry granular permissions, e.g. reading tests, test sessions, or " +
  "interviews; users are limited to their role). Ask a CodeSignal admin or support to " +
  "grant the relevant permission.";

export function getGraphqlUrl(): string {
  return process.env.CODESIGNAL_GRAPHQL_URL?.trim() || DEFAULT_GRAPHQL_URL;
}

export type CodeSignalErrorCode = "UNAUTHENTICATED" | "FORBIDDEN";

export class CodeSignalApiError extends Error {
  readonly status?: number;
  readonly code?: CodeSignalErrorCode;

  constructor(message: string, status?: number, code?: CodeSignalErrorCode) {
    super(message);
    this.name = "CodeSignalApiError";
    this.status = status;
    this.code = code;
  }
}

interface GraphQLErrorShape {
  message?: string;
  path?: Array<string | number>;
  extensions?: { code?: string };
}

interface GraphQLResponse<T> {
  data?: T | null;
  errors?: GraphQLErrorShape[];
}

function classifyGraphQLErrors(
  errors: GraphQLErrorShape[],
): CodeSignalErrorCode | undefined {
  const unauthenticated = errors.some(
    (error) =>
      error.extensions?.code === "UNAUTHENTICATED" ||
      error.message?.toLowerCase().includes("invalid api key"),
  );
  if (unauthenticated) {
    return "UNAUTHENTICATED";
  }

  const accessDenied = errors.some((error) => {
    // CodeSignal phrases permission failures inconsistently ("access denied",
    // "access-denied", "no permission", "permission denied"); normalize
    // separators so any of those forms maps to the permission hint.
    const normalized = error.message?.toLowerCase().replace(/[-_]/g, " ");
    return (
      error.extensions?.code === "FORBIDDEN" ||
      Boolean(normalized?.includes("access denied")) ||
      Boolean(normalized?.includes("no permission")) ||
      Boolean(normalized?.includes("permission denied"))
    );
  });
  if (accessDenied) {
    return "FORBIDDEN";
  }

  return undefined;
}

function formatGraphQLErrors(
  errors: GraphQLErrorShape[],
  code: CodeSignalErrorCode | undefined,
): string {
  const messages = errors
    .map((error) => {
      const path = error.path?.length ? ` (at ${error.path.join(".")})` : "";
      return `${error.message ?? "Unknown error"}${path}`;
    })
    .join("; ");

  if (code === "UNAUTHENTICATED") {
    return `CodeSignal API error: ${messages}. ${INVALID_KEY_HINT}`;
  }
  if (code === "FORBIDDEN") {
    return `CodeSignal API error: ${messages}. ${ACCESS_DENIED_HINT}`;
  }
  return `CodeSignal API error: ${messages}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(response: Response): number {
  const retryAfter = Number(response.headers.get("retry-after"));
  const base =
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : 1_000;
  return Math.min(base, MAX_RETRY_DELAY_MS) + Math.random() * 500;
}

/**
 * Executes a GraphQL query against the CodeSignal API.
 *
 * Error messages are constructed from scratch so the Authorization header can
 * never leak into logs or tool output. Response payloads are never logged.
 */
export async function executeQuery<T = unknown>(
  credential: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(getGraphqlUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${credential}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new CodeSignalApiError(
          `CodeSignal API request timed out after ${REQUEST_TIMEOUT_MS / 1_000}s.`,
        );
      }
      throw new CodeSignalApiError(
        "Could not reach the CodeSignal API (network error).",
      );
    }

    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      await sleep(retryDelayMs(response));
      continue;
    }

    let bodyText: string;
    try {
      bodyText = await response.text();
    } catch {
      throw new CodeSignalApiError(
        `Failed to read CodeSignal API response (HTTP ${response.status}).`,
        response.status,
      );
    }

    let parsed: GraphQLResponse<T> | undefined;
    try {
      parsed = JSON.parse(bodyText) as GraphQLResponse<T>;
    } catch {
      parsed = undefined;
    }

    // CodeSignal returns GraphQL errors at various HTTP statuses (including
    // 200 and 500), so check the errors array before the status code.
    if (parsed?.errors?.length) {
      const code = classifyGraphQLErrors(parsed.errors);
      throw new CodeSignalApiError(
        formatGraphQLErrors(parsed.errors, code),
        response.status,
        code,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new CodeSignalApiError(
        `${INVALID_KEY_HINT} (HTTP ${response.status})`,
        response.status,
        response.status === 403 ? "FORBIDDEN" : "UNAUTHENTICATED",
      );
    }

    if (!response.ok) {
      const snippet = bodyText.slice(0, MAX_ERROR_BODY_CHARS);
      throw new CodeSignalApiError(
        `CodeSignal API request failed (HTTP ${response.status})` +
          (snippet ? `: ${snippet}` : "."),
        response.status,
      );
    }

    if (parsed?.data == null) {
      throw new CodeSignalApiError(
        "CodeSignal API returned an empty or non-JSON response.",
        response.status,
      );
    }

    return parsed.data;
  }
}
