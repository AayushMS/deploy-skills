---
name: setup-auth
description: Use this skill when the user asks to "set up auth for deployment", "log in to deployment tools", "authenticate deployment tools", "check if I'm logged into Vercel/Railway/Supabase/etc", "set up credentials for deploying", or when invoked by the deploy-project orchestrator after scan-project to authenticate all required deployment platforms before deploying. Reads DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md to determine which tools are needed, then verifies and guides login for only those tools.
---

# setup-auth

Verify and guide authentication for every deployment platform required by this project. Never attempt deployment. Only verify auth and guide the user through login.

## Step 1: Read DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md

Read `DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md` from the current working directory.

- Find the "Required Accounts" section.
- Extract the list of platforms mentioned there. These are the ONLY platforms you will check. Do not check any platform not listed.

If the file does not exist, stop and tell the user:

```
DEPLOYMENT_DOCS/DEPLOYMENT_PLAN.md not found.
Run scan-project first, or tell me which platforms you're deploying to (e.g., Vercel, Render, Supabase).
```

Do not proceed until the file is read and the required platforms are identified.

## Step 2: Authenticate Each Required Platform

Work through each required platform ONE AT A TIME. Do not move to the next platform until the current one is fully verified. Do not skip any platform.

For each platform, the flow is:
1. Run the check command.
2. If not authenticated, tell the user exactly what to run in their terminal, then wait for confirmation.
3. Run the verify command.
4. If verification fails, stop, explain the error clearly, and tell the user how to fix it. Do not proceed to the next platform.
5. If the user says "skip" or "I'll do it later", explain that deployment cannot proceed without authentication for all required tools and ask them to complete the login.

---

### GitHub

GitHub is always required — it is needed for repo setup and CI/CD regardless of which other platforms are in the plan.

**Check:**
```bash
gh auth status
```

**If not authenticated:**

Tell the user:
```
GitHub CLI is not authenticated. Please run this in your terminal:

  gh auth login

When prompted:
  - Select: GitHub.com
  - Select: HTTPS
  - Select: Login with a web browser

Then come back here and confirm.
```

Wait for the user to say they have completed the login before continuing.

**Verify:**
```bash
gh auth status
```

The output must show "Logged in to github.com". If it does not, stop and explain what the error output means and how to resolve it.

---

### Vercel

Check only if "Vercel" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

**Check:**
```bash
vercel whoami 2>/dev/null
```

**If the command fails or prints an error:**

Tell the user:
```
Vercel CLI is not authenticated. Please run this in your terminal:

  vercel login

Follow the prompts to log in via browser. Then come back here and confirm.
```

Wait for confirmation.

**Verify:**
```bash
vercel whoami
```

The output must print a username (not an error message). If it fails, stop and explain the error.

---

### Netlify

Check only if "Netlify" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

**Check:**
```bash
netlify status 2>/dev/null
```

**If the output does not show a logged-in user:**

Tell the user:
```
Netlify CLI is not authenticated. Please run this in a separate terminal:

  netlify login

A browser window will open. Complete the login there, then come back here and confirm.
```

Wait for confirmation.

**Verify:**
```bash
netlify status | grep "Logged In"
```

This must succeed (exit 0 and produce output). If it fails, stop and explain the error.

---

### Cloudflare

Check only if "Cloudflare" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

**Check:**
```bash
wrangler whoami 2>/dev/null
```

**If not logged in:**

Tell the user:
```
Wrangler (Cloudflare CLI) is not authenticated. Please run this in a separate terminal:

  wrangler login

A browser window will open. Complete the login there, then come back here and confirm.
```

Wait for confirmation.

**Verify:**
```bash
wrangler whoami
```

The output must show an account name. If it fails, stop and explain the error.

---

### Supabase

Check only if "Supabase" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

**Check:**
```bash
supabase projects list 2>/dev/null
```

**If the command errors (not just an empty list — an empty list is fine):**

Tell the user:
```
Supabase CLI is not authenticated. Please run this in a separate terminal:

  supabase login

A browser window will open. Complete the login there, then come back here and confirm.
```

Wait for confirmation.

**Verify:**
```bash
supabase projects list
```

The command must not error. An empty list is acceptable — it means you are logged in but have no projects yet. If it errors, stop and explain.

---

### Neon

Check only if "Neon" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

**Check:**
```bash
neon me 2>/dev/null
```

