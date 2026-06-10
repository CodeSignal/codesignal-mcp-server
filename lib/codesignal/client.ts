const CODESIGNAL_GRAPHQL_URL = "https://app.codesignal.com/graphql";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RATE_LIMIT_RETRIES = 1;
const MAX_RETRY_DELAY_MS = 5_000;
const MAX_ERROR_BODY_CHARS = 300;

const INVALID_KEY_HINT =
  "CodeSignal rejected the API key. Check that the key is valid and active.";

const ACCESS_DENIED_HINT =
  "This usually means the CodeSignal API key lacks the permission required for this resource " +
  "(keys carry granular permissions, e.g. reading tests, test sessions, or interviews). " +
  "Ask CodeSignal support to enable the relevant permission for your key.";

export class CodeSignalApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CodeSignalApiError";
    this.status = status;
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

function formatGraphQLErrors(errors: GraphQLErrorShape[]): string {
  const messages = errors
    .map((error) => {
      const path = error.path?.length ? ` (at ${error.path.join(".")})` : "";
      return `${error.message ?? "Unknown error"}${path}`;
    })
    .join("; ");

  const unauthenticated = errors.some(
    (error) =>
      error.extensions?.code === "UNAUTHENTICATED" ||
      error.message?.toLowerCase().includes("invalid api key"),
  );
  if (unauthenticated) {
    return `CodeSignal API error: ${messages}. ${INVALID_KEY_HINT}`;
  }

  const accessDenied = errors.some(
    (error) =>
      error.extensions?.code === "FORBIDDEN" ||
      error.message?.toLowerCase().includes("access denied"),
  );
  if (accessDenied) {
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
  apiKey: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(CODESIGNAL_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
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
      throw new CodeSignalApiError(
        formatGraphQLErrors(parsed.errors),
        response.status,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new CodeSignalApiError(
        `${INVALID_KEY_HINT} (HTTP ${response.status})`,
        response.status,
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
