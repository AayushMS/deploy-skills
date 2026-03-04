# deploy-skills Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a GitHub-hosted Claude Code skill marketplace plugin that deploys any project to free cloud infrastructure in one shot — scan, auth, deploy, CI/CD, verify — all sequentially without manual intervention.

**Architecture:** Flat skill collection where each platform/concern gets its own SKILL.md. A central `deploy-project` orchestrator invokes them sequentially. Skills work standalone OR through the orchestrator.

**Tech Stack:** Claude skills (SKILL.md markdown), Claude Code plugin format, `gh` CLI, `vercel` CLI, `netlify` CLI, `wrangler` CLI, Render REST API, Supabase CLI, Neon CLI, `agent-browser`, `curl`

**Design Reference:** `docs/plans/2026-03-04-deploy-skills-plugin-design.md`

---

## Mandatory Tools (use these for every task)

- **`plugin-creator` skill** — used in Task 1 to scaffold the entire plugin structure (`.claude-plugin/plugin.json`, directories). If not installed, install it first: `/plugin install plugin-creator@cc-marketplace` (source: `ananddtyagi/cc-marketplace`)
- **`skill-creator` skill** — used for EVERY individual SKILL.md. Invoke it before writing each skill, follow its guidance, then invoke it again to review the result
- **`superpowers:writing-skills`** — additional guidance layer, invoke alongside `skill-creator` for each skill

## Skill Writing Rules (read before every task)

- **ALWAYS invoke `skill-creator` before AND after writing each SKILL.md** — before for guidance, after for quality review
- Skills must be **self-contained** — assume the reader has zero context
- Every skill must state its **trigger conditions** clearly in frontmatter description — this is what Claude uses to decide when to invoke it
- Skills that require interactive auth must explicitly tell users: "run this in a separate terminal and confirm when done"
- The `deploy-project` orchestrator uses the phrase `@skill-name` to invoke other skills — write it exactly that way
- **One-shot guarantee**: every skill must explicitly state what to do on failure (stop + report, never silently continue)
- Plugin manifest lives at `.claude-plugin/plugin.json` (NOT `index.json` at root)

---

## Task 0: Install plugin-creator skill (prerequisite)

**Step 1: Check if plugin-creator is installed**

```bash
ls ~/.claude/skills/ | grep plugin-creator
```

**Step 2: If not installed, install it**

Run in Claude Code:
```
/plugin marketplace add ananddtyagi/cc-marketplace
/plugin install plugin-creator@cc-marketplace
```

**Step 3: Verify**

```bash
ls ~/.claude/skills/plugin-creator/
# Should show: SKILL.md
```

---

## Task 1: Bootstrap repo structure using plugin-creator

**Files:**
- Create: `.claude-plugin/plugin.json` (plugin manifest)
- Create: `skills/` directory structure for all 12 skills
- Create: `.gitignore`
- Create: `README.md`

**Step 1: Invoke plugin-creator skill**

Invoke the `plugin-creator` skill and ask it to scaffold a new plugin named `deploy-skills` with the following skills: `scan-project`, `setup-auth`, `deploy-project`, `setup-cicd`, `verify-deployment`, `deploy-vercel`, `deploy-netlify`, `deploy-cloudflare`, `deploy-render`, `deploy-supabase`, `deploy-neon`, `deploy-upstash`.

The plugin-creator will generate the correct `.claude-plugin/plugin.json` structure.

**Step 2: Verify plugin manifest was created at `.claude-plugin/plugin.json`**

The manifest should look like:
```json
{
  "name": "deploy-skills",
  "description": "One-shot deployment of any project to free cloud infrastructure",
  "version": "1.0.0",
  "skills": [
    { "name": "scan-project", "path": "skills/scan-project" },
    { "name": "setup-auth", "path": "skills/setup-auth" },
    { "name": "deploy-project", "path": "skills/deploy-project" },
    { "name": "setup-cicd", "path": "skills/setup-cicd" },
    { "name": "verify-deployment", "path": "skills/verify-deployment" },
    { "name": "deploy-vercel", "path": "skills/deploy-vercel" },
    { "name": "deploy-netlify", "path": "skills/deploy-netlify" },
    { "name": "deploy-cloudflare", "path": "skills/deploy-cloudflare" },
    { "name": "deploy-render", "path": "skills/deploy-render" },
    { "name": "deploy-supabase", "path": "skills/deploy-supabase" },
    { "name": "deploy-neon", "path": "skills/deploy-neon" },
    { "name": "deploy-upstash", "path": "skills/deploy-upstash" }
  ]
}
```

Note: follow whatever structure plugin-creator actually generates — it knows the correct format.

**Step 3: Update README.md** with usage instructions:

```markdown
# deploy-skills

One-shot deployment of any project to free cloud infrastructure using Claude Code.

## Install

\`\`\`
/plugin marketplace add your-username/deploy-skills
/plugin install deploy-skills@deploy-skills
\`\`\`

## Usage

In any project directory:
\`\`\`
deploy my project
\`\`\`

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

## Individual Skills

Each skill can also be used standalone:
- `scan my project` → scan-project
- `set up auth for deployment` → setup-auth
- `verify my deployment` → verify-deployment
- `set up CI/CD` → setup-cicd
\`\`\`
```

