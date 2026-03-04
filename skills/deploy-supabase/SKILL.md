---
name: deploy-supabase
description: Use this skill when the user asks to "deploy to Supabase", "set up Supabase", "create a Supabase project", "set up my database on Supabase", or when invoked by deploy-project to provision a PostgreSQL database with authentication and storage. Creates a Supabase project, runs migrations if present, and exports SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL. Use when the project needs auth, storage, or realtime features in addition to PostgreSQL. Free tier: 2 free projects, 500MB database, pauses after 7 days inactivity.
---

# Deploy to Supabase

Supabase provides PostgreSQL + auth + storage + realtime. Use when project needs these features together.
Use deploy-neon instead if only a PostgreSQL database is needed.

## Prerequisites
- Supabase CLI installed: `supabase --version` (install: `npm install -g supabase`)
- Logged in: `supabase projects list` (run setup-auth if not logged in)

## Deployment Workflow

### 1. Check prerequisites
```bash
supabase --version || (echo "Install: npm install -g supabase" && exit 1)
supabase projects list 2>/dev/null || (echo "Run: supabase login" && exit 1)
```

### 2. Get organization ID
```bash
ORG_ID=$(supabase orgs list --output json | python3 -c "
import sys,json
orgs = json.load(sys.stdin)
print(orgs[0]['id'])")
echo "Org ID: $ORG_ID"
```

### 3. Generate a strong DB password and create project
```bash
DB_PASSWORD=$(python3 -c "import secrets,string; print(''.join(secrets.choice(string.ascii_letters+string.digits+'!@#') for _ in range(20)))")
PROJECT_NAME=$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')

echo "Creating Supabase project '$PROJECT_NAME'..."
echo "Note: This takes ~2 minutes. Please wait."

supabase projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --db-password "$DB_PASSWORD" \
  --region us-east-1
```

### 4. Get project credentials
```bash
PROJECT_ID=$(supabase projects list --output json | python3 -c "
import sys,json
projects = json.load(sys.stdin)
print(next(p['id'] for p in projects if p['name'] == '$PROJECT_NAME'))")

echo "Project ID: $PROJECT_ID"
supabase --project-ref $PROJECT_ID status
```

### 5. Extract credentials
```bash
STATUS_JSON=$(supabase --project-ref $PROJECT_ID status --output json 2>/dev/null)
SUPABASE_URL="https://$PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY=$(echo $STATUS_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('ANON_KEY',''))")
SUPABASE_SERVICE_ROLE_KEY=$(echo $STATUS_JSON | python3 -c "import sys,json; print(json.load(sys.stdin).get('SERVICE_ROLE_KEY',''))")
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_ID}.supabase.co:5432/postgres"

echo "SUPABASE_URL=$SUPABASE_URL"
echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
echo "DATABASE_URL=$DATABASE_URL"
```

### 6. Run migrations if present
```bash
if [ -d "supabase/migrations" ]; then
  echo "Migrations found. Linking project and running migrations..."
  supabase link --project-ref $PROJECT_ID
  supabase db push
  echo "✓ Migrations applied"
elif [ -f "prisma/schema.prisma" ]; then
  echo "Prisma schema found. Running Prisma migrations..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
  echo "✓ Prisma migrations applied"
else
  echo "No migrations detected — skipping migration step"
fi
```

### 7. Save credentials to DEPLOYMENT_DOCS/DEPLOYED_ENV.md
```bash
mkdir -p DEPLOYMENT_DOCS
cat >> DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF

## Supabase
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL=$DATABASE_URL
EOF
chmod 600 DEPLOYMENT_DOCS/DEPLOYED_ENV.md 2>/dev/null || true
echo "✓ Credentials saved to DEPLOYMENT_DOCS/DEPLOYED_ENV.md (gitignored)"
```

### 8. Export for orchestrator
```
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
```
Pass these to deploy-render or deploy-railway as env vars.

## Free Tier Notes
⚠️ Supabase **pauses inactive projects after 7 days** on the free tier. Resume via dashboard or API.
⚠️ Free tier: 2 projects max, 500MB database storage.
⚠️ Consider deploy-neon instead if you only need a PostgreSQL database (Neon does NOT pause).

## On Failure
- Project creation fails: check org-id is correct, verify you haven't hit the 2-project limit
- Migrations fail: check the SQL for compatibility, run `supabase db diff` locally first
- Status command returns empty: wait 30-60 seconds for project provisioning to complete

## Logging

When this skill finishes (success or failure), append to `DEPLOYMENT_DOCS/DEPLOYMENT_LOG.md`:

```
## deploy-supabase — [current date and time]
**Status:** ✅ Live | ❌ Failed

**Project name:** [name used]
**Region:** [region chosen]
**Migrations run:** [supabase migrate / prisma migrate / none]
**Env vars captured:** SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL [or list which ones failed]
**Saved to:** DEPLOYMENT_DOCS/DEPLOYED_ENV.md (chmod 600)

**Warning:** Free tier pauses after 7 days inactivity.

**Error (if any):** [error message or "none"]
```
