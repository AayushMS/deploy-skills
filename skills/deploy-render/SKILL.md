---
name: deploy-render
description: Use this skill when the user asks to "deploy to Render", "deploy my backend to Render", "host my server on Render", "deploy my API to Render", or when invoked by the deploy-project orchestrator to deploy a backend/server service. Uses the Render REST API (not CLI) with RENDER_API_KEY. Deploys a web service from a GitHub repo, polls until live, and exports RENDER_SERVICE_ID and RENDER_SERVICE_URL. Free tier: 750 hours/month, services spin down after 15 minutes of inactivity.
---

# Deploy to Render

Render is used for backend services (Node.js, Python, Go servers). Uses REST API — no CLI.

## Prerequisites
- `RENDER_API_KEY` must be set (run setup-auth if not)
- Project must be pushed to GitHub first (run gh-repo-setup if not)
- Detect build/start commands from package.json scripts

## Detect Build and Start Commands

From the project's `package.json`:
- Build command: look for `"build"` in scripts, else `"npm install"`
- Start command: look for `"start"` in scripts, then `"node src/index.js"` as fallback
- For Python: check `Procfile` for `web:` line, else `uvicorn main:app --host 0.0.0.0 --port 10000`

## Deployment Workflow

### 1. Get owner ID
```bash
OWNER_ID=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  https://api.render.com/v1/owners \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['owner']['id'])")
echo "Owner ID: $OWNER_ID"
```

### 2. Create web service
```bash
REPO_URL=$(gh repo view --json url -q .url)
SERVICE_NAME=$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')

SERVICE_RESPONSE=$(curl -s -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"web_service\",
    \"name\": \"$SERVICE_NAME\",
    \"ownerId\": \"$OWNER_ID\",
    \"repo\": \"$REPO_URL\",
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
echo "Service ID: $SERVICE_ID"
echo "Service URL: $SERVICE_URL"
```

### 3. Set environment variables (called after database is deployed)
```bash
# Pass env vars as JSON array. Call this AFTER getting DATABASE_URL etc.
curl -s -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "DATABASE_URL", "value": "<from-supabase-or-neon>"},
    {"key": "REDIS_URL", "value": "<from-upstash-if-needed>"}
  ]'
```
Replace with actual values from previous deploy steps.

### 4. Poll until live (up to 10 minutes)
```bash
echo "Waiting for Render deploy to complete..."
for i in $(seq 1 60); do
  STATUS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
    "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1" \
    | python3 -c "
import sys,json
deploys=json.load(sys.stdin)
print(deploys[0]['deploy']['status'] if deploys else 'pending')
" 2>/dev/null || echo "pending")
  echo "  [$i/60] Deploy status: $STATUS"
  if [ "$STATUS" = "live" ]; then
    echo "✓ Deploy complete!"
    break
  fi
  if [ "$STATUS" = "failed" ]; then
    echo "✗ Deploy FAILED. Check logs at: https://dashboard.render.com"
    exit 1
  fi
  sleep 10
done
```

### 5. Verify service is accessible
```bash
echo "Verifying service is accessible..."
for i in 1 2 3; do
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$SERVICE_URL/health" 2>/dev/null)
  if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
    echo "✓ Service is live: $SERVICE_URL"
    break
  fi
  echo "  Attempt $i: HTTP $HTTP_STATUS — retrying in 15s (Render may be starting up)"
  sleep 15
done
```

### 6. Export for orchestrator
```
RENDER_SERVICE_ID=$SERVICE_ID
RENDER_SERVICE_URL=$SERVICE_URL
```
Note these values — the deploy-project orchestrator uses them when setting up CI/CD and wiring env vars.

## Free Tier Notes
⚠️ Render free services **spin down after 15 minutes of inactivity**. The next request after spindown takes ~30 seconds (cold start). This is normal behavior on the free tier.
⚠️ Free tier: 750 hours/month (enough for one always-on service if requests keep it warm).

## On Failure
If the deploy fails:
1. Print the deploy status and SERVICE_ID
2. Tell the user: "Check logs at https://dashboard.render.com/web/$SERVICE_ID/logs"
3. Common issues:
   - Build command fails → check the buildCommand in Render dashboard
   - Start command fails → check PORT env var (must use process.env.PORT, default 10000)
   - Environment variable missing → set via Render dashboard or re-run with correct vars

## Logging

When this skill finishes (success or failure), append to `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md`:

```
## deploy-render — [current date and time]
**Status:** ✅ Live | ❌ Failed | ⏳ Timed out polling

**Service name:** [name used]
**Service URL:** [https://... or "not obtained"]
**Environment:** [region, plan: free]
**Env vars injected:** [list of variable NAMES set, e.g. DATABASE_URL, REDIS_URL — no values]
**Health check:** [passed / failed / skipped]
**Poll duration:** [~N minutes to go live]

**Error (if any):** [error message or "none"]
```
