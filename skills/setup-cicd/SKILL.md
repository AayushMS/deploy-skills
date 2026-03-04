---
name: setup-cicd
description: Use this skill when the user asks to "set up CI/CD", "create GitHub Actions", "automate my deployments", "set up auto-deploy on push", "create deployment workflows", or when invoked by the deploy-project orchestrator after all services are deployed to set up GitHub Actions workflows. Reads DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md and DEPLOYMENT_DOCS/DEPLOYED_ENV.md to know what was deployed, generates .github/workflows/ files appropriate for the platforms used, stores deploy tokens as GitHub Secrets via `gh secret set`, and commits + pushes the workflows.
---

# setup-cicd

Generates GitHub Actions CI/CD workflows based on what was deployed, stores secrets, and pushes workflows to the repo.

---

## Step 1: Read deployment docs

Read `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` to know which platforms are deployed.
Read `DEPLOYMENT_DOCS/DEPLOYED_ENV.md` to get service IDs and URLs.

If either file is missing, halt:

> "Run deploy-project first to deploy your services before setting up CI/CD."

---

## Step 2: Create .github/workflows/ directory

```bash
mkdir -p .github/workflows
```

---

## Step 3: Generate workflow files based on what's deployed

### deploy-frontend.yml — Vercel variant (if Vercel is in the plan)

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - '<frontend-dir>/**'
      - '!DEPLOYMENT_DOCS/**'
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

### deploy-frontend.yml — Netlify variant (if Netlify is in the plan, use instead of Vercel variant)

```yaml
name: Deploy Frontend
on:
  push:
    branches: [main]
    paths:
      - '<frontend-dir>/**'
      - '!DEPLOYMENT_DOCS/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Netlify
        run: npx netlify-cli deploy --prod --build --auth ${{ secrets.NETLIFY_AUTH_TOKEN }} --site ${{ secrets.NETLIFY_SITE_ID }}
        working-directory: <frontend-dir>
```

### deploy-backend.yml (if Render is in the plan)

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - '<backend-dir>/**'
      - '!DEPLOYMENT_DOCS/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          RESPONSE=$(curl -s -X POST \
            "https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": false}')
          echo "Deploy triggered: $RESPONSE"
```

### health-check.yml (always generate this, regardless of platform)

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
      - uses: actions/checkout@v4
      - name: Check all services
        run: |
          FAILED=()
          check() {
            local name=$1 url=$2
            STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$url" 2>/dev/null || echo "000")
            if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
              echo "✓ $name: HTTP $STATUS"
            else
              echo "✗ $name: HTTP $STATUS (FAILED)"
              FAILED+=("$name ($url) → HTTP $STATUS")
            fi
          }
          check "Frontend" "${{ secrets.FRONTEND_URL }}"
          check "Backend" "${{ secrets.BACKEND_URL }}/health"
          if [ ${#FAILED[@]} -gt 0 ]; then
            BODY="## Health Check Failed\n\nDate: $(date -u)\n\nFailed services:\n$(printf '- %s\n' "${FAILED[@]}")"
            gh issue create \
              --title "Health check failed: $(date +%Y-%m-%d)" \
              --body "$BODY" \
              --label "bug" \
              2>/dev/null || echo "Could not create issue (check GH_TOKEN permissions)"
            exit 1
          fi
          echo "All services healthy!"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Step 4: Store secrets via `gh secret set`

Based on what's in `DEPLOYED_ENV.md`, set secrets for each platform that was deployed. Only set secrets for platforms actually used — skip platforms not listed in DEPLOYMENT_PLAN.md.

```bash
# Always set service URLs (for health check)
gh secret set FRONTEND_URL --body "$FRONTEND_URL"
gh secret set BACKEND_URL --body "$BACKEND_URL"

# Vercel (if deployed)
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"

# Netlify (if deployed)
gh secret set NETLIFY_AUTH_TOKEN --body "$(cat ~/.netlify/config.json | python3 -c "import sys,json; u=json.load(sys.stdin)['users']; k=list(u.keys())[0]; print(u[k]['auth']['token'])" 2>/dev/null)"
gh secret set NETLIFY_SITE_ID --body "$NETLIFY_SITE_ID"

# Render (if deployed)
gh secret set RENDER_API_KEY --body "$RENDER_API_KEY"
gh secret set RENDER_SERVICE_ID --body "$RENDER_SERVICE_ID"
```

---

## Step 5: Replace placeholders in generated workflow files

The `<frontend-dir>` and `<backend-dir>` placeholders in the workflow files need to be replaced with the actual paths detected by scan-project. Read `DEPLOYMENT_DOCS/SERVICES.md` to find the paths.

If `SERVICES.md` does not contain directory paths, ask the user:

> "What is the relative path to your frontend directory? (e.g., `client`, `frontend`, `.`)"

Use `sed` or direct file write to substitute the real paths into the generated YAML files before committing.

---

## Step 6: Commit and push workflows

```bash
git add .github/
git commit -m "chore: add GitHub Actions CI/CD workflows"
git push
```

---

## Step 7: Verify secrets are set

```bash
gh secret list
# Verify all expected secrets appear in the output
```

---

## Final summary

Print after completion:

```
=== CI/CD Setup Complete ===
Workflows created:
  ✓ .github/workflows/deploy-frontend.yml (triggers on push to <frontend-dir>)
  ✓ .github/workflows/deploy-backend.yml (triggers on push to <backend-dir>)
  ✓ .github/workflows/health-check.yml (runs every 6 hours)

Secrets set: [list of secrets]

Next push to main will trigger deployment automatically.
```

---

## On Failure

- **`gh secret set` fails:** Run `gh auth status` — you may need to re-authenticate with `gh auth login`
- **Workflow has syntax error:** Validate YAML with:
  ```bash
  python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-frontend.yml'))"
  ```
- **Push fails:** Run `gh auth setup-git` to configure git credentials via gh

## Logging

When this skill finishes (success or failure), append to `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md`:

```
## setup-cicd — [current date and time]
**Status:** ✅ Complete | ❌ Failed | ⚠️ Partial

**Workflows generated:**
- deploy-frontend.yml: [yes (Vercel) / yes (Netlify) / no]
- deploy-backend.yml: [yes (Render) / no]
- health-check.yml: [yes / no]

**GitHub Secrets set:** [list of secret NAMES — no values]
**Committed and pushed:** [yes / no]

**Error (if any):** [error message or "none"]
```
