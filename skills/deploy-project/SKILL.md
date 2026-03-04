---
name: deploy-project
description: Use this skill when the user asks to "deploy my project", "deploy everything", "deploy my app", "set up deployment for my project", "get my project live", "deploy to free infrastructure", "deploy my fullstack app", or any request to deploy a complete project to cloud infrastructure. This is the main orchestrator skill that sequentially invokes all other deploy-skills: scans the project, guides authentication, deploys all services in dependency order (database → queues → backend → frontend), wires environment variables between services automatically, sets up GitHub Actions CI/CD, and verifies everything is live. Stops immediately on any failure and reports what went wrong.
---

# deploy-project — One-Shot Deployment Orchestrator

This skill deploys your entire project to free cloud infrastructure in one run.

**Upfront announcement:**

> I will now deploy your entire project. This process has 7 steps:
> 1. Scan project → detect services and recommend platforms
> 2. Authenticate → verify logins for required tools
> 3. Set up GitHub repo → ensure code is on GitHub
> 4. Deploy services → database, queues, backend, frontend (in order)
> 5. Save deployed URLs → write DEPLOYMENT_DOCS/DEPLOYED_ENV.md
> 6. Set up CI/CD → GitHub Actions workflows
> 7. Verify → health checks and integration tests
>
> I will stop and explain if anything fails. Let's begin.

---

## STEP 1: Scan Project

Invoke the `scan-project` skill.

After scan-project writes `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md`, read it and show the user the summary.

**Wait for explicit user approval** ("yes" or confirmation) before proceeding.

On user approval, load into memory:
- Which platforms are needed (from "Recommended Platforms" table)
- Service dependency order (from "Deployment Order" section)
- Env var wiring plan (from "Environment Variable Wiring" section)

**If scan-project fails or finds nothing:** Stop. Report:

> "DEPLOYMENT PAUSED at Step 1: Could not detect project structure. [reason]"

---

## STEP 2: Authenticate

Invoke the `setup-auth` skill, passing the list of required platforms from Step 1.

**Wait for setup-auth to complete with ALL platforms verified.**

If setup-auth fails or user cannot authenticate a required tool, stop. Report:

> "DEPLOYMENT PAUSED at Step 2: Authentication incomplete for [platform]. [how to fix]"

---

## STEP 3: GitHub Repo

Check if the project is already on GitHub:

```bash
gh repo view 2>/dev/null && REPO_EXISTS=true
```

If not on GitHub, invoke the `gh-repo-setup` skill to create and push the repo.

Verify after setup:

```bash
REPO_URL=$(gh repo view --json url -q .url)
echo "✓ GitHub repo: $REPO_URL"
```

If this step fails, stop. Report:

> "DEPLOYMENT PAUSED at Step 3: Could not set up GitHub repo. [reason]"

---

## STEP 4: Deploy Services (Dependency Order)

Execute in this exact order. After each sub-step, verify the service is accessible before continuing.

### 4a. Database (if in plan)

Read `DEPLOYMENT_PLAN.md` "Deployment Order" to determine which DB platform was recommended.

**If plan says Supabase:**
- Invoke `deploy-supabase` skill
- After completion, capture from `DEPLOYED_ENV.md`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

**If plan says Neon:**
- Invoke `deploy-neon` skill
- Capture: `DATABASE_URL`

Verify: `DATABASE_URL` is non-empty.
If empty, stop. Report:

> "DEPLOYMENT PAUSED at Step 4a: Database deployment failed. Check errors above."

### 4b. Redis/Queues (if in plan)

