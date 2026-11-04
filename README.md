# CodeSignal MCP Server

Remote [MCP](https://modelcontextprotocol.io) server that exposes the [CodeSignal GraphQL API](https://developer.codesignal.com/graphql/types/) as tools for AI agents: tests (assessments), certified assessments, test sessions (candidate attempts and reports), live interviews, interview templates, questions, users, and roles.

Built with Next.js and [`mcp-handler`](https://github.com/vercel/mcp-handler). The official MCP endpoint is served at `https://codesignal.com/api/mcp` over streamable HTTP.

## Authentication

Every request must carry a credential. The server never persists or logs credentials, and never forwards a user's sign-in token to the CodeSignal API.

### Sign in with CodeSignal (OAuth)

For MCP clients whose remote-server support is OAuth-only, such as Claude.ai and ChatGPT connectors. The user signs in with their CodeSignal account (including SSO) and approves access once; every tool call then runs as that user, limited to their role's permissions.

Add `https://codesignal.com/api/mcp` as a custom connector, choose to use your own OAuth client ("Use your own OAuth client" in Claude, "predefined OAuth client" in ChatGPT), and enter the client ID published by CodeSignal; leave the secret blank unless CodeSignal gave you one.

### API key (bring your own key)

For clients that support custom headers on remote servers, such as Claude Code, Cursor and Windsurf. The caller's own CodeSignal API key is forwarded to the [CodeSignal GraphQL API](https://developer.codesignal.com/graphql/) on every tool call.

API keys are available on paid CodeSignal plans; see [Creating and Managing API Keys](https://support.codesignal.com/hc/en-us/articles/11151285811223-Creating-and-Managing-API-Keys). Keys carry granular permissions; a permission error from a tool means the key lacks access to that resource.

Provide the key either way:

- `Authorization: Bearer <your CodeSignal API key>` (preferred)
- `X-CodeSignal-Key: <your CodeSignal API key>`

## Connecting from a client

Claude.ai, Claude Desktop and ChatGPT: add `https://codesignal.com/api/mcp` as a custom connector and sign in when prompted (see [Sign in with CodeSignal](#sign-in-with-codesignal-oauth)).

Claude Code:

```bash
claude mcp add --transport http codesignal https://codesignal.com/api/mcp \
  --header "Authorization: Bearer <your CodeSignal API key>"
```

Cursor, Windsurf, and other clients with `mcpServers`-style JSON config:

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

The endpoint runs at `http://localhost:3000/api/mcp`. Outside production only, requests without a credential fall back to `CODESIGNAL_API_KEY` from `.env` — treat a local dev server as privileged. To exercise OAuth locally, set the OAuth variables from `.env.example`.

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm build`.

## Deployment

Standard Next.js app — deploy to Vercel (or any Next.js host). In production the dev fallback key is disabled and every caller must bring a credential. API-key auth needs no environment variables. OAuth is enabled by setting `OAUTH_ISSUER_URL`, `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET`, plus `MCP_RESOURCE_URL` when the server is served from another URL (see `.env.example`); unsetting `OAUTH_ISSUER_URL` turns it off again. `CODESIGNAL_GRAPHQL_URL` overrides the API endpoint.

## Project layout

- `app/api/mcp/route.ts` — MCP endpoint, auth wrapper, server instructions
- `app/.well-known/oauth-protected-resource/route.ts` — OAuth protected resource metadata (RFC 9728)
- `lib/auth.ts` — credential extraction: OAuth user tokens or API keys (Bearer / `X-CodeSignal-Key`, dev fallback)
- `lib/oauth/` — authorization server discovery, user token verification, token exchange
- `lib/codesignal/` — GraphQL client (timeout, rate-limit retry, sanitized errors), query and mutation documents
- `lib/tools/` — tool registrations (zod input schemas, annotations), shared helpers, registry

## License

[Apache-2.0](LICENSE)