**Step 4: Create `.gitignore`**

```
DEPLOYMENT_DOCS/DEPLOYED_ENV.md
node_modules/
.env
.env.local
```

**Step 5: Commit**

```bash
git add .claude-plugin/ skills/ .gitignore README.md
git commit -m "chore: bootstrap deploy-skills plugin structure via plugin-creator"
```

---

## Task 2: `scan-project` skill

**Files:**
- Create: `skills/scan-project/SKILL.md`

**Step 1: Invoke skill-creator for guidance**

Invoke the `skill-creator` skill and tell it: "I am creating a skill called scan-project that scans a project codebase to detect all services (frontend, backend, database, queues, workers), recommends free deployment platforms for each, and writes HOW_TO_RUN.md, DEPLOYMENT_PLAN.md, and SERVICES.md to a DEPLOYMENT_DOCS/ directory."

Follow its guidance on structure and frontmatter before writing anything.

**Step 2: Write `scan-project/SKILL.md`**

The skill must:
- **Trigger on**: "scan my project", "analyze my project", "what does my project need", "find all services", or when invoked by deploy-project
- **Read these files** (in order): `docker-compose.yml`, `docker-compose.yaml`, all `package.json` (root + workspaces), `turbo.json`, `pnpm-workspace.yaml`, `.env.example`, `*.env.example`, `README.md`, `Makefile`, all `Dockerfile*`
- **Detect and classify**:

```
Frontend detection (check package.json deps):
  "next" → Next.js (SSR) → recommend Vercel
  "vite" or "react-scripts" or "@vitejs" → SPA → recommend Vercel/Netlify/Cloudflare Pages
  "nuxt" → Nuxt.js → recommend Vercel
  "@sveltejs/kit" → SvelteKit → recommend Vercel/Netlify
  "astro" → Astro → recommend Cloudflare Pages or Netlify
  static HTML (no framework) → Cloudflare Pages

Backend detection:
  "express" or "fastify" or "hono" or "@hono" → Node server
  "nestjs" or "@nestjs" → NestJS → Node server
  "fastapi" or "django" or "flask" → Python server
  "gin" or "fiber" (go.mod) → Go server
  any backend with "socket.io" or "ws" → needs PERSISTENT server (Render, not edge)
  backend without websockets → Render or Railway

Database detection (check deps + .env.example keys):
  "pg" or "postgres" or "prisma" + DATABASE_URL → Postgres → Supabase (if also needs auth) or Neon
  "mongoose" or "mongodb" → MongoDB → WARN: no truly free tier, suggest Atlas M0
  "mysql" or "mysql2" → MySQL → PlanetScale (removed free tier) → warn user
  "better-sqlite3" or "sqlite" → SQLite → embed in backend (no separate service)

Queue/Redis detection:
  "bullmq" or "bull" or "bee-queue" or "ioredis" → Redis → Upstash
  "redis" in REDIS_URL env var → Redis → Upstash

Cron/Worker detection:
  "node-cron" or "cron" or "agenda" → needs persistent server (Render)
  separate worker process → deploy as separate Render service

Monorepo detection:
  turbo.json exists → Turborepo monorepo
  pnpm-workspace.yaml exists → pnpm workspace
  "workspaces" in root package.json → npm workspace
  → detect apps/ or packages/ directories
  → treat each app in apps/ as a separate deployable service
```

- **Output three files** (create `DEPLOYMENT_DOCS/` directory):

`DEPLOYMENT_DOCS/HOW_TO_RUN.md`:
```markdown
# How to Run Locally

## Prerequisites
[list: node version, python version, etc. from .nvmrc/.python-version/engines field]

## Setup
[exact commands to install deps for each service]

## Environment Variables
[list all vars from .env.example with descriptions]

## Start Commands
[exact commands to start each service, in order]

## Service URLs
[local URLs for each service]
```

`DEPLOYMENT_DOCS/SERVICES.md`:
```markdown
# Services Map

| Service | Type | Framework | Port | Depends On |
|---------|------|-----------|------|------------|
[one row per detected service]

## Environment Variables Per Service
[for each service, list env vars it needs and where they come from]
```

`DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md`:
```markdown
# Deployment Plan

## Recommended Platforms
[table: service name | recommended platform | reason | free tier limits]

## Deployment Order
1. [database service] → [platform]
2. [queue/redis] → [platform] (if applicable)
3. [backend service(s)] → [platform]
4. [frontend service(s)] → [platform]

## Required Accounts
[list of platforms user needs accounts on]

## Environment Variable Wiring
[diagram: after deploying X, set Y env vars on Z service]
```

- **PAUSE after writing files**: print summary of what was detected and what the plan recommends. Ask: "Does this look correct? Type 'yes' to proceed to authentication setup, or describe any corrections."
- **On failure**: if no recognizable project structure found, list what was checked and ask user to point to the right directory.

