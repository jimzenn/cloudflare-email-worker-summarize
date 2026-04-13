# Known Issues

Tracked issues for future work. Last reviewed: 2026-04-13.

---

## High Priority

### No CI/CD pipeline
No GitHub Actions workflows exist. PRs and pushes are not automatically validated with a typecheck or build run. A minimal workflow should run `npm run typecheck && npm run build` on every push.

### No tests
No test framework is configured. The worker has no unit or integration tests. Adding Vitest (which has first-class Cloudflare Workers support via `@cloudflare/vitest-pool-workers`) would catch regressions in handlers, formatters, and utility functions.

---

## Medium Priority

### No linting or formatting setup
ESLint and Prettier are not configured. Code style is inconsistent across files. Recommend adding:
- `eslint` + `@typescript-eslint/eslint-plugin` for TypeScript-aware linting
- `prettier` for formatting
- A lint script in `package.json`

### `OPENAI_REASONING_MODEL` is not a reasoning model
`wrangler.toml` sets `OPENAI_REASONING_MODEL = "gpt-4o-2024-08-06"`, which is a standard model. To actually use OpenAI reasoning capability, this should be updated to `o1`, `o3`, or `o4-mini`.

### `preview_id` is a placeholder in wrangler.toml
`preview_id = "temp_preview_id"` under `[[kv_namespaces]]` is a placeholder. A real KV namespace ID for preview/dev environments should be created via `wrangler kv:namespace create EVENT_STORE --preview` and filled in.

### No local development secrets documentation
There is no `.env.example` or documented process for setting up secrets locally for `wrangler dev`. New contributors would not know which secrets to configure.

### `@/types/event.ts` is now dead code
After fixing the `Event` type mismatch (handlers and formatters now consistently use `@/types/zod/event`), the original `src/types/event.ts` interface (`{ name, location, startTime, endTime }`) is no longer imported anywhere. It can be deleted to avoid confusion.

---

## Low Priority

### `jose` v6.x available (major)
Currently pinned to `^5.x` (5.10.0). `jose` v6.2.2 is the latest. Upgrading requires reviewing breaking changes in JWT/PKCS8 import APIs used in `src/services/googleOAuth.ts`.

### `typescript` v6.x available (major)
Currently pinned to `^5.x` (5.9.3). TypeScript 6.0.2 is available. Cloudflare Workers compatibility should be verified before upgrading.

### `@types/node` v25.x available (major)
Currently at `^22.x`. Not blocking since the project targets Cloudflare Workers (not Node.js), but keeping aligned with the active Node LTS is good hygiene.

### Silent drop for promotion emails has no visibility
In `src/worker.ts`, emails categorized as `promotion` or with `shouldDrop = true` are dropped silently with only a console log. Consider at minimum a Pushover notification or a structured log entry so drops can be audited from Cloudflare's observability dashboard.

### `handleCallbackQuery` silently ignores missing KV data
In `src/worker.ts::handleCallbackQuery`, if `eventData` is `null` (KV entry expired or never existed), the function returns without notifying the user via `answerCallbackQuery`. The Telegram button will appear to hang. Should answer with an error message.
