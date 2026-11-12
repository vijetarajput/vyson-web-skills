# Agent-to-path mapping

VYSON does **not** assume that every AI coding agent reads `.agents/skills/`.

Each supported agent has one project-level folder. The copier in `tools/install-skills.mjs` and the install prompt in [../docs/install.md](../docs/install.md) write only to that folder. Codex and Antigravity both document `.agents/skills/`, so for those two the folder is shared. Paths were read from the agent's own documentation on **12 November 2026**.

| Agent | `--agent` | Project folder | Official docs | File placement | Catalog load |
|---|---|---|---|---|---|
| Cursor | `cursor` | `.cursor/skills/<name>/SKILL.md` | [cursor.com/docs/skills](https://cursor.com/docs/skills) | Verified (copy into this folder) | **Unverified.** Open a new Agent chat; restart Cursor if the skills are missing. |
| Claude Code | `claude-code` | `.claude/skills/<name>/SKILL.md` | [code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) | Verified (Skills CLI 1.7.6 also used this folder) | **Unverified.** |
| Codex | `codex` | `.agents/skills/<name>/SKILL.md` | [learn.chatgpt.com/docs/build-skills.md](https://learn.chatgpt.com/docs/build-skills.md) | Verified (Skills CLI 1.7.6 used this folder) | **Unverified.** Codex CLI was not found on the test PC. |
| Antigravity | `antigravity` (short name `agy`) | `.agents/skills/<name>/SKILL.md` (same folder as Codex) | [antigravity.google/docs/skills](https://antigravity.google/docs/skills) | **Documented only.** Nothing was tested in Antigravity. | **Unverified.** |

Personal (global) folders, used only with `--global --confirm-global`:

| Agent | Home folder |
|---|---|
| Cursor | `~/.cursor/skills/` |
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.agents/skills/` |
| Antigravity | `~/.gemini/config/skills/` |

## Installation is not discovery

- **Installation** means the files are on disk and match the source.
- **Discovery** means the agent listed the skill in its catalog in a real session.
- VYSON never reports discovery as verified just because the files exist. After a successful copy the report says **discovery: pending**.

## Cursor and `.agents/skills/`

Cursor's docs also list `.agents/skills/` as a project skill folder. The maintainer reported this in **one** real Next.js website session on 12 November 2026. It was not repeated, so treat it as an observation, not a proven rule:

1. Skills CLI 1.7.6 (`npx skills@1.7.6 add vijetarajput/vyson-web-skills --skill '*' --copy`) wrote all five skills to `.agents/skills/`.
2. The Cursor Agent catalog in that session did **not** list them.
3. Cursor's create-skill guide and docs name `.cursor/skills/<name>/SKILL.md` as the project skill path.

VYSON therefore installs Cursor skills to `.cursor/skills/` only. Extra copies already sitting in `.agents/skills/` are reported, not deleted, and not overwritten.

## Choosing the agent

Passing `--agent` is the reliable way. Without it, the installer guesses from environment variables. Only the Cursor signal (`CURSOR_AGENT`) has been seen in practice; the Claude Code and Codex signals are **untested**, and no signal is used for Antigravity (pass `--agent antigravity`). With the install prompt there is no guessing: the agent states which agent it is. If the signal is missing or ambiguous, the installer asks (in a terminal) or stops with exit code 2.

## Other agents

Other tools that follow the [Agent Skills](https://agentskills.io/specification) format may work. They are **untested**. Do not add them to this table without a documented path and a file-placement test.

Guides: [cursor.md](cursor.md), [claude-code.md](claude-code.md), [codex.md](codex.md), [antigravity.md](antigravity.md).
