# deploy-skills — Developer Guide

This repo is a Claude Code skills marketplace plugin. It contains skills that deploy any project to free cloud infrastructure in one shot.

## What this is

A GitHub-hosted marketplace plugin (`AayushMS/deploy-skills`) installable via:
```
/plugin marketplace add AayushMS/deploy-skills
/plugin install deploy-skills@deploy-skills
```

Skills are plain markdown files (`SKILL.md`). No code to compile. No tests to run.

## Structure

```
.claude-plugin/
  marketplace.json     ← marketplace manifest (NO skills array — relies on plugin.json)
  plugin.json          ← plugin manifest with "skills": "./skills/"
skills/
  <skill-name>/
    SKILL.md           ← the skill itself (YAML frontmatter + markdown instructions)
docs/plans/            ← design docs and implementation plans
```

## Skills in this repo

| Skill | Purpose |
|-------|---------|
| deploy-project | Main orchestrator — runs everything in order |
| scan-project | Detects services, writes DEPLOYMENT_DOCS/ |
| setup-auth | Guides auth for all required platforms |
| deploy-vercel | Frontend → Vercel |
| deploy-netlify | Frontend → Netlify |
| deploy-cloudflare | Pages/Workers → Cloudflare |
| deploy-render | Backend → Render |
| deploy-supabase | Postgres → Supabase |
| deploy-neon | Postgres → Neon |
| deploy-upstash | Redis → Upstash |
| setup-cicd | GitHub Actions workflows |
| verify-deployment | Health checks + agent-browser tests |
| deploy-log | Debug mode — continuous logging to DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md |

## How to work on skills

Just edit the relevant `skills/<name>/SKILL.md`. Each skill is self-contained markdown. Commit and push — no build step.

Validate a skill before shipping:
```bash
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/skill-creator/scripts/package_skill.py skills/<name>/
```

## Key design constraints

- **marketplace.json must NOT have a `skills` array** — paths would resolve relative to `.claude-plugin/`, not the repo root. Skills are discovered via `plugin.json`'s `"skills": "./skills/"` instead.
- **Deploy order is always**: DB → Redis → Backend → Frontend → CI/CD → Verify
- **`gh` CLI for all GitHub operations** — never raw git for secrets, repo creation, or issue creation
- **Never log secret values** — only variable names in deploy-log output
- **Render uses REST API only** — no reliable CLI; requires `RENDER_API_KEY`
- **Upstash uses REST API only** — requires `UPSTASH_EMAIL` + `UPSTASH_API_KEY`
- **Cloudflare env vars via REST API** — wrangler CLI can't set Pages env vars reliably

## Docs

- `docs/adding-a-skill.md` — how to add a new platform skill end-to-end
- `docs/gotchas.md` — known issues discovered during development, read before making changes
- `docs/plans/` — original design doc and implementation plan

## Debug / iteration workflow

When testing the plugin on a real project, run with logging enabled:
```
deploy my project with logging
```
Then share `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md` to diagnose what happened at each step.

## Platforms reference

| Platform | Free tier | Key gotcha |
|----------|-----------|------------|
| Vercel | 100GB BW, 100k invocations | — |
| Netlify | 100GB BW, 125k functions | — |
| Cloudflare | Pages: unlimited; Workers: 10M req/mo | — |
| Render | 750 hrs/mo | Spins down after 15 min inactivity |
| Supabase | 2 projects, 500MB | Pauses after 7 days inactivity |
| Neon | 0.5GB | No pause (advantage over Supabase) |
| Upstash | 10k commands/day | — |
| Railway | $5 trial credit | **Not free — do not recommend** |
