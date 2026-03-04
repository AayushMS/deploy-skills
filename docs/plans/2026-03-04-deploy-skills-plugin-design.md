# deploy-skills Plugin Design
**Date:** 2026-03-04
**Status:** Approved

---

## Overview

A Claude Code skill marketplace plugin (`deploy-skills`) that enables one-shot deployment of any project into free cloud infrastructure. The user runs one skill (`deploy-project`), and the system scans the codebase, guides authentication, deploys every service, wires environment variables between services, sets up GitHub Actions CI/CD, and verifies everything is live and communicating — without manual intervention between steps.

---

## Repository Structure

```
your-username/deploy-skills (GitHub repo)
│
├── index.json                     ← marketplace manifest
│
├── scan-project/SKILL.md          ← Step 1: analyze + document
├── setup-auth/SKILL.md            ← Step 2: guide all logins
├── deploy-project/SKILL.md        ← MAIN ORCHESTRATOR
├── setup-cicd/SKILL.md            ← Step 4: GitHub Actions
├── verify-deployment/SKILL.md     ← Step 5: health checks + integration
│
├── deploy-vercel/SKILL.md         ← frontend (Vercel)
├── deploy-netlify/SKILL.md        ← frontend (Netlify)
├── deploy-cloudflare/SKILL.md     ← edge / workers / pages
├── deploy-render/SKILL.md         ← backend (free 750hrs/mo)
├── deploy-supabase/SKILL.md       ← postgres + auth + storage
├── deploy-neon/SKILL.md           ← serverless postgres alternative
└── deploy-upstash/SKILL.md        ← redis, queues, pub-sub
```

**Existing skills** (`deploy-vercel`, `deploy-railway`, `gh-repo-setup`) remain installed separately and are referenced by the orchestrator where applicable.

---

## The One-Shot Flow (`deploy-project`)

The orchestrator guarantees: **never move to the next step if the current step fails.**

```
User: invokes deploy-project
        ↓
[1] scan-project
        ↓
[2] setup-auth
        ↓
[3] deploy each service (sequentially, per DEPLOYMENT_PLAN.md)
        ↓
[4] setup-cicd
        ↓
[5] verify-deployment
```

### Step 1 — scan-project

- Reads: all `package.json`, `docker-compose.yml`, `.env.example`, `README.md`, workspace configs (`turbo.json`, `pnpm-workspace.yaml`), `Dockerfile`s
- Detects services:
  - **Frontend**: Next.js, Vite/React, Nuxt, SvelteKit, static HTML
  - **Backend**: Express, Fastify, Hono, NestJS, FastAPI, Django, Rails, Go
  - **Database**: Postgres (Prisma/TypeORM/pg), MySQL, SQLite, MongoDB
  - **Queues/Jobs**: BullMQ, bee-queue, Redis pub/sub, cron jobs
  - **WebSockets**: socket.io, ws (requires persistent server)
  - **Workers/background jobs**: separate process detection
- Recommends platform per service:
  - Next.js → Vercel
  - SPA (Vite/CRA) → Vercel or Netlify or Cloudflare Pages
  - Node backend with WebSockets → Render (persistent)
  - Postgres → Supabase (if auth/storage also needed) or Neon
  - Redis/Queues → Upstash
  - Edge functions → Cloudflare Workers
- Writes output:
  - `DEPLOYMENT_DOCS/HOW_TO_RUN.md` — local dev setup guide
  - `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` — what goes where, platform decisions
  - `DEPLOYMENT_DOCS/SERVICES.md` — service map with ports, dependencies, env vars needed
- **PAUSES**: shows plan to user, waits for explicit approval before Step 2

### Step 2 — setup-auth

Only requests auth for tools required by the approved `DEPLOYMENT_PLAN.md`.

| Tool        | Check command           | Login command                        |
|-------------|-------------------------|--------------------------------------|
| GitHub      | `gh auth status`        | `gh auth login`                      |
| Vercel      | `vercel whoami`         | `vercel login`                       |
| Netlify     | `netlify status`        | `netlify login`                      |
| Cloudflare  | `wrangler whoami`       | `wrangler login`                     |
| Render      | render API key check    | prompt for API key from dashboard    |
| Supabase    | `supabase projects list`| `supabase login`                     |
| Neon        | `neon me`               | `neon auth`                          |
| Upstash     | upstash API key check   | prompt for API key from console      |

