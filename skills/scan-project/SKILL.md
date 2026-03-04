---
name: scan-project
description: Use this skill when the user asks to "scan my project", "analyze my project", "what does my project need to run", "find all services in my project", "document how to run my project", "understand my project structure", "detect services in my codebase", "what frameworks does my project use", "analyze my codebase for deployment", or when invoked by the deploy-project orchestrator as the first step before deployment. This skill reads the project codebase, detects all services (frontend, backend, database, queues, workers), recommends free deployment platforms for each service, and writes three documentation files to DEPLOYMENT_DOCS/.
---

# scan-project

Scan the user's project codebase to detect all services, classify them, recommend free deployment platforms, and write three documentation files.

## Step 1: Read Project Files (silently, do not prompt the user)

Read the following files in this order. Skip files that don't exist without mentioning it.

1. `docker-compose.yml` or `docker-compose.yaml` — primary source of truth for services and ports
2. All `package.json` files (root, then each workspace directory under `apps/`, `packages/`, etc.)
3. `turbo.json` — Turborepo monorepo indicator
4. `pnpm-workspace.yaml` — pnpm workspace indicator
5. `.env.example` and any `*.env.example` files — environment variable discovery
6. `README.md` — additional context and start commands
7. `Makefile` — start commands and task definitions
8. All `Dockerfile*` files — service definitions and exposed ports
9. `go.mod` — Go dependency detection
10. `requirements.txt` or `pyproject.toml` — Python dependency detection
11. `.nvmrc`, `.node-version`, or `engines` field in root `package.json` — Node version

## Step 2: Detect and Classify Services

Apply these detection rules to everything read in Step 1.

### Monorepo Detection

- `turbo.json` exists → Turborepo monorepo
- `pnpm-workspace.yaml` exists → pnpm workspace
- `"workspaces"` key in root `package.json` → npm workspace
- `apps/` directory present → treat each subdirectory of `apps/` as a separate deployable service
- Each app in `apps/` gets its own row in all output tables

### Frontend Detection (check `dependencies` and `devDependencies` in each `package.json`)

| Signal | Framework | Recommended Platform |
|--------|-----------|---------------------|
| `"next"` in deps | Next.js (SSR) | Vercel |
| `"vite"`, `"react-scripts"`, or `"@vitejs/..."` in deps | SPA | Vercel or Netlify or Cloudflare Pages |
| `"nuxt"` in deps | Nuxt.js | Vercel |
| `"@sveltejs/kit"` in deps | SvelteKit | Vercel or Netlify |
| `"astro"` in deps | Astro | Cloudflare Pages or Netlify |
| No framework detected, static HTML only | Static site | Cloudflare Pages |

### Backend Detection

| Signal | Type | Recommended Platform |
|--------|------|---------------------|
| `"express"`, `"fastify"`, `"hono"`, or `"@hono/..."` in deps | Node.js server | Render |
| `"@nestjs/core"` or `"@nestjs/..."` in deps | NestJS server | Render |
| `"fastapi"`, `"django"`, or `"flask"` in `requirements.txt` or `pyproject.toml` | Python server | Render |
| `"gin"` or `"fiber"` in `go.mod` | Go server | Render |
| Any backend that also has `"socket.io"` or `"ws"` in deps | WebSocket server | **Render only** (needs persistent server — not edge) |
| Any backend without websockets | Node/Python/Go server | Render (preferred) |

### Database Detection

| Signal | Database | Recommended Platform |
|--------|----------|---------------------|
| `"pg"`, `"postgres"`, or `"prisma"` in deps OR `DATABASE_URL` in `.env.example` (either signal is sufficient) | PostgreSQL | Supabase (if project also needs auth or storage); Neon (if only DB needed) |
| `"mongoose"` or `"mongodb"` in deps | MongoDB | ⚠️ WARNING: No truly free hosted tier. Recommend Atlas M0 free cluster (512 MB). |
| `"mysql"` or `"mysql2"` in deps | MySQL | ⚠️ WARNING: PlanetScale removed its free tier. Recommend Neon with MySQL compatibility layer or switch to PostgreSQL. |
| `"better-sqlite3"` or `"sqlite3"` in deps | SQLite | Embed in backend process — no separate service needed |

### Queue / Redis Detection

| Signal | Service | Recommended Platform |
|--------|---------|---------------------|
| `"bullmq"`, `"bull"`, `"bee-queue"`, or `"ioredis"` in deps | Redis | Upstash |
| `REDIS_URL` key present in `.env.example` | Redis | Upstash |

