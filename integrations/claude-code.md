# Claude Code

Project path VYSON uses: **`.claude/skills/<skill-name>/SKILL.md`**

Docs checked on 12 November 2026: [Claude Code skills](https://code.claude.com/docs/en/skills).

## Install

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent claude-code
```

## After install

Start a new Claude Code session in the website folder. Claude Code's own docs say it watches `.claude/skills/` for changes, but that if the folder did not exist when the session started you should run `/reload-skills` (**VYSON has not verified either**). Ask it to list its skills. Only treat a VYSON skill as loaded if it names it.

## What is verified

- Official project path `.claude/skills/`.
- Skills CLI 1.7.6 file placement into that folder (earlier test, telemetry off).
- VYSON copier file placement into that folder (automated tests).

## What is not verified

- Claude Code loading or following any VYSON skill.
- Claude Code picking up new files without a new session.

The Claude Code program was present on the original test PC but was never run against a VYSON skill.