**Step 3: Review with skill-creator**

Invoke `skill-creator` skill again and ask it to review the written SKILL.md. Specifically ask it to check:
- Is the frontmatter description specific enough to trigger correctly?
- Are all detection patterns covered?
- Is the output format (the three markdown files) clearly specified?
- Does it pause correctly for user approval?

Fix any issues it identifies before committing.

**Step 4: Commit**

```bash
git add skills/scan-project/SKILL.md
git commit -m "feat: add scan-project skill"
```

---

## Task 3: `setup-auth` skill

**Files:**
- Create: `skills/setup-auth/SKILL.md`

**Step 1: Invoke skill-creator for guidance**

Invoke `skill-creator` and describe: "Creating a skill that checks authentication status for deployment tools (GitHub via `gh`, Vercel, Netlify, Cloudflare, Render, Supabase, Neon, Upstash), then guides the user to log in to only the tools required by their DEPLOYMENT_PLAN.md."

**Step 2: Write `skills/setup-auth/SKILL.md`**

The skill must:
- **Trigger on**: "set up auth for deployment", "log in to deployment tools", "authenticate tools", or when invoked by deploy-project after scan-project
- **Read** `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` to know which platforms are needed
- **For each required platform**, run the check command first, then only request login if needed:

```
GitHub (always required):
  Check: gh auth status
  If not authed: tell user to run `gh auth login` in a separate terminal
    → select: GitHub.com → HTTPS → Login with a web browser
  Verify: gh auth status | grep "Logged in"

Vercel (if plan includes Vercel):
  Check: vercel whoami 2>/dev/null
  If not authed: tell user to run `vercel login` in a separate terminal
  Verify: vercel whoami → prints username

Netlify (if plan includes Netlify):
  Check: netlify status 2>/dev/null | grep "Logged In"
  If not authed: tell user to run `netlify login` in a separate terminal
  Verify: netlify status | grep "Logged In"

Cloudflare (if plan includes Cloudflare):
  Check: wrangler whoami 2>/dev/null
  If not authed: tell user to run `wrangler login` in a separate terminal
  Verify: wrangler whoami | grep "account"

Supabase (if plan includes Supabase):
  Check: supabase projects list 2>/dev/null
  If fails: tell user to run `supabase login` in a separate terminal
  Verify: supabase projects list (should not error)

Neon (if plan includes Neon):
  Check: neon me 2>/dev/null
  If fails: tell user to run `neon auth` in a separate terminal
  Verify: neon me | grep "email"

Render (if plan includes Render):
  No CLI login — needs API key
  Tell user: "Go to https://dashboard.render.com/u/settings → API Keys → Create API Key"
  Ask user to paste the key
  Store: export RENDER_API_KEY="<pasted_key>" and save to ~/.render/config.yaml
  Verify: curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['owner']['name'])"

Upstash (if plan includes Upstash):
  No CLI login — needs API key + email
  Tell user: "Go to https://console.upstash.com/account/api → Copy API Key and Email"
  Ask user to paste both
  Store: export UPSTASH_API_KEY="..." and export UPSTASH_EMAIL="..."
  Verify: curl -s -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" https://api.upstash.com/v2/redis/databases | python3 -c "import sys,json; print('OK:', len(json.load(sys.stdin)), 'databases')"
```

- **Never proceed to next platform until current one is verified**
- **Print final auth status table** before completing:
  ```
  ✓ GitHub       → logged in as @username
  ✓ Vercel       → logged in as username
  ✓ Supabase     → logged in as email
  ✓ Render       → API key verified (workspace: name)
  ```
- **On any failure**: stop, explain exactly what failed and how to fix it, do not continue

**Step 3: Review with skill-creator**

Invoke `skill-creator` to review: Is the "only auth what the plan needs" logic clearly expressed? Are all tool check/login commands correct and up to date?

**Step 4: Commit**

```bash
git add skills/setup-auth/SKILL.md
git commit -m "feat: add setup-auth skill"
```

---

## Task 4: `deploy-render` skill

**Files:**
- Create: `skills/deploy-render/SKILL.md`

**Step 1: Invoke skill-creator**

Describe to skill-creator: "Creating a skill that deploys a Node.js/Python backend server to Render's free tier using Render REST API (no CLI), waits for deploy to go live, and exports RENDER_SERVICE_ID and RENDER_SERVICE_URL."

**Step 2: Write `skills/deploy-render/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Render", "deploy my backend to Render", "host my server on Render", or invoked by deploy-project
- **Use Render REST API** (no reliable CLI) with `RENDER_API_KEY` env var
- **Workflow**:

```bash
# 1. Get owner ID
OWNER_ID=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/owners \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['owner']['id'])")