### Cron / Worker Detection

| Signal | Notes |
|--------|-------|
| `"node-cron"`, `"cron"`, or `"agenda"` in deps | Needs persistent server — deploy on Render as a background worker |
| Separate worker entry-point file (e.g., `worker.ts`, `consumer.ts`, `processor.ts`) | Deploy as a separate Render Background Worker service |

## Step 3: Write Three Output Files

Create the `DEPLOYMENT_DOCS/` directory if it does not exist. Write the following three files exactly as specified. Populate all sections with real detected values — do not leave placeholder text.

### DEPLOYMENT_DOCS/HOW_TO_RUN.md

```markdown
# How to Run Locally

## Prerequisites
[Node version from .nvmrc / engines field, Python version, Go version, Docker if needed — only what applies]

## Install Dependencies
[Exact install commands per service, e.g., `npm install`, `pnpm install`, `pip install -r requirements.txt`]

## Environment Variables
[List every variable from .env.example with an inferred description. Format: `VAR_NAME` — description]

## Start Services (in order)
[Exact start command for each service, labeled by service name. Include any required ordering, e.g., "start DB before API".]

## Local URLs
[Service name → http://localhost:PORT for each service]
```

### DEPLOYMENT_DOCS/SERVICES.md

```markdown
# Services Map

| Service | Type | Framework | Local Port | Depends On |
|---------|------|-----------|------------|------------|
[One row per detected service. Use docker-compose ports or package.json scripts to determine local port.]

## Environment Variables Per Service
[For each service: list env vars it consumes, and where the value comes from (e.g., "from DATABASE_URL → output of Supabase/Neon setup")]
```

### DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md

```markdown
# Deployment Plan

## Detected Services
[Bulleted list: service name, type, framework]

## Recommended Platforms

| Service | Platform | Reason | Free Tier Limits |
|---------|----------|--------|-----------------|
[One row per service. Include the specific reason for the platform choice.]

## Free Tier Warnings

- **Render**: Free services spin down after 15 minutes of inactivity. Cold start on next request takes ~30 seconds.
- **Supabase**: Projects pause after 7 days of inactivity on the free tier. Un-pause manually via the dashboard.
- **Upstash**: Free tier allows 10,000 Redis commands per day.
- **Railway**: NOT truly free — only a $5 trial credit. Do not use Railway unless the user specifically requests it.
[Add MongoDB or MySQL warnings here if those databases were detected.]

## Deployment Order
1. [Database service] → [platform]
2. [Redis/queue service, if applicable] → Upstash
3. [Backend service(s)] → [platform]
4. [Frontend service(s)] → [platform]

## Required Accounts
[List only the accounts needed for THIS project's platforms. Do not list accounts for platforms not recommended.]

## Environment Variable Wiring
[For each cross-service dependency, specify: after deploying Service A, set VAR_NAME on Service B using the output URL/key from Service A. Format clearly, e.g.:]

After deploying [database]:
- Set `DATABASE_URL` on [backend service] using the connection string from [Supabase/Neon dashboard]

After deploying [backend]:
- Set `NEXT_PUBLIC_API_URL` on [frontend service] using the Render service URL
```

## Step 4: Pause and Show Summary

After writing all three files, print exactly this block (fill in the bracketed values):

```
=== Project Scan Complete ===
Detected services: [comma-separated list of service names and types]
Recommended deployment: [one-sentence summary, e.g., "Frontend on Vercel, API on Render, Postgres on Neon, Redis on Upstash"]

Files written to DEPLOYMENT_DOCS/:
  ✓ HOW_TO_RUN.md
  ✓ SERVICES.md
  ✓ DEPLOYMENT_PLAN.md

Does this look correct?
- Type 'yes' to proceed to authentication setup
- Or describe any corrections needed
```

Do not proceed to any further steps until the user responds.

## Step 5: Failure Handling

If none of the following are found — `package.json`, `docker-compose.yml` / `docker-compose.yaml`, `Dockerfile`, `go.mod`, `requirements.txt`, `pyproject.toml` — then do not write any files. Instead, list exactly what was checked:

```
No project structure detected. I checked for:
- package.json (not found)
- docker-compose.yml / docker-compose.yaml (not found)
- Dockerfile / Dockerfile.* (not found)
- go.mod (not found)
- requirements.txt / pyproject.toml (not found)

Please confirm the project directory or point me to the relevant files.
```
