---
name: deploy-cloudflare
description: Use this skill when the user asks to "deploy to Cloudflare", "deploy to Cloudflare Pages", "deploy to Cloudflare Workers", "host my site on Cloudflare", or when invoked by deploy-project for edge/static frontend deployment. Handles two modes: Cloudflare Pages (for SPAs, static sites, SSR) and Cloudflare Workers (for edge functions/serverless). Uses wrangler CLI. Free tier: Pages - unlimited requests; Workers - 10 million requests/month.
---

# Deploy to Cloudflare

Two modes — detect which applies:
- **Cloudflare Pages**: for static sites, SPAs (React/Vite), and SSR frameworks (Next.js, SvelteKit, Astro)
- **Cloudflare Workers**: for edge functions, serverless API handlers, or projects with `wrangler.toml`

## Detect Mode

Use Pages if ANY of:
- No `wrangler.toml` exists AND project has frontend framework (React, Vite, Astro, SvelteKit)
- `wrangler.toml` has `[pages]` section

Use Workers if:
- `wrangler.toml` exists with `main` field pointing to a JS/TS entry file
- Project has edge function patterns (no HTML entry, pure JS handler)

## Prerequisites
- wrangler CLI installed: `wrangler --version` (install: `npm install -g wrangler`)
- Logged in: `wrangler whoami` (run setup-auth if not)

---

## Cloudflare Pages Deployment

### 1. Build the project
```bash
cd <frontend-dir>
npm run build   # or detected build command
```

### 2. Detect output directory
Check in order: `dist/`, `build/`, `.next/`, `out/`, `.svelte-kit/output/client/`, `public/`.
Use first directory that exists.

### 3. Deploy to Pages
```bash
PROJECT_NAME=$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')

wrangler pages deploy <output-dir> \
  --project-name "$PROJECT_NAME" \
  --commit-dirty=true
# First deploy: creates the project automatically
```

### 4. Set environment variables via Cloudflare API
wrangler CLI has limited env var support for Pages — use the API:
```bash
ACCOUNT_ID=$(wrangler whoami --json 2>/dev/null | python3 -c "
import sys,json
try: print(json.load(sys.stdin)['accounts'][0]['id'])
except: pass
")

CF_TOKEN=$(cat ~/.wrangler/config/default.toml 2>/dev/null | python3 -c "
import sys
for line in sys.stdin:
  if 'token' in line and '=' in line:
    print(line.split('=')[1].strip().strip('\"'))
    break
" 2>/dev/null)

curl -s -X PATCH \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT_NAME" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"deployment_configs\":{\"production\":{\"env_vars\":{\"VITE_API_URL\":{\"value\":\"$BACKEND_URL\",\"type\":\"plain_text\"}}}}}"
```

### 5. Get deployed URL
```bash
CF_URL="https://$PROJECT_NAME.pages.dev"
echo "✓ Deployed: $CF_URL"
```

---

## Cloudflare Workers Deployment

### 1. Ensure wrangler.toml exists
If not present, create a minimal one:
```toml
name = "<worker-name>"
main = "src/index.ts"
compatibility_date = "2024-01-01"
```

### 2. Set secrets (interactive)
```bash
wrangler secret put DATABASE_URL
# Prompts for value — tell user what to paste
```

### 3. Deploy
```bash
wrangler deploy
```

### 4. Get worker URL
```bash
WORKER_NAME=$(cat wrangler.toml | grep '^name' | cut -d'"' -f2)
CF_URL="https://$WORKER_NAME.<account-subdomain>.workers.dev"
echo "✓ Worker deployed: $CF_URL"
```

---

## Save and Export
```bash
cat >> DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF

## Cloudflare
CF_URL=$CF_URL
CF_PROJECT_NAME=$PROJECT_NAME
EOF
```

Export: `CF_URL` for CI/CD setup and env var wiring.

## On Failure
- Pages deploy fails: verify the output directory exists and has an `index.html`
- Workers deploy fails: check `wrangler.toml` syntax, verify `main` file exists
- API env var set fails: verify ACCOUNT_ID and CF_TOKEN are correct