# 2. Create web service
SERVICE_RESPONSE=$(curl -s -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"<service-name>\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"https://github.com/<user>/<repo>\",
    \"branch\": \"main\",
    \"buildCommand\": \"<detected build command>\",
    \"startCommand\": \"<detected start command>\",
    \"plan\": \"free\",
    \"envVars\": [
      {\"key\": \"NODE_ENV\", \"value\": \"production\"},
      {\"key\": \"PORT\", \"value\": \"10000\"}
    ]
  }")

SERVICE_ID=$(echo $SERVICE_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['id'])")
SERVICE_URL=$(echo $SERVICE_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['serviceDetails']['url'])")

# 3. Wait for deploy (poll until live)
echo "Waiting for Render deploy to complete..."
for i in $(seq 1 30); do
  STATUS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1" \
    | python3 -c "import sys,json; deploys=json.load(sys.stdin); print(deploys[0]['deploy']['status'] if deploys else 'pending')" 2>/dev/null)
  echo "  Deploy status: $STATUS"
  if [ "$STATUS" = "live" ]; then break; fi
  if [ "$STATUS" = "failed" ]; then echo "Deploy FAILED"; exit 1; fi
  sleep 10
done

echo "Service deployed: $SERVICE_URL"
```

- **Set env vars** (called after database deploy):
```bash
curl -s -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"key": "DATABASE_URL", "value": "<supabase_or_neon_url>"}]'
```

- **Output**: exports `RENDER_SERVICE_ID` and `RENDER_SERVICE_URL` for use by orchestrator
- **Verify**: `curl -s $SERVICE_URL/health` → 2xx
- **Free tier note**: Render free services spin down after 15 min inactivity (cold start ~30s). State this clearly after deploy.

**Step 3: Review with skill-creator** — verify the polling logic and free tier cold-start warning are clearly stated.

**Step 4: Commit**

```bash
git add skills/deploy-render/SKILL.md
git commit -m "feat: add deploy-render skill"
```

---

## Task 5: `deploy-supabase` skill

**Files:**
- Create: `skills/deploy-supabase/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that creates a Supabase project via CLI, runs database migrations if present, and exports SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL."

**Step 2: Write `skills/deploy-supabase/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Supabase", "set up Supabase", "create Supabase project", or invoked by deploy-project
- **Prerequisites**: `supabase` CLI installed and logged in (verify with `supabase projects list`)
- **Workflow**:

```bash
# 1. Create project (interactive - user must approve)
# List orgs first
supabase orgs list

# Create project
supabase projects create <project-name> \
  --org-id <org-id> \
  --db-password <generated-strong-password> \
  --region us-east-1

# Note: project creation takes ~2 minutes, CLI waits automatically

