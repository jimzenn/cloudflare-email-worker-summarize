# Known Issues

Tracked issues for future work. Last reviewed: 2026-04-13.

---

## High Priority

### No tests
No test framework is configured. The worker has no unit or integration tests. Adding Vitest (which has first-class Cloudflare Workers support via `@cloudflare/vitest-pool-workers`) would catch regressions in handlers, formatters, and utility functions.

---

## Medium Priority

### `preview_id` is a placeholder in wrangler.toml
`preview_id = "temp_preview_id"` under `[[kv_namespaces]]` is a placeholder. A real KV namespace ID for preview/dev environments should be created via `wrangler kv:namespace create EVENT_STORE --preview` and filled in.
