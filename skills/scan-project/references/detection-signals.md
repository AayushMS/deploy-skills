# Service Detection Signals

## Frontend

| Framework   | Package dep      | Config file           | → Platform        |
|-------------|------------------|-----------------------|-------------------|
| Next.js     | `next`           | `next.config.*`       | Vercel            |
| SvelteKit   | `@sveltejs/kit`  | `svelte.config.*`     | Vercel / Netlify  |
| Nuxt        | `nuxt`           | `nuxt.config.*`       | Vercel / Netlify  |
| Astro       | `astro`          | `astro.config.*`      | Vercel / Netlify  |
| Vite/React  | `vite`           | `vite.config.*`       | Vercel / Netlify / CF Pages |
| CRA         | `react-scripts`  | —                     | Vercel / Netlify  |
| Static HTML | —                | `index.html` at root  | Cloudflare Pages  |

## Backend

| Framework  | Package dep              | Signal                        | → Platform |
|------------|--------------------------|-------------------------------|------------|
| Express    | `express`                | —                             | Render     |
| Fastify    | `fastify`                | —                             | Render     |
| Hono       | `hono`                   | —                             | Render / CF Workers |
| NestJS     | `@nestjs/core`           | `nest-cli.json`               | Render     |
| FastAPI    | `fastapi`                | `main.py` / `app/main.py`     | Render     |
| Django     | `django`                 | `manage.py`                   | Render     |
| Go         | —                        | `go.mod`                      | Render     |

## Database (detect ANY of these)

| DB type    | Package dep                        | OR env var in .env.example |
|------------|------------------------------------|-----------------------------|
| Postgres   | `pg`, `prisma`, `typeorm`, `drizzle` | `DATABASE_URL` containing `postgres` |
| MySQL      | `mysql2`, `mysql`                  | `DATABASE_URL` containing `mysql`    |
| MongoDB    | `mongoose`, `mongodb`              | `MONGODB_URI`                        |
| SQLite     | `better-sqlite3`, `sqlite3`        | —                                    |

**→ Postgres: Supabase (if auth/storage needed) else Neon**

## Redis / Queues (detect ANY of these)

| Signal               | Notes                        |
|----------------------|------------------------------|
| `ioredis`, `redis`   | Redis client dep             |
| `bullmq`, `bull`     | Queue dep (implies Redis)    |
| `REDIS_URL` in .env.example | Explicit env var      |

**→ Upstash**

## Monorepo signals

| Signal                | Type                  |
|-----------------------|-----------------------|
| `turbo.json`          | Turborepo             |
| `pnpm-workspace.yaml` | pnpm workspaces       |
| `packages/` or `apps/` dirs | npm/yarn workspaces |
| `lerna.json`          | Lerna                 |

**If monorepo: look inside each workspace for its own package.json / framework signals.**

## Workers / Jobs

| Signal                          | Notes                     |
|---------------------------------|---------------------------|
| Separate `worker.js` / `worker/` | Dedicated worker process |
| `node-cron`, `cron`             | Cron job                  |
| `agenda`, `node-schedule`       | Job scheduler             |

**→ Deploy as separate Render worker service (not web service)**

## WebSockets

| Signal              | Notes                                        |
|---------------------|----------------------------------------------|
| `socket.io`, `ws`   | Requires persistent server — must use Render |

**→ Cannot use serverless (Vercel functions, CF Workers). Force Render.**