- Checks each tool's auth status first; skips if already authenticated
- For interactive browser logins: tells user to run command in separate terminal, waits for confirmation
- Verifies each auth succeeds before proceeding to next
- Never proceeds until ALL required auths confirmed

### Step 3 — deploy each service

Executes in dependency order (database first, then backend, then frontend):

1. **Database** → deploy-supabase or deploy-neon
2. **Queue/Redis** → deploy-upstash
3. **Backend** → deploy-render or deploy-railway
4. **Frontend** → deploy-vercel or deploy-netlify or deploy-cloudflare
5. **GitHub repo** → gh-repo-setup (if not already on GitHub)

**Env var wiring** (automatic, between steps):

```
After deploy-supabase:
  → capture: SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL
  → inject into: backend (via render/railway API), frontend (via vercel/netlify API)

After deploy-upstash:
  → capture: REDIS_URL, UPSTASH_REDIS_REST_URL
  → inject into: backend

After deploy-render (backend):
  → capture: BACKEND_URL (the public domain)
  → inject into: frontend as NEXT_PUBLIC_API_URL or VITE_API_URL

All captured values → DEPLOYMENT_DOCS/DEPLOYED_ENV.md (gitignored, local reference)
```

### Step 4 — setup-cicd

Generates and commits GitHub Actions workflows:

- `.github/workflows/deploy-frontend.yml` — triggers on push to main (frontend dirs)
- `.github/workflows/deploy-backend.yml` — triggers on push to main (backend dirs)
- `.github/workflows/health-check.yml` — cron `0 */6 * * *`, curls all deployed URLs, opens GitHub issue via `gh issue create` if any non-2xx

Stores deploy tokens in GitHub Secrets:
```bash
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY"
# etc. per plan
```

Commits workflows + pushes via `gh`:
```bash
git add .github/
git commit -m "chore: add CI/CD deployment workflows"
gh repo push  # or git push
```

### Step 5 — verify-deployment

- `curl` each deployed URL → assert 2xx response
- `agent-browser`: navigate to frontend URL, assert page renders (not blank/error)
- API health check: `curl <BACKEND_URL>/health` or `/api/health`
- Cross-service test: frontend loads → makes API call → backend responds → DB query returns data
- Prints pass/fail table per service
- If any test fails: reports clearly, suggests fix, offers to re-run verify after fix

---

## Platform Coverage & Free Tier Notes

| Platform        | Use case                   | Free tier limits                    | CLI          |
|-----------------|----------------------------|-------------------------------------|--------------|
| Vercel          | Frontend, Next.js SSR      | 100GB bandwidth, 100k invocations   | `vercel`     |
| Netlify         | Frontend, static           | 100GB bandwidth, 125k functions     | `netlify`    |
| Cloudflare      | Edge functions, Pages      | 10M requests/month                  | `wrangler`   |
| Render          | Backend (persistent)       | 750 free hours/month                | REST API     |
| Railway         | Backend (trial-based)      | $5 trial credit (not truly free)    | `railway`    |
| Supabase        | Postgres + auth + storage  | 2 free projects, 500MB DB           | `supabase`   |
| Neon            | Serverless Postgres        | 0.5GB storage, autoscale            | `neon`       |
| Upstash         | Redis, queues              | 10k commands/day free               | REST API     |

> **Note:** Railway is included for compatibility with existing `deploy-railway` skill but users should be aware it's no longer truly free.

---

## Key Design Constraints

1. **One-shot guarantee**: orchestrator never auto-skips failures; it stops and reports
2. **`gh` for all GitHub operations**: repo creation, secrets, push, issue creation
3. **Auth verification before deploy**: never attempt deploy with unauthenticated tools
4. **Env var wiring is automatic**: user never manually copies URLs between platforms
5. **Monorepo aware**: handles `/apps/web`, `/apps/api` structures
6. **Platform skills are standalone**: each can be invoked independently, not just via orchestrator

---

## Skills to Build (Priority Order)

1. `scan-project` — foundation, everything depends on its output
2. `setup-auth` — prerequisite for all deploys
3. `deploy-render` — most needed backend platform (truly free)
4. `deploy-supabase` — most needed database
5. `deploy-project` (orchestrator) — wires everything
6. `setup-cicd` — GitHub Actions generation
7. `verify-deployment` — end-to-end health checks
8. `deploy-netlify` — frontend alternative
9. `deploy-cloudflare` — edge alternative
10. `deploy-neon` — DB alternative
11. `deploy-upstash` — queues/redis
