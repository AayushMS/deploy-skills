---
name: deploy-upstash
description: Use this skill when the user asks to "deploy to Upstash", "set up Redis", "set up queues with Upstash", "create an Upstash Redis database", "set up BullMQ", or when invoked by deploy-project when Redis/queues are detected in the project (bullmq, ioredis, REDIS_URL in .env.example). Creates an Upstash Redis database via REST API using UPSTASH_EMAIL and UPSTASH_API_KEY from setup-auth, and exports REDIS_URL, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN. Free tier: 10,000 commands/day, 256MB max database size.
---

# Deploy to Upstash

Upstash provides serverless Redis. Use for: BullMQ/bull job queues, caching, rate limiting, pub/sub, session storage.

## Prerequisites
- `UPSTASH_EMAIL` and `UPSTASH_API_KEY` must be set (run setup-auth if not)
- Verify: `echo $UPSTASH_EMAIL` and `echo $UPSTASH_API_KEY` both show values

## Deployment Workflow

### 1. Create Redis database
```bash
DB_NAME=$(basename $(pwd) | tr '[:upper:]' '[:lower:]' | tr '_' '-')-redis

RESPONSE=$(curl -s -X POST https://api.upstash.com/v2/redis/database \
  -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$DB_NAME\",
    \"region\": \"us-east-1\",
    \"tls\": true
  }")

echo "Response: $RESPONSE"
```

### 2. Extract connection details
```bash
REDIS_ENDPOINT=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('endpoint',''))")
REDIS_PORT=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('port','6380'))")
REDIS_PASSWORD=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('password',''))")
UPSTASH_REDIS_REST_URL=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print('https://'+d.get('endpoint',''))")
UPSTASH_REDIS_REST_TOKEN=$(echo $RESPONSE | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('rest_token',''))")

REDIS_URL="rediss://:${REDIS_PASSWORD}@${REDIS_ENDPOINT}:${REDIS_PORT}"

echo "REDIS_URL=$REDIS_URL"
echo "UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL"
```

### 3. Verify connection
```bash
TEST=$(curl -s -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping")
echo "Redis ping: $TEST"
# Should return: {"result":"PONG"}
```

### 4. Save and export
```bash
mkdir -p DEPLOYMENT_DOCS
cat >> DEPLOYMENT_DOCS/DEPLOYED_ENV.md << EOF

## Upstash Redis
REDIS_URL=$REDIS_URL
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN
EOF
chmod 600 DEPLOYMENT_DOCS/DEPLOYED_ENV.md 2>/dev/null || true
echo "✓ Redis credentials saved"
```

Export: `REDIS_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — pass to backend as env vars.

## Free Tier Notes
⚠️ Free tier: **10,000 commands/day**, 256MB max database size.
- Suitable for: development, low-traffic apps, queues with moderate volume
- Not suitable for: high-frequency caching (use Upstash paid or self-hosted Redis)
- For BullMQ: each job enqueue + process = ~2-5 Redis commands

## On Failure
- API returns 401: verify UPSTASH_EMAIL and UPSTASH_API_KEY are correct
- REST_TOKEN empty: the database may still be provisioning — wait 5 seconds and check the dashboard
- REDIS_URL connection refused: verify TLS is enabled (the URL must start with `rediss://`)
