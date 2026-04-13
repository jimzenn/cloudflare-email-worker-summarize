# cloudflare-email-worker-summarize

AI-powered email automation engine running on Cloudflare Workers. Receives emails via Cloudflare Email Routing, uses LLMs to categorize and extract structured data, sends formatted Telegram notifications, and manages Google Calendar events.

## Commands

```bash
npm run generate-schemas   # Regenerate src/schemas/*.json from Zod types in src/types/zod/
npm run typecheck          # TypeScript type check (no emit)
npm run build              # Dry-run deploy: schema gen + wrangler bundle check
npm run deploy             # Full deploy to Cloudflare Workers
```

## Architecture

```
Email (Cloudflare Email Routing)
  └─► worker.ts (email handler)
        ├─► triage.ts        — LLM call: categorize email, clean body
        └─► dispatch.ts      — route to specialized handler
              └─► handlers/<category>.ts  — LLM call: extract structured data
                    ├─► formatters/<category>.ts  — format Telegram message
                    └─► services/telegram.ts       — send notification

Telegram button press (webhook POST to worker.ts)
  └─► worker.ts (fetch handler)
        └─► KV store (EVENT_STORE) → services/calendar.ts → Google Calendar API
```

## Key Directories

| Path | Purpose |
|---|---|
| `src/handlers/` | One handler per email category (bill, event, flight, hotel, legal, promotion, tracking, notification, summarize, verification) |
| `src/services/llm.ts` | Multi-provider LLM abstraction — Gemini (default), OpenAI, DeepSeek |
| `src/services/telegram.ts` | Send formatted Telegram messages with optional inline keyboards |
| `src/services/calendar.ts` | Create Google Calendar events via service account OAuth |
| `src/types/zod/` | Zod schemas that define structured LLM output shapes |
| `src/schemas/` | Generated JSON schemas from `npm run generate-schemas` (gitignored) |
| `src/formatters/` | Convert extracted data objects to Telegram message strings |
| `src/prompts/` | LLM system prompts, one per handler + shared background/actions |

## How to Add a New Email Category

1. Add the category string to `src/types/triage.ts`
2. Create `src/types/zod/newcategory.ts` with a Zod schema + exported `type NewCategory = z.infer<typeof NewCategorySchema>`
3. Run `npm run generate-schemas` to produce `src/schemas/NewCategorySchema.json`
4. Create `src/prompts/newcategory.ts` with the LLM extraction prompt
5. Create `src/formatters/newcategory.ts` returning `{ title: string, message: string }`
6. Create `src/handlers/newcategory.ts` extending `BaseHandler<NewCategory>`
7. Add a case in `src/dispatch.ts` to route to the new handler

## LLM Service

All LLM calls go through `src/services/llm.ts::queryLLM()`. Default provider is Gemini.

- Accepts a Zod schema (`z.ZodType`) **or** a JSON schema object (`Record<string, unknown>`)
- Uses `withStructuredOutput()` from LangChain for schema-enforced JSON responses
- Handlers pass their Zod schema directly; `triage.ts` passes a pre-generated JSON schema file
- Provider is selectable per call: `'gemini' | 'openai' | 'deepseek'`

## Environment Variables

### Secrets (set via `wrangler secret put <NAME>`)

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key (primary LLM provider) |
| `OPENAI_API_KEY` | OpenAI API key |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token for sending messages |
| `PUSHOVER_USER_KEY` | Pushover user key for push notifications |
| `GOOGLE_SERVICE_ACCOUNT_JSON_KEY` | Full Google service account JSON for Calendar API |

### Config Vars (in `wrangler.toml` — not sensitive)

| Var | Purpose |
|---|---|
| `GEMINI_MODEL` / `OPENAI_MODEL` / `DEEPSEEK_MODEL` | Model names for standard extraction |
| `GEMINI_REASONING_MODEL` / `OPENAI_REASONING_MODEL` / `DEEPSEEK_REASONING_MODEL` | Model names for reasoning tasks |
| `TELEGRAM_TO_CHAT_ID` | Destination Telegram chat ID |
| `EMAIL_ALLOWLIST` | Comma-separated list of allowed sender emails (`*@domain.com` wildcards supported) |
| `GOOGLE_CALENDAR_ID` | Calendar ID for event creation |
| `DEBUG_NOTIFICATIONS` | Set to `"true"` to include LLM model/category debug info in Telegram messages |

## Local Development

Run locally with `wrangler dev`. Secrets are not in `wrangler.toml` — set them via:

```bash
# One-time setup for local dev (stored in ~/.config/wrangler/dev-secrets/)
wrangler secret put GEMINI_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put PUSHOVER_USER_KEY
wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON_KEY
```

Or create a `.dev.vars` file in the project root (gitignored):

```ini
GEMINI_API_KEY=...
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...
TELEGRAM_BOT_TOKEN=...
PUSHOVER_USER_KEY=...
GOOGLE_SERVICE_ACCOUNT_JSON_KEY=...
```

## Stateful Calendar Actions

When an event email is processed, the extracted `Event` object is stored in Cloudflare KV (`EVENT_STORE`) under a UUID. The Telegram message includes an "Add to Calendar" inline button with `callback_data: add_to_calendar:<uuid>`. When clicked, Telegram sends a POST webhook to the worker, which retrieves the event from KV and calls the Google Calendar API.
