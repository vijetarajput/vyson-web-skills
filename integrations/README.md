# integrations/

Short install guides, one per AI coding agent. The skills themselves are written once in [`skills/`](../skills/). Integrations only explain how to get them into each tool.

## Officially tested agents for v0.1 (planned)

| Agent | Status |
|---|---|
| Cursor | Not yet tested |
| Claude Code | Not yet tested |
| Codex | Not yet tested |

Other agents that support the open [Agent Skills](https://agentskills.io/specification) format should work, but are **untested** and we make no promise for them.

## Install methods

1. **Recommended:** the open `skills` installer, `npx skills add vijetarajput/vyson-web-skills` (Node.js 22.20 or newer). Local-folder installs were tested on Windows (see below). Installing from GitHub is **not yet tested** because nothing has been pushed.
2. **Manual copy:** copy a folder from `skills/` into the agent's skills folder. Each guide will give exact PowerShell commands.

Avoid symlinks: on Windows they often need special permissions.

## Local install test (Day 2 findings)

Tested with `skills` 1.7.6, Node.js 22, Windows 10, using a throwaway probe skill in a temporary folder (not a real VYSON skill). Telemetry was switched off with `DISABLE_TELEMETRY=1`.

| Question | Result |
|---|---|
| Can `npx skills add` install from a local folder, with no GitHub? | **Yes.** Pass a folder path instead of `owner/repo`. `--list` shows what it finds without installing. |
| Where did files go with `-a cursor -a claude-code -a codex`? | `.agents/skills/<name>/` (shared by Cursor and Codex) and `.claude/skills/<name>/` (Claude Code), inside the project folder. |
| Copy mode (`--copy`) | Worked. Real copies, plus a `skills-lock.json` file in the project. |
| Default mode | Worked on this machine: Claude Code's folder became a Windows junction (a folder shortcut) to the shared one. This may behave differently on other Windows setups, so the guides will recommend `--copy`. |
| Was the installed skill still valid? | Yes. `node tools/validate-skills.mjs <folder> --profile spec` passed on the installed copy. |
| Was anything written to the home folder? | No. Nothing was created in `~/.agents`, `~/.claude/skills` or `~/.cursor/skills`. |

**Watch out:** the installer looks in `skills/` first. Only if it finds nothing there does it search the whole repository. While `skills/` is empty, `npx skills add` on this repository would list our template and the intentionally broken test fixtures (7 "skills"). Once `skills/` holds at least one real skill, only the real skills are listed (tested). So do not announce the install command before the first skill exists.

Planned layout (guides are written on Day 7 of the [roadmap](../ROADMAP.md), after real testing):

```text
integrations/
├── cursor/
├── claude-code/
├── codex/
└── generic/
```