**If the command fails:**

Tell the user:
```
Neon CLI is not authenticated. Please run this in a separate terminal:

  neon auth

A browser window will open. Complete the login there, then come back here and confirm.
```

Wait for confirmation.

**Verify:**
```bash
neon me
```

The output must show an email address. If it fails, stop and explain the error.

---

### Render

Check only if "Render" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

Render uses an API key, not a CLI login flow.

**Check:**
```bash
echo $RENDER_API_KEY
```

Also check for a stored key:
```bash
cat ~/.render/config.yaml 2>/dev/null
```

**If no key is found:**

Tell the user:
```
Render uses an API key instead of a CLI login.

To get your API key:
  1. Go to: https://dashboard.render.com/u/settings → API Keys → Create API Key
  2. Copy the key

Please paste your Render API key here:
```

Wait for the user to paste the key. Then:

Store the key:
```bash
mkdir -p ~/.render
cat > ~/.render/config.yaml << EOF
apiKey: <pasted_key>
EOF
```

Set the key in the current session:
```bash
export RENDER_API_KEY="<pasted_key>"
```

**Verify:**
```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners
```

Parse the JSON response:
- If it returns a valid JSON array or object with owner data, extract and display the owner/workspace name.
- If it returns an HTTP error or `{"id":"...","message":"..."}` style error, tell the user:

```
The Render API key appears to be invalid or expired.
Please verify you copied the full key from: https://dashboard.render.com/u/settings → API Keys
Then paste the correct key so I can retry.
```

Do not proceed until verification succeeds.

---

### Upstash

Check only if "Upstash" appears in the Required Accounts section of DEPLOYMENT_PLAN.md.

Upstash uses an API key and email for CLI access, not a browser login flow.

**Check:**
```bash
echo "Email: $UPSTASH_EMAIL  Key: $UPSTASH_API_KEY"
```

Also check for a stored config:
```bash
cat ~/.upstash/config 2>/dev/null
```

**If either `UPSTASH_EMAIL` or `UPSTASH_API_KEY` is not set:**

Tell the user:
```
Upstash uses an API key for CLI access.

To get your credentials:
  1. Go to: https://console.upstash.com/account/api
  2. Copy your Email address and API Key

Please enter your Upstash email address:
```

Wait for the email, then ask:
```
Now please enter your Upstash API key:
```

After receiving both, store them:
```bash
export UPSTASH_EMAIL="<entered_email>"
export UPSTASH_API_KEY="<entered_key>"

mkdir -p ~/.upstash
cat > ~/.upstash/config << EOF
email=<entered_email>
api_key=<entered_key>
EOF
```

**Verify:**
```bash
curl -s -u "$UPSTASH_EMAIL:$UPSTASH_API_KEY" https://api.upstash.com/v2/redis/databases
```

The response must be valid JSON (even an empty array `[]` is fine — it means you are authenticated but have no databases yet). If the response is an error or not valid JSON, tell the user:

```
The Upstash credentials appear to be invalid.
Please verify your email and API key at: https://console.upstash.com/account/api
Then provide the correct credentials so I can retry.
```

Do not proceed until verification succeeds.

---

## Step 3: Print Final Auth Status Table

After ALL required platforms are verified, print this table. Include only the platforms that were in the plan. Fill in the actual usernames and account names from the verification step outputs.

```
=== Authentication Status ===
✓ GitHub       → logged in as @<username>
✓ Vercel       → logged in as <username>
✓ Netlify      → logged in as <username>
✓ Cloudflare   → logged in (<account_name>)
✓ Supabase     → logged in (<email>)
✓ Neon         → logged in (<email>)
✓ Render       → API key verified (workspace: <name>)
✓ Upstash      → API key verified (<email>)
=============================
All required tools authenticated. Ready to deploy.
```

## Critical Rules

- NEVER proceed to the next platform until the current one is fully verified.
- NEVER proceed to deployment — this skill's sole purpose is auth verification and guided login.
- If any verification fails after the user claims to have logged in: explain exactly what the error output means and provide concrete steps to resolve it.
- If the user says "skip" or "I'll do it later": tell them that deployment cannot proceed without authentication for all required tools, and ask them to complete the login before you continue.
- Only check platforms listed in the DEPLOYMENT_PLAN.md Required Accounts section. Do not check any other platform.
- Never silently skip a failed verification. Always stop and explain.
