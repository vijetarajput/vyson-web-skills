# Cursor

Project path VYSON uses: **`.cursor/skills/<skill-name>/SKILL.md`**

Docs checked on 12 November 2026: [Cursor Agent Skills](https://cursor.com/docs/skills). Cursor also documents `.agents/skills/`. In one real project session (not repeated), files in `.agents/skills/` were **not** listed in the Agent catalog, so VYSON installs Cursor skills to `.cursor/skills/`. Cursor's docs also read `.claude/skills/` and `.codex/skills/` for compatibility, so installing the same skills for Claude Code and Cursor in one project may show duplicates (untested).

## Install by prompt (no terminal)

Open the website project in Cursor, switch to **Agent** mode, and paste the install prompt from [docs/install.md](../docs/install.md). The agent downloads the skill with its own terminal tool, checks every file, installs into `.cursor/skills/`, and starts the work in the same chat. Cursor may ask you to approve the commands. That prompt has **not** been run in Cursor against the published repository yet. Cursor reads its skill list when it starts, so the prompt tells the agent to open the installed `SKILL.md` directly instead of waiting for the catalog.

## Developer install (from a clone)

From a clone of this repository:

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent cursor
```

One skill only:

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent cursor --skill vyson-premium-website-design
```

That creates `.cursor/skills/` if it is missing, copies the skill folders, and refuses to overwrite a copy that does not match the source.

## After install

1. Open a **new** Cursor Agent chat in the website project. If the skills are missing, restart Cursor (its docs say it discovers skills when it starts) and look under Customize > Skills.
2. Ask: "Which VYSON skills appear in your skill catalog?"
3. Only treat a skill as loaded if the agent names it. Then paste the five prompts in order, each in a new Agent chat ([docs/five-prompts.md](../docs/five-prompts.md), or each skill's `references/prompt.md`). The prompts have not been run end to end with Cursor.
4. If none appear, see recovery in [agents.md](agents.md) and the installer's printed report.

## What is verified

- Official project path `.cursor/skills/`.
- File copy into that folder (hashes match the source).

## What is not verified

- Cursor listing the skills in its catalog after a fresh session (pending).
- Cursor following a VYSON skill and producing a better website.

## Optional: Skills CLI 1.7.6

`npx skills@1.7.6 add ... -a cursor` writes to **`.agents/skills/`**, which is the folder that CLI documents for Cursor. That is **not** the folder VYSON uses for Cursor. Prefer the VYSON copier for Cursor.
