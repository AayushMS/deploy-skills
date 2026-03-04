---
name: deploy-netlify
description: Use this skill when the user asks to "deploy to Netlify", "host my frontend on Netlify", "deploy my React app to Netlify", "deploy my static site to Netlify", or when invoked by deploy-project for frontend deployment as an alternative to Vercel. Deploys using netlify CLI, auto-detects build command and publish directory, sets environment variables, and deploys to production. Exports NETLIFY_SITE_ID and NETLIFY_URL. Free tier: 100GB bandwidth/month, 125k function invocations.
---

# Deploy to Netlify

Netlify is used for frontend deployment (React, Vite, Next.js static, SvelteKit, Astro).
Alternative to Vercel — both are free. Use Netlify if the project has a `netlify.toml` or if Vercel is already in use for another service.

## Prerequisites
- Netlify CLI installed: `netlify --version` (install: `npm install -g netlify-cli`)
- Logged in: `netlify status` (run setup-auth if not)

## Auto-detect Build Settings

Before deploying, detect from `package.json`:
- Build command: check `scripts.build`, else `npm run build`
- Publish directory: check in order: `dist/`, `build/`, `.next/`, `out/`, `public/` — use first that exists after build

If `netlify.toml` exists at project root, it already has these settings — don't override.

## Deployment Workflow

### 1. Create site (first time only)
```bash
cd <frontend-dir>
# Check if already linked
netlify status 2>/dev/null | grep "Site ID" && ALREADY_LINKED=true

if [ -z "$ALREADY_LINKED" ]; then
  netlify sites:create --name "$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')"
fi
```

### 2. Set environment variables
```bash
# Set the backend URL (replace with actual value from deploy-render output)
netlify env:set VITE_API_URL "$BACKEND_URL" --context production 2>/dev/null || true
netlify env:set NEXT_PUBLIC_API_URL "$BACKEND_URL" --context production 2>/dev/null || true
netlify env:set REACT_APP_API_URL "$BACKEND_URL" --context production 2>/dev/null || true
# Set all from .env.example that don't contain secrets
```

### 3. Deploy to production
```bash
netlify deploy --prod --build
```
This builds and deploys in one step. The `--build` flag runs the build command from `netlify.toml` or package.json.

### 4. Get deployed URL
```bash
NETLIFY_URL=$(netlify status --json 2>/dev/null | python3 -c "
import sys,json
try:
  data = json.load(sys.stdin)
  print(data.get('siteData',{}).get('url',''))
except: pass
" 2>/dev/null)

NETLIFY_SITE_ID=$(netlify status --json 2>/dev/null | python3 -c "
import sys,json
try:
  data = json.load(sys.stdin)
  print(data.get('siteData',{}).get('id',''))
except: pass
")

echo "✓ Deployed: $NETLIFY_URL"
echo "Site ID: $NETLIFY_SITE_ID"
```

### 5. Verify deployment
```bash
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$NETLIFY_URL")
if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 400 ]; then
  echo "✓ Frontend is live: $NETLIFY_URL"
else
  echo "⚠ HTTP $HTTP_STATUS — deployment may still be propagating, check in 1-2 minutes"
fi
```

### 6. Save and export
```bash
cat >> DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF

## Netlify
NETLIFY_URL=$NETLIFY_URL
NETLIFY_SITE_ID=$NETLIFY_SITE_ID
EOF
```

Export: `NETLIFY_URL`, `NETLIFY_SITE_ID` for CI/CD setup.

## On Failure
- Build fails: check build command, run `npm run build` locally first
- `netlify deploy` authentication error: run `netlify login` again
- Publish directory not found: specify with `netlify deploy --prod --dir=dist`
