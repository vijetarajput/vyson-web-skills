# Codex

Project path VYSON uses: **`.agents/skills/<skill-name>/SKILL.md`**

Docs checked on 12 November 2026: [Where Codex loads local skills](https://learn.chatgpt.com/docs/build-skills.md). OpenAI documents repository skills under `.agents/skills/`. That page does not list `.codex/skills/`, and VYSON does not install there.

## Install by prompt (no terminal)

Open the website project in Codex and paste the install prompt from [docs/install.md](../docs/install.md). Two things from OpenAI's documentation (read on 12 November 2026, not tested by VYSON) can stop it:

- Codex's default `workspace-write` sandbox has **network access off**, so the download fails until you allow network access for the session (the setting is `sandbox_workspace_write.network_access = true` in Codex's configuration, or approve it when asked).
- Some Codex environments keep `.agents/` read-only, so the write into `.agents/skills/` may need your approval.

If either blocks the install, the agent must say so; use the manual fallback in [docs/install.md](../docs/install.md#manual-fallback-no-commands-at-all). The prompt has **not** been run in Codex.

## Developer install (from a clone)

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent codex
```

## After install

Start a new Codex session in the website folder (Codex's docs say it detects skill changes automatically; restart it if the skills are not shown) and ask it to list skills. Only treat a VYSON skill as loaded if it names it. Then paste the five prompts in order, each in a new session ([docs/five-prompts.md](../docs/five-prompts.md), or each skill's `references/prompt.md`). The prompts have not been run end to end with Codex.

## What is verified

- Official repository path `.agents/skills/` (from OpenAI's skills documentation).
- Skills CLI 1.7.6 file placement into `.agents/skills/` (earlier test, telemetry off).
- VYSON copier file placement into that folder (automated tests).

## What is not verified

- Codex CLI running on the original test PC (the `codex` command was not found).
- Codex loading or following any VYSON skill.

A `.codex` data folder on a computer does not prove that Codex finds project skills.
