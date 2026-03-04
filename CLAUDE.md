# deploy-skills

Claude Code skills marketplace plugin — deploys any project to free cloud infrastructure.

**Repo:** `AayushMS/deploy-skills`
**Install:** `/plugin marketplace add AayushMS/deploy-skills` → `/plugin install deploy-skills@deploy-skills`

## Critical

- `marketplace.json` must NOT have a `skills` array — skills are discovered via `plugin.json`'s `"skills": "./skills/"`
- Railway is NOT free ($5 trial) — never recommend it

## Docs

- `docs/gotchas.md` — read before making changes
- `docs/adding-a-skill.md` — how to add a new platform skill
