# integrations/

Short install guides, one per AI coding agent. The skills themselves are written once in [`skills/`](../skills/). Integrations only explain how to get them into each tool.

## Officially tested agents for v0.1 (planned)

| Agent | Status |
|---|---|
| Cursor | Install file placement tested locally (see below). Not yet confirmed that Cursor loads and uses the skill. |
| Claude Code | Install file placement tested locally. The Claude Code program **is installed** on the test PC (see "What is installed on the test PC" below), but loading of the skill has **not been tested**. |
| Codex | Install file placement tested locally. The Codex command-line program was **not found** on the test PC. A Codex data folder was found, but that proves nothing about skills (see "What is installed on the test PC" below). Discovery and use of the skill are **untested**. |

Other agents that support the open [Agent Skills](https://agentskills.io/specification) format should work, but are **untested** and we make no promise for them.

## Install methods

1. **Recommended:** the open `skills` installer, `npx skills add vijetarajput/vyson-web-skills` (Node.js 22.20 or newer). Local-folder installs were tested on Windows (see below). Installing from GitHub is **not yet tested**. The repository on GitHub contains the Day 1 project foundation, the Day 2 validator and one pilot skill, `vyson-css-motion` (Day 3). The pilot skill is early: its first benchmark was inconclusive (see the [pilot report](../bench/experiments/css-motion-pilot-001/README.md)). Nobody has yet run `npx skills add vijetarajput/vyson-web-skills` against GitHub, so treat that command as untried. Update this line after it has been tried.
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

**Watch out:** the installer looks in `skills/` first. Only if it finds nothing there does it search the whole repository. While `skills/` was empty, `npx skills add` on this repository listed our template and the intentionally broken test fixtures (7 "skills"). Now that `skills/` holds a real skill, it lists only `vyson-css-motion` (tested, see below).

## Local install test with the real skill (Day 3 findings)

Same setup as above: `skills` 1.7.6, Node.js, Windows 10, telemetry off, temporary project folders, installing from the local repository folder. The temporary folders were deleted afterwards.

| Question | Result |
|---|---|
| What does the installer find in this repository? | Exactly one skill: `vyson-css-motion`. |
| Project install with `--copy` for Cursor, Claude Code and Codex | Worked. The 6 skill files (the skill has 7 files now, and this test was not repeated) were copied to `.agents/skills/vyson-css-motion/` (Cursor and Codex) and `.claude/skills/vyson-css-motion/` (Claude Code). No links were created. |
| Are the installed files identical to the source? | Yes. 6 of 6 files in both places have the same checksum as the source. |
| Does the installed copy pass our validator? | Yes (specification profile, strict mode). |
| Does the checker script work from the installed location? | Yes. `motion-lint.mjs` from the installed folder passed on the example site. |
| Default mode (no `--copy`) | Worked. Claude Code's folder became a Windows junction to `.agents/skills/`. Our validator initially did not follow that junction. This was fixed. |
| Global install (`-g`), run with a temporary fake home folder | Worked. Files went to `~/.agents/skills/` and `~/.claude/skills/`. Nothing was created in `~/.cursor/skills/` or `~/.codex/skills/`. |
| Was anything written to the real home folder? | No. Checked before and after. |

**Not tested:**

- Whether Cursor, Claude Code or Codex actually loads and follows the skill after install. Only the file placement was checked. (Claude Code is installed on the test PC but was not run against the skill. The Codex command-line program was not found, and Codex was not run at all.)
- Installing from GitHub. The skill is part of the GitHub repository, but the install command has only been run against a local folder, never against GitHub.
- macOS and Linux.

## What is installed on the test PC

Checked on 2026-11-10 (Windows 10, PowerShell). **Installed** and **available on the PATH** are different things, so they are listed separately.

| Program | Installed? | On the PATH? | How it was checked |
|---|---|---|---|
| Claude Code | **Yes.** The file is `%USERPROFILE%\.local\bin\claude.exe` (the folder `.local\bin` inside the user's home folder). Running it by its full path printed `2.1.322 (Claude Code)`. | **No.** Typing `claude` in a normal PowerShell window does not find it, and `.local\bin` is not in the PATH list. | `Test-Path`, running the file with `--version`, `Get-Command claude`, `where.exe claude` |
| Codex command-line program | **Not found.** | No. | `Get-Command codex`, `where.exe codex`, and a look inside `.local\bin` |
| Codex desktop application data | A folder `%USERPROFILE%\.codex` **exists**. Its contents look like the data of a Codex desktop application (settings, session records, plugins, and a few built-in skills that are not VYSON skills). | Not checked. | Listing the folder (names only). Nothing was run and no file contents were read, apart from section names in its settings file. |
| `skills` installer (`npx skills`) | Not installed globally. `npx` downloads it on first use, and the local install tests above used that. | Not applicable. | `npx --no-install skills --version` reported the package is missing |

Notes:

- Because Claude Code is not on the PATH, scripts and guides must either call it by its full path or tell the reader to add the folder to the PATH. This project does **not** change anyone's PATH by itself.
- Only `--version` was run. The skill has **not** been loaded by Claude Code, and no Claude account or usage was involved.
- An earlier version of this file said Claude Code was not installed. That was wrong: the earlier check only looked for the command on the PATH. It was corrected on 2026-11-10 after looking for the file itself. Whether the file was already there when the Day 2 and Day 3 install tests ran is **unknown**.
- The Codex data folder does **not** prove that the Codex command-line program is installed, that Codex can be started from a terminal, or that Codex finds and uses VYSON skills. It only shows that some Codex software has been used on this PC at some point. Codex remains **untested** for this project.
- Other computers will differ. Only this one PC was checked.

Planned layout (guides are written on Day 7 of the [roadmap](../ROADMAP.md), after real testing):

```text
integrations/
├── cursor/
├── claude-code/
├── codex/
└── generic/
```
