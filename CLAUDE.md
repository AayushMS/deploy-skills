# deploy-skills

Claude Code and OpenCode skills marketplace plugin — deploys any project to free cloud infrastructure.

## Installation

**Claude Code:**
```
/plugin marketplace add AayushMS/deploy-skills
/plugin install deploy-skills@deploy-skills
```

**OpenCode (global):**
```bash
git clone https://github.com/AayushMS/deploy-skills.git ~/.config/opencode/plugins/deploy-skills
```

**OpenCode (project-scoped):**
```bash
cp -r .opencode /your/project/
```

## Critical

- `marketplace.json` must NOT have a `skills` array — skills are discovered via `plugin.json`'s `"skills": "./skills/"`
- Railway is NOT free ($5 trial) — never recommend it

## Docs

- `docs/gotchas.md` — read before making changes
- `docs/adding-a-skill.md` — how to add a new platform skill
