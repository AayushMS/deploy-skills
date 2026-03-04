---
name: verify-deployment
description: Use this skill when the user asks to "verify my deployment", "check if everything is working", "test my deployment", "check if my services are up", "run health checks", or when invoked by deploy-project as the final step after CI/CD setup. Reads DEPLOYMENT_DOCS/DEPLOYED_ENV.md for service URLs, runs HTTP health checks on all services, uses agent-browser to visually verify the frontend loads, tests cross-service connectivity (frontend calls backend, backend connects to DB), and prints a pass/fail summary table. Retries Render backend endpoints up to 3 times due to free tier cold starts.
---

# verify-deployment

Confirms all deployed services are live, reachable, and communicating correctly. Produces a pass/fail summary table and a frontend screenshot.

---

## Step 1: Read DEPLOYMENT_DOCS/DEPLOYED_ENV.md

Extract: `FRONTEND_URL`, `BACKEND_URL`, and any other service URLs.

If the file doesn't exist:

> "No DEPLOYED_ENV.md found. Please provide your deployed service URLs manually, or run deploy-project first."

Load the values into shell variables for use in the checks below.

---

## Step 2: HTTP health checks for all services

```bash
check_url() {
  local name=$1 url=$2 max_retries=${3:-1}
  for i in $(seq 1 $max_retries); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null || echo "000")
    if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
      echo "✓ $name → HTTP $STATUS"
      return 0
    fi
    if [ $i -lt $max_retries ]; then
      echo "  $name: HTTP $STATUS, retrying in 30s (attempt $i/$max_retries)..."
      sleep 30
    fi
  done
  echo "✗ $name → HTTP $STATUS (FAILED)"
  return 1
}

# Frontend (2 attempts — no cold start)
check_url "Frontend" "$FRONTEND_URL" 2

# Backend health endpoint (3 attempts — Render free tier cold start ~30s)
check_url "Backend /health" "$BACKEND_URL/health" 3
```

Track whether each check passed or failed for the summary table in Step 5.

---

## Step 3: agent-browser visual check of frontend

```bash
agent-browser open "$FRONTEND_URL"
agent-browser wait --load networkidle
agent-browser screenshot DEPLOYMENT_DOCS/verify-frontend.png
agent-browser snapshot -i
```

After getting the snapshot, inspect the HTML for error indicators:

- If snapshot contains any of: `"Error"`, `"404"`, `"Cannot GET"`, `"Application error"`, `"Something went wrong"` → mark frontend visual check as **FAILED**
- If snapshot shows normal UI elements (nav, content, buttons, forms) → mark as **PASSED**

```bash
agent-browser close
```

---

## Step 4: Cross-service connectivity test

```bash
# Test backend API health endpoint that also checks DB connectivity
API_RESPONSE=$(curl -s --max-time 30 "$BACKEND_URL/api/health" 2>/dev/null)
if echo "$API_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('status') in ['ok','healthy','up'], f'unexpected: {d}'" 2>/dev/null; then
  echo "✓ Backend API responding correctly"
else
  echo "ℹ Backend /api/health returned: $API_RESPONSE"
  echo "  (This is OK if your backend doesn't have a /api/health endpoint)"
fi

# Test DB connectivity via backend (if backend exposes it)
DB_RESPONSE=$(curl -s --max-time 30 "$BACKEND_URL/api/health/db" 2>/dev/null)
if [ -n "$DB_RESPONSE" ]; then
  if echo "$DB_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('db') in ['connected','ok','healthy']" 2>/dev/null; then
    echo "✓ Database connection verified via backend"
  else
    echo "ℹ DB health response: $DB_RESPONSE"
  fi
else
  echo "ℹ No /api/health/db endpoint — skipping DB connectivity check"
fi
```

---

## Step 5: Print summary table

```
=== Deployment Verification Summary ===
Service        Status    URL
─────────────────────────────────────
Frontend       ✓ PASS    <FRONTEND_URL>
Backend        ✓ PASS    <BACKEND_URL>
Backend API    ✓ PASS    /api/health
Database       ✓ PASS    via backend

Screenshot saved: DEPLOYMENT_DOCS/verify-frontend.png
═══════════════════════════════════════
```

Fill in actual URLs and actual pass/fail results from Steps 2–4. Use `✗ FAIL` for any check that did not pass.

---

## Step 6: On failure

If any check FAILS:

1. Print clearly: `"VERIFICATION FAILED: [service name] is not responding"`
2. Suggest a specific fix based on which service failed:
   - **Frontend fails:** "Check Vercel/Netlify dashboard for build errors"
   - **Backend fails:** "Check Render dashboard for deploy status — free tier may still be cold-starting (up to 30s)"
   - **DB fails:** "Check Supabase/Neon dashboard — project may have paused"
3. Ask the user: `"Would you like me to re-run verification after you've checked? (yes/no)"`
4. **Do NOT claim the deployment is successful if any check fails.**
