# CodeSignal MCP Server

Remote [MCP](https://modelcontextprotocol.io) server that exposes the [CodeSignal GraphQL API](https://developer.codesignal.com/graphql/types/) as tools for AI agents: tests (assessments), certified assessments, test sessions (candidate attempts and reports), live interviews, interview templates, questions, users, and roles.

Built with Next.js and [`mcp-handler`](https://github.com/vercel/mcp-handler). The official MCP endpoint is served at `https://codesignal.com/api/mcp` over streamable HTTP.

## Authentication (bring your own key)

Every request must carry the caller's own CodeSignal API key, which is forwarded to the CodeSignal GraphQL API. Keys are never stored or logged.

Provide the key either way:

- `Authorization: Bearer <your CodeSignal API key>` (preferred)
- `X-CodeSignal-Key: <your CodeSignal API key>`

Example client configuration:

```json
{
  "mcpServers": {
    "codesignal": {
      "url": "https://codesignal.com/api/mcp",
      "headers": {
        "Authorization": "Bearer <your CodeSignal API key>"
      }
    }
  }
}
```

Keys are issued by CodeSignal and carry granular permissions; a permission error from a tool means the key lacks access to that resource.

## Tools

Read tools (`get_*` / `list_*` / `lookup_*`) are safe; write tools (`create_*` / `edit_*` / `delete_*` / etc.) modify live production data.

- **Company & access**: `get_company`, `get_user`, `list_company_roles`, `get_role`
- **Tests**: `list_tests`, `get_test`, `list_test_labels`, `create_test`, `edit_test`, `duplicate_test`
- **Certified assessments**: `list_certified_assessments`, `get_standardized_test`, `create_test_from_certified_assessment`
- **Test sessions**: `list_test_sessions`, `get_test_session`, `get_standardized_test_session`, `lookup_ats_test_sessions`, `create_test_session`, `resend_test_session`, `reactivate_test_session`, `edit_test_session_duration`, `edit_test_session_expiration`, `set_test_session_reminders`, `archive_test_session`, `unarchive_test_session`, `grade_test_result`, `mark_test_result_graded`, `delete_test_session`
- **Live interviews**: `list_interviews`, `get_interview`, `create_interview`, `edit_interview`, `delete_interview`
- **Interview templates**: `list_interview_templates`, `get_interview_template`, `create_interview_template`, `edit_interview_template`, `delete_interview_template`
- **Questions**: `get_task`

Conventions: timestamps and durations are milliseconds unless a field name says otherwise (e.g. `defaultExpirationTimeInHours`).

## Local development

```bash
pnpm install
cp .env.example .env   # optional dev-only fallback key
pnpm dev
```

The endpoint runs at `http://localhost:3000/api/mcp`. Outside production only, requests without a key fall back to `CODESIGNAL_API_KEY` from `.env` — treat a local dev server as privileged.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Deployment

Standard Next.js app — deploy to Vercel (or any Next.js host) with no required environment variables. In production the dev fallback key is disabled and every caller must bring their own key.

## Project layout

- `app/api/mcp/route.ts` — MCP endpoint, auth wrapper, server instructions
- `lib/auth.ts` — API key extraction (Bearer / `X-CodeSignal-Key`, dev fallback)
- `lib/codesignal/` — GraphQL client (timeout, rate-limit retry, sanitized errors), query and mutation documents
- `lib/tools/` — tool registrations (zod input schemas, annotations), shared helpers, registry

## License

[Apache-2.0](LICENSE)
