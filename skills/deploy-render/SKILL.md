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

### 0. Ensure root Dockerfile exists

**Render ignores `dockerfilePath` and always builds from `./Dockerfile` at the repo root.** If the project's Dockerfile is in a subdirectory (e.g. `backend/Dockerfile`), create a root-level one:

```bash
if [ ! -f "Dockerfile" ]; then
  # Detect subdirectory Dockerfile
  SUBDIR_DOCKERFILE=$(find . -name "Dockerfile" -not -path "./.git/*" | head -1)
  if [ -n "$SUBDIR_DOCKERFILE" ]; then
    SUBDIR=$(dirname "$SUBDIR_DOCKERFILE" | sed 's|^\./||')
    echo "Found Dockerfile at $SUBDIR_DOCKERFILE — creating root Dockerfile that builds from $SUBDIR/"
    # Read the original and adapt COPY paths to account for build context being repo root
    # Simplest approach: copy content and adjust COPY directives
    echo "Creating root Dockerfile..."
    # Write a root Dockerfile that copies the subdirectory and runs from it
    cat > Dockerfile << EOF
$(cat "$SUBDIR_DOCKERFILE" | sed "s|^COPY \.|COPY $SUBDIR|g")
EOF
    echo "⚠ Review Dockerfile — COPY paths may need adjustment for root build context"
    echo "✓ Dockerfile created at repo root"
  fi
fi
```

If a Dockerfile was created, commit it before creating the Render service:
```bash
git add Dockerfile && git commit -m "chore: add root Dockerfile for Render deployment" && git push
```

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
    \"plan\": \"free\"
  }")

# ⚠ Do NOT pass envVars in the creation payload — Render accepts them but does NOT persist them.
# Env vars must be set via a separate PUT /env-vars call after the service is created (step 3).

SERVICE_ID=$(echo $SERVICE_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['id'])")
SERVICE_URL=$(echo $SERVICE_RESPONSE | python3 -c "import sys,json; print(json.load(sys.stdin)['service']['serviceDetails']['url'])")
echo "Service ID: $SERVICE_ID"
echo "Service URL: $SERVICE_URL"
```

### 3. Set environment variables via dedicated API call

**Always use this separate PUT call — never rely on the creation payload to persist env vars.**

```bash
# Build the env vars JSON array with all required variables
curl -s -X PUT "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {"key": "DATABASE_URL", "value": "'"$DATABASE_URL"'"},
    {"key": "REDIS_URL", "value": "'"$REDIS_URL"'"}
  ]'

# Verify env vars were actually saved
SAVED=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  | python3 -c "import sys,json; vs=json.load(sys.stdin); print([v['key'] for v in vs])")
echo "Env vars saved: $SAVED"
```

If `DATABASE_URL` or other required vars are missing from the saved list, re-run the PUT call before triggering a deploy.

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

**Do NOT use the Render `/v1/logs` API** — it returns runtime logs only, not build logs, and is unreliable for diagnosis.

Instead, diagnose via deploy status + env var inspection:

```bash
# Check deploy status
DEPLOY_STATUS=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys?limit=1" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['deploy']['status'] if d else 'unknown')")
echo "Status: $DEPLOY_STATUS"

# Check saved env vars
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/env-vars" \
  | python3 -c "import sys,json; print([v['key'] for v in json.load(sys.stdin)])"
```

- `build_failed` → build command or Dockerfile issue → check dashboard build logs manually
- `update_failed` → service crashed at startup → almost always a missing env var or wrong start command
- Env var missing from the list → re-run the `PUT /env-vars` call and trigger a new deploy

For build logs: `https://dashboard.render.com/web/$SERVICE_ID/deploys`
