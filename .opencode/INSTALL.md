# Deploy Skills for OpenCode

One-shot deployment of any project to free cloud infrastructure.

## Installation

### Global (all projects)

```bash
git clone https://github.com/AayushMS/deploy-skills.git ~/.config/opencode/plugins/deploy-skills
```

### Project-scoped (specific project only)

Copy the `.opencode` folder from this repository to your project root:

```bash
cp -r /path/to/deploy-skills/.opencode /your/project/
```

Restart OpenCode to load the plugin.

## Usage

After installation, the plugin will automatically inject deployment skills into your OpenCode session.

Use the `skill` tool to load deployment skills:

```bash
skill deploy-project
```

## Available Skills

- **deploy-project** - Main orchestrator for full project deployment
- **scan-project** - Detect project structure and recommend platforms
- **setup-auth** - Authenticate required tools (CLI, APIs)
- **deploy-vercel** - Deploy to Vercel
- **deploy-netlify** - Deploy to Netlify
- **deploy-cloudflare** - Deploy to Cloudflare Pages
- **deploy-render** - Deploy to Render
- **deploy-supabase** - Deploy Supabase database
- **deploy-neon** - Deploy Neon database
- **deploy-upstash** - Deploy Upstash (Redis/Kafka)
- **setup-cicd** - Set up GitHub Actions CI/CD
- **verify-deployment** - Verify deployment is live
- **deploy-log** - View deployment logs