If BullMQ, ioredis, or `REDIS_URL` was detected by scan-project:
- Invoke `deploy-upstash` skill
- Capture: `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Verify: `REDIS_URL` is non-empty.
If empty: stop. Report: "DEPLOYMENT PAUSED at Step 4b: Redis/Upstash deployment failed. Check errors above."

### 4c. Backend (if in plan)

Before deploying backend, inject env vars from 4a and 4b into the deploy command:
- Pass `DATABASE_URL` from step 4a
- Pass `REDIS_URL` from step 4b (if applicable)
- Pass `SUPABASE_URL`, `SUPABASE_ANON_KEY` if Supabase was used

**If plan says Render:**
- Invoke `deploy-render` skill
- After creating the service, call the Render env vars API to set `DATABASE_URL`, `REDIS_URL`, etc.
- Capture: `RENDER_SERVICE_ID`, `RENDER_SERVICE_URL`
  → set as `BACKEND_URL=$RENDER_SERVICE_URL`

**If plan says Railway:**
- Invoke `deploy-railway` skill
- Capture backend URL → set as `BACKEND_URL`

Verify: `curl $BACKEND_URL/health` returns 2xx (retry 3 times with 30s gap for cold start).
If fails after all retries, stop. Report:

> "DEPLOYMENT PAUSED at Step 4c: Backend not responding after deploy. [URL tried]"

### 4d. Frontend (if in plan)

Before deploying frontend, inject backend URL:
- Determine env var name from `.env.example`: `NEXT_PUBLIC_API_URL`, `VITE_API_URL`, or `REACT_APP_API_URL`
- Set it to `$BACKEND_URL`

**If plan says Vercel:**
- Invoke `deploy-vercel` skill
- Capture: `FRONTEND_URL`

**If plan says Netlify:**
- Invoke `deploy-netlify` skill
- Capture: `NETLIFY_URL` → set as `FRONTEND_URL`

**If plan says Cloudflare Pages:**
- Invoke `deploy-cloudflare` skill
- Capture: `CF_URL` → set as `FRONTEND_URL`

Verify: `curl $FRONTEND_URL` returns 2xx.
If fails, stop. Report:

> "DEPLOYMENT PAUSED at Step 4d: Frontend not accessible after deploy. [URL tried]"

---

## STEP 5: Save Deployed Environment

Write all captured URLs and credentials to `DEPLOYMENT_DOCS/DEPLOYED_ENV.md`:

```bash
mkdir -p DEPLOYMENT_DOCS
cat > DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF
# Deployed Environment
# Generated by deploy-project on $(date -u)
# DO NOT COMMIT THIS FILE (it is gitignored)

FRONTEND_URL=$FRONTEND_URL
BACKEND_URL=$BACKEND_URL
DATABASE_URL=$DATABASE_URL
SUPABASE_URL=${SUPABASE_URL:-}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-}
REDIS_URL=${REDIS_URL:-}
RENDER_SERVICE_ID=${RENDER_SERVICE_ID:-}
NETLIFY_SITE_ID=${NETLIFY_SITE_ID:-}
CF_PROJECT_NAME=${CF_PROJECT_NAME:-}
EOF
chmod 600 DEPLOYMENT_DOCS/DEPLOYED_ENV.md
```

Commit the deployment docs (excluding `DEPLOYED_ENV.md` which is gitignored):

```bash
git add DEPLOYMENT_DOCS/HOW_TO_RUN.md DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md DEPLOYMENT_DOCS/SERVICES.md
git commit -m "docs: add deployment documentation"
git push
```

---

## STEP 6: Set Up CI/CD

Invoke `setup-cicd` skill.

Provide it all captured service IDs and URLs from Step 4 and Step 5 for secret injection.

Verify after setup:

```bash
gh secret list | grep -E "VERCEL_TOKEN|RENDER_API_KEY|NETLIFY_AUTH_TOKEN|FRONTEND_URL|BACKEND_URL"
```

If CI/CD setup fails: Report it but **do NOT stop** — the deployment is already live, CI/CD is recoverable separately.

---

## STEP 7: Verify Deployment

Invoke `verify-deployment` skill.

### If verification PASSES

Print the final deployment report:

```
╔══════════════════════════════════════════╗
║         DEPLOYMENT COMPLETE ✓            ║
╚══════════════════════════════════════════╝

Frontend:   <FRONTEND_URL>
Backend:    <BACKEND_URL>
Database:   <platform> (<project-name>)

CI/CD:      GitHub Actions configured
Health:     Checks every 6 hours (auto-opens GitHub issue on failure)

Docs:       DEPLOYMENT_DOCS/
  HOW_TO_RUN.md      — local development guide
  DEPLOYMENT_PLAN.md — deployment decisions
  DEPLOYED_ENV.md    — live credentials (gitignored)

Install deploy-skills:
  /plugin marketplace add aayushms/deploy-skills
```

### If verification FAILS

- **Do NOT** print "Deployment Complete"
- Print: `"DEPLOYMENT PARTIALLY COMPLETE — verification found issues:"`
- List exactly what passed and what failed
- Suggest specific fixes for what failed
- Ask: `"Would you like me to retry verification after you've checked? (yes/no)"`

---

## Hard Rules (follow always)

1. **Never skip steps** — even if a service seems already deployed, re-verify it's working
2. **Never proceed if a step fails** — stop, report `DEPLOYMENT PAUSED at Step N`, explain the issue
3. **Never claim success without verification** — Step 7 must pass before printing "DEPLOYMENT COMPLETE"
4. **Env var wiring is automatic** — the user should never need to manually copy URLs between services
5. **One-shot means one-shot** — from "deploy my project" to working URLs with no manual steps in between (only authentication in Step 2 requires user action)
