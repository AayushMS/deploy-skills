# deploy-skills

One-shot deployment of any project to free cloud infrastructure using Claude Code.

## Install

```
/plugin marketplace add your-username/deploy-skills
/plugin install deploy-skills@deploy-skills
```

## Usage

In any project directory:
```
deploy my project
```

This triggers `deploy-project` which sequentially:
1. Scans your codebase and recommends platforms
2. Guides you through authenticating all required tools
3. Deploys every service (DB → backend → frontend)
4. Wires environment variables between services automatically
5. Sets up GitHub Actions CI/CD
6. Verifies everything is live and communicating

## Platforms Supported

| Service | Platform | Free Tier |
|---------|----------|-----------|
| Frontend | Vercel, Netlify, Cloudflare Pages | Yes |
| Backend | Render | 750 hrs/mo |
| Postgres | Supabase, Neon | Yes |
| Redis/Queues | Upstash | 10k cmd/day |
| Edge | Cloudflare Workers | 10M req/mo |

## Skills

| Skill | Purpose | Standalone Use |
|-------|---------|----------------|
| deploy-project | Main orchestrator — deploys everything | `deploy my project` |
| scan-project | Scans codebase, detects services, creates docs | `scan my project` |
| setup-auth | Guides authentication for required tools | `set up auth for deployment` |
| setup-cicd | Creates GitHub Actions workflows | `set up CI/CD` |
| verify-deployment | Health checks + integration tests | `verify my deployment` |
| deploy-vercel | Frontend → Vercel | `deploy to Vercel` |
| deploy-netlify | Frontend → Netlify | `deploy to Netlify` |
| deploy-cloudflare | Edge/Pages → Cloudflare | `deploy to Cloudflare` |
| deploy-render | Backend → Render | `deploy to Render` |
| deploy-supabase | Database → Supabase | `deploy to Supabase` |
| deploy-neon | Database → Neon | `deploy to Neon` |
| deploy-upstash | Redis/Queues → Upstash | `set up Redis` |