# 2. Get project credentials
PROJECT_ID=$(supabase projects list --output json | python3 -c "
import sys,json
projects = json.load(sys.stdin)
print(next(p['id'] for p in projects if p['name'] == '<project-name>'))")

# 3. Get connection strings
supabase --project-ref $PROJECT_ID status
# This shows: API URL, anon key, service_role key, DB URL

# 4. Link local project (if migrations exist)
supabase link --project-ref $PROJECT_ID
supabase db push   # runs migrations

# 5. Capture and export credentials
SUPABASE_URL="https://$PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY=$(supabase --project-ref $PROJECT_ID status --output json | python3 -c "import sys,json; print(json.load(sys.stdin)['ANON_KEY'])")
DATABASE_URL=$(supabase --project-ref $PROJECT_ID status --output json | python3 -c "import sys,json; print(json.load(sys.stdin)['DB_URL'])")
```

- **Detect migrations**: check for `supabase/migrations/` directory, run `supabase db push` if found
- **Output**: print all captured values clearly, confirm they should be saved to `DEPLOYMENT_DOCS/DEPLOYED_ENV.md`
- **Exports for orchestrator**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`
- **Free tier note**: Supabase pauses inactive projects after 7 days on free tier. State this.

**Step 3: Review with skill-creator** — verify 7-day pause warning and migrations flow are clearly communicated.

**Step 4: Commit**

```bash
git add skills/deploy-supabase/SKILL.md
git commit -m "feat: add deploy-supabase skill"
```

---

## Task 6: `deploy-netlify` skill

**Files:**
- Create: `skills/deploy-netlify/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that deploys a frontend (React/Vite/Next.js) to Netlify free tier using netlify CLI, auto-detects build command and publish dir, sets env vars, deploys to production, and exports NETLIFY_SITE_ID and NETLIFY_URL."

**Step 2: Write `skills/deploy-netlify/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Netlify", "host my frontend on Netlify", or invoked by deploy-project
- **Use Netlify CLI** + REST API (same pattern as deploy-vercel: CLI for deploy, API for project creation/env vars)
- **Workflow**:

```bash
# 1. Create site via API
NETLIFY_TOKEN=$(cat ~/.netlify/config.json | python3 -c "import sys,json; print(json.load(sys.stdin)['users'][list(json.load(open('/dev/stdin'))['users'].keys())[0]]['auth']['token'])" 2>/dev/null || netlify api listSites | head -1)
# Simpler: use netlify CLI which handles auth internally

# 2. Init site
cd <frontend-dir>
netlify init
# Select: Create & configure a new site
# → picks up build settings from netlify.toml or prompts

# 3. Set env vars
netlify env:set VITE_API_URL "$BACKEND_URL"
netlify env:set NEXT_PUBLIC_API_URL "$BACKEND_URL"   # if Next.js

# 4. Deploy to production
netlify deploy --prod --build

# 5. Get site URL
NETLIFY_URL=$(netlify status --json | python3 -c "import sys,json; print(json.load(sys.stdin)['siteData']['url'])")
echo "Deployed: $NETLIFY_URL"
```

- **Auto-detect build command** from `package.json` scripts: `build`, `build:prod`
- **Auto-detect publish dir**: `dist/`, `build/`, `.next/`, `out/`, `public/`
- **Output**: `NETLIFY_SITE_ID`, `NETLIFY_URL` for CI/CD token storage

**Step 3: Review with skill-creator** — check auto-detection logic and env var injection are clearly specified.

**Step 4: Commit**

```bash
git add skills/deploy-netlify/SKILL.md
git commit -m "feat: add deploy-netlify skill"
```

---

## Task 7: `deploy-cloudflare` skill

**Files:**
- Create: `skills/deploy-cloudflare/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that deploys to Cloudflare Pages (for SPAs/static) or Cloudflare Workers (for edge functions) using wrangler CLI, with env var injection via Cloudflare REST API."

**Step 2: Write `skills/deploy-cloudflare/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Cloudflare", "deploy Cloudflare Pages", "deploy Cloudflare Workers", or invoked by deploy-project
- **Two modes** — detect which is needed:
  - **Pages** (for static sites / SPAs / SSR): use `wrangler pages deploy`
  - **Workers** (for edge functions / serverless): use `wrangler deploy`
- **Pages workflow**:

```bash
# Build first
cd <frontend-dir>
npm run build   # or detected build command

# Deploy to Pages
wrangler pages deploy <dist-dir> --project-name <project-name>
# First time: creates project automatically

# Set env vars (via API, wrangler doesn't support this well via CLI)
ACCOUNT_ID=$(wrangler whoami --json | python3 -c "import sys,json; print(json.load(sys.stdin)['accounts'][0]['id'])")
CF_TOKEN=$(cat ~/.wrangler/config/default.toml | grep token | cut -d'"' -f2)

curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/<project-name>" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deployment_configs": {"production": {"env_vars": {"VITE_API_URL": {"value": "<backend-url>", "type": "plain_text"}}}}}'

# Get URL
CF_URL="https://<project-name>.pages.dev"
```

- **Workers workflow**:

```bash
# Ensure wrangler.toml exists with correct settings
# If not, create minimal one:
cat > wrangler.toml << 'EOF'
name = "<worker-name>"
main = "src/index.ts"
compatibility_date = "2024-01-01"
EOF

# Set secrets
wrangler secret put DATABASE_URL
# (prompts for value - tell user what to paste)

# Deploy
wrangler deploy
```

- **Output**: `CF_PAGES_URL` or `CF_WORKER_URL`

**Step 3: Review with skill-creator** — verify Pages vs Workers detection logic is unambiguous.

**Step 4: Commit**

```bash
git add skills/deploy-cloudflare/SKILL.md
git commit -m "feat: add deploy-cloudflare skill"
```

---

## Task 8: `deploy-neon` skill

**Files:**
- Create: `skills/deploy-neon/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that creates a Neon serverless Postgres project via neon CLI, runs Prisma migrations if present, and exports DATABASE_URL. Preferred over Supabase when only a database is needed."

**Step 2: Write `skills/deploy-neon/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Neon", "set up Neon database", "create Neon project", or when orchestrator chooses Neon over Supabase
- **When to prefer Neon over Supabase**: if project only needs a database (no auth/storage/realtime features)
- **Workflow**:

```bash
# Install Neon CLI if needed
npm install -g neonctl

# Auth
neon auth   # browser-based login

# Create project
neon projects create --name <project-name> --region-id aws-us-east-2

# Get connection string
PROJECT_ID=$(neon projects list --output json | python3 -c "
import sys, json
projects = json.load(sys.stdin)['projects']
print(next(p['id'] for p in projects if p['name'] == '<project-name>'))")

NEON_DATABASE_URL=$(neon connection-string --project-id $PROJECT_ID --role-name neondb_owner)
echo "DATABASE_URL=$NEON_DATABASE_URL"

# Run migrations if Prisma detected
if [ -f "prisma/schema.prisma" ]; then
  DATABASE_URL="$NEON_DATABASE_URL" npx prisma migrate deploy
fi
```

- **Output**: `DATABASE_URL` for backend env var injection
- **Free tier**: 0.5GB storage, autoscaling, no pause (unlike Supabase). State this as advantage.

**Step 3: Review with skill-creator** — verify "when to prefer Neon over Supabase" guidance is clear.

**Step 4: Commit**

```bash
git add skills/deploy-neon/SKILL.md
git commit -m "feat: add deploy-neon skill"
```

---

## Task 9: `deploy-upstash` skill

**Files:**
- Create: `skills/deploy-upstash/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that creates an Upstash Redis database via REST API using UPSTASH_EMAIL and UPSTASH_API_KEY, and exports REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN."

**Step 2: Write `skills/deploy-upstash/SKILL.md`**

The skill must:
- **Trigger on**: "deploy to Upstash", "set up Redis", "set up queues", "create Upstash database", or invoked by deploy-project when queues/Redis detected
- **Uses Upstash REST API** (API key + email from setup-auth step)
- **Create Redis database**:

```bash
# Create database
RESPONSE=$(curl -s -X POST https://api.upstash.com/v2/redis/database \
  -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<project-name>-redis",
    "region": "us-east-1",
    "tls": true
  }')

REDIS_URL=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'rediss://:{d[\"password\"]}@{d[\"endpoint\"]}:{d[\"port\"]}')")
UPSTASH_REST_URL=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['rest_token'])")
UPSTASH_REST_TOKEN=$(echo $RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['read_only_rest_token'])")

