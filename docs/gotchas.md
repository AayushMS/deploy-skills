# Known Gotchas

Issues discovered during development. Read before making changes.

## Plugin system

**marketplace.json must NOT list a `skills` array.**
Skill paths in marketplace.json resolve relative to `.claude-plugin/`, not the repo root — so `"./skills/scan-project"` becomes `.claude-plugin/skills/scan-project` (nonexistent). Skills are discovered via `plugin.json`'s `"skills": "./skills/"` instead. This caused the plugin to install but load zero skills.

**marketplace.json needs `$schema`, top-level `description`, and per-plugin `version`/`author`/`category`.**
Using a `metadata: {}` wrapper instead of top-level fields caused `/plugin install` to fail with "Plugin not found in any marketplace".

**`/plugin marketplace add` caches locally at `~/.claude/plugins/marketplaces/<marketplace-name>/`.**
After changing marketplace.json, copy it to the local cache to avoid needing to re-add:
```bash
cp .claude-plugin/marketplace.json ~/.claude/plugins/marketplaces/deploy-skills/.claude-plugin/marketplace.json
```

## Platform-specific

**Render has no reliable CLI.** Use the REST API with `RENDER_API_KEY`. Polling for live status takes up to 10 minutes on first deploy.

**Cloudflare env vars cannot be set via wrangler CLI for Pages.** Must use the Cloudflare REST API. Use `CLOUDFLARE_API_TOKEN` env var — do not parse `~/.wrangler/config/default.toml`.

**Cloudflare Workers URL is not predictable.** Extract it from `wrangler deploy` stdout — don't hardcode `<account>.workers.dev`.

**Supabase PostgreSQL detection was too strict.** Originally required BOTH `pg/prisma` in deps AND `DATABASE_URL` in .env.example. Changed to OR so projects without .env.example still detect correctly.

**Upstash REST URL construction was wrong.** API response has a `rest_url` field — use that directly. Do not concatenate `'https://' + endpoint`.

**Railway is not free.** $5 trial credit only. Still included for compatibility with existing `deploy-railway` skill, but never recommend it.

## Security

**Credential files must be chmod 600.**
`~/.render/config.yaml` and `~/.upstash/config` must be created with `chmod 600` — they contain API keys.

**`DEPLOYMENT_DOCS/DEPLOYED_ENV.md` must be gitignored and chmod 600.**
This file contains all captured env var values from the deployment. It is gitignored by default but skills must also set permissions after writing.
