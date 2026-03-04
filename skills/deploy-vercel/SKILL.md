---
name: deploy-vercel
description: Deploy frontend applications to Vercel using CLI and REST API. Use when the user wants to deploy a React, Vite, Next.js, or static frontend to Vercel. Triggers on "deploy to Vercel", "Vercel deploy", "host my frontend", "deploy my app to Vercel", or any task requiring Vercel project creation, environment variables, production deployment, or GitHub auto-deploy connection.
---

# Deploy to Vercel

## Install CLI

```bash
npm i -g vercel
```

## Authenticate

```bash
vercel login
```

Verify: `vercel whoami`

## CLI Scope Issue

The Vercel CLI often fails in non-interactive (piped/automated) mode with `missing_scope` errors, even when `--scope` is provided. **Use the REST API instead for project creation, env vars, and git linking.** The CLI works reliably for `vercel --prod` deployments once the project is linked.

## Deployment Workflow

### 1. Create project via API

```bash
VERCEL_TOKEN=$(cat ~/.local/share/com.vercel.cli/auth.json | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Get team/scope ID first
curl -s "https://api.vercel.com/v2/teams" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | python3 -c "
import sys,json
for t in json.load(sys.stdin).get('teams',[]):
    print(f'{t[\"id\"]}: {t[\"name\"]}')"

TEAM_ID="<team_id_from_above>"

curl -s -X POST "https://api.vercel.com/v11/projects?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-project",
    "framework": "vite",
    "buildCommand": "cd client && npm install && npm run build",
    "outputDirectory": "client/dist",
    "installCommand": "npm install"
  }'
```

For non-monorepo projects, omit `buildCommand`/`outputDirectory`/`installCommand` and let Vercel auto-detect.

Save the `id` field from the response as `PROJECT_ID`.

### 2. Set environment variables via API

```bash
curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "VITE_SERVER_URL",
    "value": "https://my-backend.up.railway.app",
    "target": ["production", "preview"],
    "type": "plain"
  }'
```

### 3. Create local project link

```bash
mkdir -p .vercel
cat > .vercel/project.json << EOF
{"projectId": "$PROJECT_ID", "orgId": "$TEAM_ID"}
EOF
```

Add `.vercel` to `.gitignore`.

### 4. Deploy to production

```bash
vercel --prod --yes
```

### 5. Verify

The deploy output shows the production URL (e.g., `https://my-project.vercel.app`).

## Monorepo Considerations

When the frontend imports from a shared directory (e.g., `../shared/types.ts`):

- Set root directory to `.` (repo root), **not** `client/`
- Override `buildCommand` to `cd client && npm install && npm run build`
- Override `outputDirectory` to `client/dist`
- The `installCommand` at root level should trigger `postinstall` hooks for subdeps

## Connect GitHub for Auto-Deploy

```bash
curl -s -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/link?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "github",
    "repo": "USER/REPO",
    "productionBranch": "main"
  }'
```

Verify the response contains a `"link"` object with `"type": "github"`.

## Useful API Endpoints

See [references/api_reference.md](references/api_reference.md) for the full API reference.

| Action | Method | Endpoint |
|--------|--------|----------|
| Create project | POST | `/v11/projects?teamId=` |
| Set env var | POST | `/v10/projects/{id}/env?teamId=` |
| Link GitHub | POST | `/v9/projects/{id}/link?teamId=` |
| List env vars | GET | `/v10/projects/{id}/env?teamId=` |
| Update project | PATCH | `/v9/projects/{id}?teamId=` |
| Delete project | DELETE | `/v9/projects/{id}?teamId=` |
