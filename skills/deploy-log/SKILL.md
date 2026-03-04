---
name: deploy-log
description: Enable continuous debug logging for deploy-skills sessions. Invoke this skill BEFORE running deploy-project (or any individual deploy-skills skill) to get step-by-step logging of every decision, command, and outcome written to DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md. Use when you want to record the full deployment process for review or debugging. Triggers on "deploy with logging", "deploy with debug", "enable deploy logging", "debug mode deploy", "deploy log", "deploy my project with logging", or any request to record/trace the deployment process.
---

# deploy-log

You are now in **deployment debug mode**. This persists for the entire session.

## Step 1: Initialize the Log

Create `DEPLOYMENT_DOCS/` if it doesn't exist, then create `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md`:

```
# Deployment Log
**Project:** [name of current directory]
**Session started:** [current date and time]
**Mode:** Debug (deploy-log active)

---

```

## Step 2: Continuous Logging Rules

For the rest of this session, after every meaningful action, append an entry to `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md`. Do this throughout execution — not just at skill boundaries.

**Log after:**
- Any service or framework detected
- Any platform decision made
- Any CLI command run (log the command and its outcome/output summary)
- Any env var captured (name only, never value)
- Any URL obtained
- Any user decision (approved / rejected / changed something)
- Any error or unexpected result
- Any step skipped and why

**Log format — one entry per action:**

```
### [HH:MM] [skill-name] — [brief title]
[One or two lines describing what happened, what was decided, or what failed.]
[Command run if applicable: `the command`]
[Outcome: success / error message / value obtained (names only for secrets)]
```

**Examples:**

```
### 14:32 scan-project — Detected Next.js frontend
Found `next` in package.json dependencies. Recommending Vercel.

### 14:33 scan-project — No Redis detected
No bullmq/ioredis in deps, no REDIS_URL in .env.example. Skipping Upstash.

### 14:35 setup-auth — Vercel already authenticated
`vercel whoami` returned username. Skipping login.

### 14:36 deploy-supabase — Created project
`supabase projects create my-app-db --region us-east-1` succeeded.
PROJECT_URL and DATABASE_URL captured.

### 14:41 deploy-render — Polling for live status (attempt 3/60)
Service not yet live. Waiting 10s before retry.

### 14:52 deploy-render — Service live
`https://my-app.onrender.com` — health check returned 200.

### 14:53 deploy-project — Wiring env vars to frontend
Injecting BACKEND_URL into Vercel project env vars.
```

## Step 3: Final Summary

When the session's deployment work is complete (or stopped), append:

```
---

## Session Summary — [current date and time]
**Overall result:** [Complete / Stopped at: step name and reason]

| Step | Status | Notes |
|------|--------|-------|
| scan-project | ✅/❌ | |
| setup-auth | ✅/❌ | |
| deploy-[db] | ✅/❌ | |
| deploy-[backend] | ✅/❌ | |
| deploy-[frontend] | ✅/❌ | |
| setup-cicd | ✅/❌ | |
| verify-deployment | ✅/❌ | |

**Deployed URLs:**
- Frontend: [URL or not deployed]
- Backend: [URL or not deployed]
- Database: [platform + project or not deployed]

**Total duration:** ~[N] minutes
```

## Step 4: Proceed

After initializing the log file, tell the user:

```
Debug logging enabled. DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md will be updated continuously throughout this session.

Ready — run /deploy-project (or any deploy-skills skill) to begin.
```

Then wait for the user's next command. Do not invoke deploy-project automatically.

## Rules

- **Never log secret values** — only variable names (e.g. `RENDER_API_KEY captured`, not the key itself)
- **Append only** — never overwrite the log file
- **Log failures immediately** when they happen, not just at the end
- **Keep entries brief** — one or two lines each; this is a trace log, not an essay
