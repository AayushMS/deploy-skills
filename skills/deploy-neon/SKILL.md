---
name: deploy-neon
description: Use this skill when the user asks to "deploy to Neon", "set up Neon database", "create a Neon Postgres project", "set up serverless Postgres", or when invoked by deploy-project to provision a PostgreSQL database when only a database is needed (no auth/storage/realtime). Neon is preferred over Supabase when the project only needs PostgreSQL. Creates a Neon project, runs Prisma or SQL migrations if present, and exports DATABASE_URL. Free tier: 0.5GB storage, autoscaling, no inactivity pause.
---

# Deploy to Neon

Neon provides serverless PostgreSQL. Use instead of Supabase when the project only needs a database (no Supabase auth/storage/realtime features).

**Advantages over Supabase free tier:**
- Does NOT pause due to inactivity (Supabase pauses after 7 days)
- Serverless autoscaling — scales to zero when not in use
- Branching support for dev/staging environments

## Prerequisites
- neonctl CLI installed: `neon --version` (install: `npm install -g neonctl`)
- Logged in: `neon me` (run setup-auth if not)

## Deployment Workflow

### 1. Create Neon project
```bash
PROJECT_NAME=$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')

neon projects create \
  --name "$PROJECT_NAME" \
  --region-id aws-us-east-2

echo "✓ Project created: $PROJECT_NAME"
```

### 2. Get project ID and connection string
```bash
PROJECT_ID=$(neon projects list --output json | python3 -c "
import sys,json
projects = json.load(sys.stdin).get('projects', [])
proj = next((p for p in projects if p['name'] == '$PROJECT_NAME'), None)
if proj: print(proj['id'])
")

DATABASE_URL=$(neon connection-string \
  --project-id "$PROJECT_ID" \
  --role-name neondb_owner \
  --database-name neondb)

echo "DATABASE_URL=$DATABASE_URL"
```

### 3. Run migrations if present

**Prisma:**
```bash
if [ -f "prisma/schema.prisma" ]; then
  echo "Running Prisma migrations..."
  DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
  echo "✓ Prisma migrations applied"
fi
```

**Supabase-style SQL migrations:**
```bash
if [ -d "supabase/migrations" ]; then
  echo "Running SQL migrations..."
  for f in supabase/migrations/*.sql; do
    psql "$DATABASE_URL" -f "$f"
    echo "  Applied: $f"
  done
fi
```

**Custom SQL file:**
```bash
if [ -f "schema.sql" ]; then
  psql "$DATABASE_URL" -f schema.sql
  echo "✓ schema.sql applied"
fi
```

### 4. Verify connection
```bash
psql "$DATABASE_URL" -c "SELECT version();" 2>/dev/null && \
  echo "✓ Database connection verified" || \
  echo "⚠ Could not verify connection (psql may not be installed locally)"
```

### 5. Save and export
```bash
mkdir -p DEPLOYMENT_DOCS
cat >> DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF

## Neon
DATABASE_URL=$DATABASE_URL
NEON_PROJECT_ID=$PROJECT_ID
EOF
chmod 600 DEPLOYMENT_DOCS/DEPLOYED_ENV.md 2>/dev/null || true
echo "✓ Credentials saved to DEPLOYMENT_DOCS/DEPLOYED_ENV.md"
```

Export: `DATABASE_URL` — pass to backend service (Render/Railway) as env var.

## Free Tier Notes
- 0.5GB storage
- Autoscaling (scales to zero when idle, no cold start penalty for DB connections)
- No inactivity pause (unlike Supabase)
- Branching available for dev/staging

## On Failure
- Project creation fails: check you're logged in (`neon me`)
- Connection string empty: wait 10 seconds for provisioning, then retry
- Migration fails: run migrations locally first to verify SQL syntax
