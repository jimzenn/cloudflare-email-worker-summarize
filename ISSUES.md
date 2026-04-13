# Known Issues

Last reviewed: 2026-04-13.

### No tests
No test framework is configured. Adding Vitest with `@cloudflare/vitest-pool-workers` would provide first-class Cloudflare Workers support and catch regressions in handlers, formatters, and utilities.

### `preview_id` placeholder in wrangler.toml
`preview_id = "temp_preview_id"` under `[[kv_namespaces]]` needs a real value. Create one with:
```bash
wrangler kv namespace create EVENT_STORE --preview
```
Then update `preview_id` in `wrangler.toml` with the returned ID.
