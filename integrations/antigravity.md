# Antigravity

Project path VYSON uses: **`.agents/skills/<skill-name>/SKILL.md`** (global: `~/.gemini/config/skills/`, only with `--global --confirm-global`)

Docs checked on 12 November 2026: [Antigravity skills](https://antigravity.google/docs/skills). They describe workspace skills in `.agents/skills/` (the older `.agent/skills/` is still read) and say the agent is shown the list of skills on every turn. One third-party write-up (atamel.dev, July 2026) reports that `.agents/skills/` was recognised in all three Antigravity products and that `~/.gemini/config/skills/` is the one global folder they all read. VYSON did not verify that.

**Antigravity has not been tested by VYSON at all.** Nothing below is a result. It is the documented path and nothing more.

## Install by prompt (no terminal)

Open the website project in Antigravity and paste the install prompt from [docs/install.md](../docs/install.md). It only works if Antigravity's agent can run terminal commands and reach the internet in your setup. If it cannot, it must say so, and you can use the manual fallback in [docs/install.md](../docs/install.md#manual-fallback-no-commands-at-all): download the ZIP and copy the skill folder into `.agents/skills/`.

## Developer install (from a clone)

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent antigravity
```

`agy` also works as a short name for the agent.

## After install

Start a new Antigravity session in the website folder and ask which VYSON skills it can see. Only treat a skill as loaded if it names it. Then paste the five prompts in order, each in a new session ([docs/five-prompts.md](../docs/five-prompts.md)).

## What is verified

- Nothing about Antigravity itself. The VYSON copier's file placement into `.agents/skills/` is tested (the same folder as Codex), but only as files on disk.

## What is not verified

- That `.agents/skills/` is read by your version of Antigravity.
- Antigravity running the install prompt, loading, or following any VYSON skill.
