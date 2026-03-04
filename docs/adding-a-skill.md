# Adding a New Skill

## When to add a new skill

- New deployment platform (e.g. Fly.io, Railway v2, PlanetScale)
- New utility (e.g. `setup-domain`, `rollback-deployment`)
- New detection capability for `scan-project`

## Steps

### 1. Scaffold

```bash
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/skill-creator/scripts/init_skill.py <skill-name> --path skills/
```

Delete the example files you don't need (`scripts/example.py`, `references/api_reference.md`, `assets/example_asset.txt`).

### 2. Write SKILL.md

Required frontmatter:
```yaml
---
name: your-skill-name
description: [Detailed description of what it does + when Claude should invoke it. This is the auto-trigger text.]
---
```

Body: keep it under 500 lines. If it grows larger, split into `references/` files and link from SKILL.md.

### 3. Register in plugin.json

`plugin.json` uses `"skills": "./skills/"` for auto-discovery — nothing to add.

### 4. Wire into deploy-project (if it's a platform skill)

- Add it to the deploy order in `skills/deploy-project/SKILL.md` (Step 4)
- Add env var wiring if it exports variables consumed by other services
- Add the platform to the auth table in `skills/setup-auth/SKILL.md`
- Add it to `skills/scan-project/SKILL.md` detection rules
- Add it to `skills/verify-deployment/SKILL.md` if it has a URL to health-check

### 5. Validate

```bash
python3 ~/.claude/plugins/marketplaces/anthropic-agent-skills/skills/skill-creator/scripts/package_skill.py skills/<skill-name>/
```

Fix any validation errors. The `.skill` output file can be deleted — it's not used.

### 6. Update README.md skills table

Add a row to the Skills table in README.md.

### 7. Commit and push

```bash
git add skills/<skill-name>/ skills/deploy-project/SKILL.md skills/setup-auth/SKILL.md skills/scan-project/SKILL.md README.md
git commit -m "feat: add <skill-name> skill"
git push
```