echo "REDIS_URL=$REDIS_URL"
echo "UPSTASH_REDIS_REST_URL=https://$(echo $RESPONSE | python3 -c \"import sys,json; print(json.load(sys.stdin)['endpoint'])\")"
echo "UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REST_URL"
```

- **Output**: `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` for backend injection
- **Free tier**: 10k commands/day, 256MB max. State limits clearly.

**Step 3: Review with skill-creator** — verify free tier limits (10k cmd/day) are prominently stated.

**Step 4: Commit**

```bash
git add skills/deploy-upstash/SKILL.md
git commit -m "feat: add deploy-upstash skill"
```

---

## Task 10: `setup-cicd` skill

**Files:**
- Create: `skills/setup-cicd/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that generates GitHub Actions workflows (deploy-frontend.yml, deploy-backend.yml, health-check.yml with cron every 6hrs), stores secrets via `gh secret set`, commits and pushes via git+gh."

**Step 2: Write `skills/setup-cicd/SKILL.md`**

The skill must:
- **Trigger on**: "set up CI/CD", "create GitHub Actions", "automate deploys", or invoked by deploy-project after all services deployed
- **Read** `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` and `DEPLOYMENT_DOCS/DEPLOYED_ENV.md` to know what was deployed
- **Generate workflow files** based on what platforms are in use:

