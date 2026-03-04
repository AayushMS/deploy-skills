# Platform Quick Reference

## Free Tier Limits

| Platform   | Free tier                              | Gotcha                                      |
|------------|----------------------------------------|---------------------------------------------|
| Vercel     | 100GB bandwidth, 100k invocations/mo   | None                                        |
| Netlify    | 100GB bandwidth, 125k functions/mo     | None                                        |
| Cloudflare | Pages: unlimited; Workers: 10M req/mo  | None                                        |
| Render     | 750 hrs/mo (web services)              | Spins down after 15 min; cold start ~30s    |
| Supabase   | 2 projects, 500MB DB                   | Pauses after 7 days inactivity              |
| Neon       | 0.5GB storage                          | No pause (advantage over Supabase)          |
| Upstash    | 10k commands/day                       | REST only — no persistent TCP connection    |
| Railway    | $5 trial credit                        | NOT free — avoid recommending               |

## Env Var Wiring (what each platform exports → who needs it)

| Exported by   | Variable names                                                        | Inject into          |
|---------------|-----------------------------------------------------------------------|----------------------|
| Supabase      | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL | backend, frontend |
| Neon          | DATABASE_URL                                                          | backend              |
| Upstash       | REDIS_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN           | backend              |
| Render        | BACKEND_URL (captured from deployed service URL)                      | frontend             |
| Railway       | BACKEND_URL                                                           | frontend             |

## Frontend env var names by framework

| Framework | Backend URL var          | Supabase URL var              |
|-----------|--------------------------|-------------------------------|
| Next.js   | NEXT_PUBLIC_API_URL      | NEXT_PUBLIC_SUPABASE_URL      |
| Vite/React| VITE_API_URL             | VITE_SUPABASE_URL             |
| CRA       | REACT_APP_API_URL        | REACT_APP_SUPABASE_URL        |
| SvelteKit | PUBLIC_API_URL           | PUBLIC_SUPABASE_URL           |
| Nuxt      | NUXT_PUBLIC_API_URL      | NUXT_PUBLIC_SUPABASE_URL      |

## Deployment order

Database → Redis/Queues → Backend → Frontend → CI/CD → Verify

Always deploy in this order. Backend needs DB/Redis URLs before it starts.
Frontend needs BACKEND_URL before it builds.