**deploy-frontend.yml** (if Vercel):
```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - '<frontend-dir>/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }} --yes
        working-directory: <frontend-dir>
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**deploy-backend.yml** (if Render):
```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - '<backend-dir>/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": false}'
```

**health-check.yml**:
```yaml
name: Health Check
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:
jobs:
  health:
    runs-on: ubuntu-latest
    steps:
      - name: Check services
        run: |
          FAILED=()
          check() {
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$1")
            if [ "$STATUS" -lt 200 ] || [ "$STATUS" -gt 299 ]; then
              FAILED+=("$1 → HTTP $STATUS")
            fi
          }
          check "${{ secrets.FRONTEND_URL }}"
          check "${{ secrets.BACKEND_URL }}/health"
          if [ ${#FAILED[@]} -gt 0 ]; then
            BODY="Health check failed:\n$(printf '%s\n' "${FAILED[@]}")"
            gh issue create --title "Health check failed $(date +%Y-%m-%d)" --body "$BODY" --label "bug"
            exit 1
          fi
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- **Store secrets via `gh`**:
```bash
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY"
gh secret set RENDER_SERVICE_ID --body "$RENDER_SERVICE_ID"
gh secret set FRONTEND_URL --body "$FRONTEND_URL"
gh secret set BACKEND_URL --body "$BACKEND_URL"
# etc.
```

- **Commit and push workflows**:
```bash
git add .github/
git commit -m "chore: add GitHub Actions CI/CD workflows"
git push
```

- **Verify secrets**: `gh secret list` → confirm all expected secrets are listed

**Step 3: Review with skill-creator** — verify `gh secret set` commands and workflow YAML templates are accurate and complete.

**Step 4: Commit**

```bash
git add skills/setup-cicd/SKILL.md
git commit -m "feat: add setup-cicd skill"
```

---

## Task 11: `verify-deployment` skill

**Files:**
- Create: `skills/verify-deployment/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating a skill that verifies a deployment by: curl health checks on all service URLs, agent-browser visual check of frontend, cross-service connectivity test (frontend→backend→DB), and prints a pass/fail summary table. Retries Render endpoints up to 3x due to cold starts."

**Step 2: Write `skills/verify-deployment/SKILL.md`**

The skill must:
- **Trigger on**: "verify deployment", "check if everything is working", "test deployment", or invoked by deploy-project after CI/CD setup
- **Read** `DEPLOYMENT_DOCS/DEPLOYED_ENV.md` for service URLs
- **Run checks in order**:

```bash
# 1. HTTP health checks for all services
check_url() {
  local name=$1 url=$2
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url")
  if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
    echo "✓ $name ($url) → HTTP $STATUS"
  else
    echo "✗ $name ($url) → HTTP $STATUS (FAILED)"
    return 1
  fi
}

check_url "Frontend" "$FRONTEND_URL"
check_url "Backend health" "$BACKEND_URL/health"
# Add more based on DEPLOYMENT_PLAN.md

# 2. agent-browser: visual check that frontend actually renders
agent-browser open "$FRONTEND_URL"
agent-browser wait --load networkidle
agent-browser screenshot verify-frontend.png
agent-browser snapshot -i
# Check snapshot doesn't show error page (look for error text patterns)

# 3. Cross-service connectivity: call API from same session
curl -s "$BACKEND_URL/api/health" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assert data.get('status') == 'ok', f'API health failed: {data}'
print('✓ Backend API responding correctly')
"

# 4. DB connectivity (via backend health endpoint that checks DB)
curl -s "$BACKEND_URL/api/health/db" | python3 -c "
import sys, json
data = json.load(sys.stdin)
assert data.get('db') == 'connected', f'DB check failed: {data}'
print('✓ Database connected')
" 2>/dev/null || echo "ℹ DB health endpoint not found — skipping DB check"

# 5. Print summary table
echo ""
echo "=== Deployment Verification Summary ==="
echo "Frontend:  $FRONTEND_STATUS"
echo "Backend:   $BACKEND_STATUS"
echo "Database:  $DB_STATUS"
echo "======================================="
```

- **On failure**: print clearly what failed, suggest specific fix, ask "Want me to retry verification after you fix it?"
- **Screenshot** `verify-frontend.png` saved to `DEPLOYMENT_DOCS/` as evidence
- **IMPORTANT**: if backend has Render free tier cold start, retry health check up to 3 times with 30s wait before declaring failure

**Step 3: Review with skill-creator** — verify the retry logic and screenshot evidence steps are clearly described.

**Step 4: Commit**

```bash
git add skills/verify-deployment/SKILL.md
git commit -m "feat: add verify-deployment skill"
```

---

## Task 12: `deploy-project` orchestrator skill (CRITICAL)

**Files:**
- Create: `skills/deploy-project/SKILL.md`

**Step 1: Invoke skill-creator**

Describe: "Creating an orchestrator skill that sequentially invokes: @scan-project → @setup-auth → @gh-repo-setup (if needed) → @deploy-supabase/@deploy-neon → @deploy-upstash → @deploy-render/@deploy-railway → @deploy-vercel/@deploy-netlify/@deploy-cloudflare → @setup-cicd → @verify-deployment. It stops on any failure and never skips steps. This is the one-shot 'deploy my project' skill."

**Step 2: Write `skills/deploy-project/SKILL.md`**

This is the most important skill. It must:

- **Trigger on**: "deploy my project", "deploy everything", "deploy my app", "set up deployment"
- **State upfront**: "I will now deploy your entire project to free cloud infrastructure. This is a multi-step process: scan → auth → deploy services → CI/CD → verify. I will stop and report if anything fails."

**Full sequential flow** — each step must complete successfully before the next begins:

```
STEP 1: SCAN
  - Invoke @scan-project
  - Wait for user approval of DEPLOYMENT_PLAN.md
  - Read DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md into memory

STEP 2: AUTH
  - Invoke @setup-auth
  - Pass: list of platforms from DEPLOYMENT_PLAN.md
  - Must complete with all platforms verified before continuing

STEP 3: GITHUB REPO
  - Check: gh repo view 2>/dev/null → if fails, repo doesn't exist
  - If not on GitHub: invoke @gh-repo-setup
  - Verify: gh repo view → success

STEP 4: DEPLOY SERVICES (in dependency order)

  4a. Database (if in plan):
    - If plan says Supabase → invoke @deploy-supabase
    - If plan says Neon → invoke @deploy-neon
    - Capture: DATABASE_URL (and SUPABASE_URL, SUPABASE_ANON_KEY if Supabase)

  4b. Redis/Queues (if in plan):
    - Invoke @deploy-upstash
    - Capture: REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

  4c. Backend (if in plan):
    - Inject env vars from 4a and 4b into backend deploy
    - If plan says Render → invoke @deploy-render
    - If plan says Railway → invoke @deploy-railway
    - Capture: BACKEND_URL

  4d. Frontend (if in plan):
    - Inject BACKEND_URL as NEXT_PUBLIC_API_URL or VITE_API_URL
    - If plan says Vercel → invoke @deploy-vercel
    - If plan says Netlify → invoke @deploy-netlify
    - If plan says Cloudflare Pages → invoke @deploy-cloudflare
    - Capture: FRONTEND_URL

  After each sub-step: confirm service is accessible before moving to next

STEP 5: SAVE DEPLOYED ENV
  - Write DEPLOYMENT_DOCS/DEPLOYED_ENV.md with ALL captured URLs and keys
  - Add DEPLOYMENT_DOCS/DEPLOYED_ENV.md to .gitignore
  - Commit: git add DEPLOYMENT_DOCS/ && git commit -m "docs: add deployment docs"

STEP 6: CI/CD
  - Invoke @setup-cicd
  - Pass: all captured service IDs, URLs, and tokens

STEP 7: VERIFY
  - Invoke @verify-deployment
  - If verification fails: DO NOT claim success
    → Report exactly what failed
    → Suggest fix
    → Ask user if they want to retry

STEP 8: FINAL REPORT
  Print:
  ========================================
  DEPLOYMENT COMPLETE
  ========================================
  Frontend:  <FRONTEND_URL>
  Backend:   <BACKEND_URL>
  Database:  <platform> (project: <name>)

  CI/CD: GitHub Actions configured
  Health checks: every 6 hours

  Docs saved to: DEPLOYMENT_DOCS/
  ========================================
```

- **HARD RULE**: if any step fails, stop immediately, print `DEPLOYMENT PAUSED at step X: <reason>`, suggest fix, ask if user wants to retry that step
- **Never skip steps** — even if a service appears to already be deployed, verify it's working before assuming

**Step 2: Review with skill-creator**

Invoke `skill-creator` skill to review the orchestrator for completeness and trigger clarity.

**Step 3: Commit**

```bash
git add skills/deploy-project/SKILL.md
git commit -m "feat: add deploy-project orchestrator skill"
```

---

## Task 13: Publish as Claude Code marketplace and verify end-to-end

This task publishes the plugin as a proper installable Claude Code marketplace. The end result is a GitHub repo that anyone can install with two commands.

**Step 1: Create public GitHub repo using `gh`**

```bash
gh repo create deploy-skills \
  --public \
  --description "One-shot deployment of any project to free cloud infrastructure — scan, auth, deploy, CI/CD, verify" \
  --source . \
  --remote origin \
  --push
```

Verify:
```bash
gh repo view   # should show your deploy-skills repo
```

**Step 2: Confirm marketplace installability — the `.claude-plugin/plugin.json` file is what makes this a marketplace plugin**

Check the manifest is valid:
```bash
cat .claude-plugin/plugin.json
# Must have: name, description, version, skills array
```

**Step 3: Add marketplace topic tag to GitHub repo**

```bash
gh repo edit --add-topic claude-code-plugin
gh repo edit --add-topic claude-skills
gh repo edit --add-topic deployment
```

This makes the repo discoverable.

**Step 4: Test full marketplace install in a separate terminal**

Open a new terminal and test the complete install flow:
```
/plugin marketplace add <your-github-username>/deploy-skills
/plugin install deploy-skills@deploy-skills
```

Expected: Claude Code confirms installation of 12 skills. Run `/help` and confirm all skills appear in the skills list.

If install fails — common issues:
- `.claude-plugin/plugin.json` has wrong format → fix and push
- Skills directory path doesn't match manifest → fix paths and push
- Repo is private → `gh repo edit --visibility public`

**Step 5: Smoke test `scan-project` on a real project**

```bash
cd /home/aayushms/work/pet_projects/ecom   # or any project with frontend + backend
```

In Claude Code:
```
scan my project
```

Verify:
- `DEPLOYMENT_DOCS/` directory is created in that project
- `HOW_TO_RUN.md`, `DEPLOYMENT_PLAN.md`, `SERVICES.md` are all written
- The detected services and platform recommendations look correct

**Step 6: Smoke test `deploy-project` trigger words**

Verify the orchestrator triggers correctly:
```
deploy my project
```
Expected: Claude invokes `deploy-project` skill (not just responds generically). It should start with the scan-project step.

**Step 7: Update README with exact install commands (now that username is known)**

```bash
# Edit README.md to replace "your-username" with actual GitHub username
# Then:
git add README.md
git commit -m "docs: update README with correct install commands"
git push
```

**Step 8: Final marketplace URL**

The plugin is now installable at:
```
/plugin marketplace add <username>/deploy-skills
```

Print this URL prominently in the terminal output.

---

## Task 14: Update memory

**Step 1: Save key facts to MEMORY.md**

```bash
# Add to /home/aayushms/.claude/projects/-home-aayushms-work-pet-projects-deployment-infrastructure/memory/MEMORY.md
```

Key facts to record:
- Plugin repo is at `<username>/deploy-skills`
- Install command: `/plugin marketplace add <username>/deploy-skills`
- Render free tier: services spin down after 15min inactivity (cold start ~30s)
- Supabase free tier: projects pause after 7 days inactivity
- Railway is NOT truly free (trial credit only)
- Upstash free: 10k commands/day
- `setup-auth` reads `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` to know what to auth

---

## Anti-patterns to avoid

- **Don't hardcode project names**: always derive from `package.json` `name` field or directory name
- **Don't assume env var names**: read `.env.example` to discover the project's actual variable names
- **Don't skip auth verification**: always verify before deploying, never optimistically continue
- **Don't use `git push` alone**: use `gh repo push` or set up remote with `gh` for consistent auth
- **Don't claim success without curl check**: every deploy step must end with a connectivity test
