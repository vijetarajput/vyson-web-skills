# integrations/

Short install guides, one per AI coding agent. The skills themselves are written once in [`skills/`](../skills/). Integrations only explain how to get them into each tool.

## Target agents for v0.1 (file placement tested; use by the agent not verified)

These three agents are the project's targets (decision 4 in `docs/decisions.md`). Being a target is not support, endorsement or a verified integration.

| Agent | Status |
|---|---|
| Cursor | Install file placement tested from a local folder and from GitHub (see below). Not yet confirmed that Cursor loads and uses the skill. |
| Claude Code | Install file placement tested from a local folder and from GitHub. The Claude Code program **is installed** on the test PC (see "What is installed on the test PC" below), but loading of the skill has **not been tested**. |
| Codex | Install file placement tested from a local folder and from GitHub. The Codex command-line program was **not found** on the test PC. A Codex data folder was found, but that proves nothing about skills (see "What is installed on the test PC" below). Discovery and use of the skill are **untested**. |

Other agents that support the open [Agent Skills](https://agentskills.io/specification) format should work, but are **untested** and we make no promise for them.

## Install methods

1. **Recommended:** the open `skills` installer (Node.js 22.20 or newer), with this explicit command pinned to the tested version, run inside your project folder:

    ```powershell
    npx skills@1.7.6 add vijetarajput/vyson-web-skills --skill vyson-css-motion -a cursor -a claude-code -a codex --copy -y
    ```

    Optional alternative, not pinned:

    ```powershell
    npx skills add vijetarajput/vyson-web-skills --skill vyson-css-motion -a cursor -a claude-code -a codex --copy -y
    ```

    The difference: `skills@1.7.6` always runs version 1.7.6, the only version tested. Without the version, `npx` runs the latest version at that moment. On 10 November 2026 that was also 1.7.6, but a later version may behave differently, and later versions are **untested**.

    Installing from the public GitHub repository was tested on 10 November 2026 (Skills CLI 1.7.6, Windows 10, project-level install). See "GitHub install test" below for the results and the limits. The pilot skill is early: its first benchmark was inconclusive (see the [pilot report](../bench/experiments/css-motion-pilot-001/README.md)). **Installing is not the same as an agent using the skill.** Whether Cursor, Claude Code or Codex loads and follows the installed skill is **untested**.

    The installer is a third-party tool. According to the installer's documentation, it sends anonymous usage data by default, and you can opt out by setting `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` (in PowerShell: `$env:DISABLE_TELEMETRY = "1"` or `$env:DO_NOT_TRACK = "1"`). We have not audited the installer or observed its network traffic. See the telemetry note in the [README](../README.md#installation) and the licence record in [THIRD_PARTY.md](../THIRD_PARTY.md#tools-we-recommend-running-not-copied).

    The repository has five skills; choose one with `--skill`: `vyson-css-motion`, `vyson-premium-website-design`, `vyson-3d-interactive-web`, `vyson-frontend-development` or `vyson-website-quality-engineering`. To install all five at once, use `--skill '*'` (keep the quotes in PowerShell):

    ```powershell
    npx skills@1.7.6 add vijetarajput/vyson-web-skills --skill '*' -a cursor -a claude-code -a codex --copy -y
    ```

    | Install | Tested? |
    |---|---|
    | `vyson-css-motion` from the **public GitHub repository** | **Tested** on 10 November 2026 (section "GitHub install test"). |
    | The other four skills, and `--skill '*'`, from a **local folder** | **Tested** on 11 November 2026 (section "Local install test of the four draft skills"). |
    | The other four skills, and `--skill '*'`, from the **public GitHub repository** | **Untested.** They are not published yet. Test it once after publishing. |
    | `skills update` for any VYSON skill | **Untested.** |
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

**Watch out:** the installer looks in `skills/` first. Only if it finds nothing there does it search the whole repository. While `skills/` was empty, `npx skills add` on this repository listed our template and the intentionally broken test fixtures (7 "skills"). Now that `skills/` holds real skills, it lists those and not the template or the fixtures. Run from a local copy of this repository on 11 November 2026 it listed all five skills (see "Local install test of the four draft skills"). The public GitHub repository listed only `vyson-css-motion` when it was tested on 10 November 2026, because the other four were not published yet; a GitHub listing of all five has **not** been tested.

## Local install test with the real skill (Day 3 findings)

Same setup as above: `skills` 1.7.6, Node.js, Windows 10, telemetry off, temporary project folders, installing from the local repository folder. The temporary folders were deleted afterwards.

| Question | Result |
|---|---|
| What does the installer find in this repository? | Exactly one skill, `vyson-css-motion` (this was the only skill in `skills/` on 10 November 2026; for the five-skill result see the 11 November section below). |
| Project install with `--copy` for Cursor, Claude Code and Codex | Worked. The 6 skill files (the skill has 7 files now, and this test was not repeated) were copied to `.agents/skills/vyson-css-motion/` (Cursor and Codex) and `.claude/skills/vyson-css-motion/` (Claude Code). No links were created. |
| Are the installed files identical to the source? | Yes. 6 of 6 files in both places have the same checksum as the source. |
| Does the installed copy pass our validator? | Yes (specification profile, strict mode). |
| Does the checker script work from the installed location? | Yes. `motion-lint.mjs` from the installed folder passed on the example site. |
| Default mode (no `--copy`) | Worked. Claude Code's folder became a Windows junction to `.agents/skills/`. Our validator initially did not follow that junction. This was fixed. |
| Global install (`-g`), run with a temporary fake home folder | Worked. Files went to `~/.agents/skills/` and `~/.claude/skills/`. Nothing was created in `~/.cursor/skills/` or `~/.codex/skills/`. |
| Was anything written to the real home folder? | No. Checked before and after. |

**Not tested:**

- Whether Cursor, Claude Code or Codex actually loads and follows the skill after install. Only the file placement was checked. (Claude Code is installed on the test PC but was not run against the skill. The Codex command-line program was not found, and Codex was not run at all.)
- Installing from GitHub was not part of this local test. It was tested separately (next section).
- macOS and Linux.

## Local install test of the four draft skills (11 November 2026)

Setup: the working copy of this repository (not yet published), `skills` **1.7.6** run offline from the package cache (`npx --offline`, so nothing was downloaded), Node.js 24, **Windows 10**, telemetry switched off (`DISABLE_TELEMETRY=1`, `DO_NOT_TRACK=1`), an empty temporary project folder, `--copy`, `-a cursor -a claude-code -a codex`, `-y`. The temporary folder was deleted afterwards.

| Question | Result |
|---|---|
| `npx --offline skills@1.7.6 add <path to this repository> --list` | **Passed.** Found 5 skills: `vyson-3d-interactive-web`, `vyson-css-motion`, `vyson-frontend-development`, `vyson-premium-website-design` and `vyson-website-quality-engineering`. Nothing was installed. |
| The recommended command with the repository path, once for each of the four draft skills | **Passed** for all four. Each installed on its own into `.agents/skills/<name>/` and `.claude/skills/<name>/`: 32 files in each folder in total (the count at that time; the skills have a few more files now, see the re-run note below). No links were created. |
| Are the installed files identical to the source? | **Yes.** 64 of 64 files (4 skills, 2 folders) had the same content as the source, ignoring line endings. |
| Does each installed copy pass our validator? | **Yes.** All four, in strict mode. |
| Do the installed checkers work from the installed location? | **Yes.** `design-lint.mjs`, `3d-lint.mjs`, `frontend-lint.mjs` and `site-audit.mjs` passed on their example sites. `browser-check.mjs` ran in headless Chrome on the repaired quality example (widths 390 and 1280) and passed. |

**Re-run after the framework and notice files were added (11 November 2026, later the same day), from the same local copy:** `--skill '*'` installed all five skills in one command; `skills list` listed them; `skills remove vyson-3d-interactive-web -y` removed one. For the four skills still installed after the removal (`vyson-css-motion`, `vyson-frontend-development`, `vyson-premium-website-design`, `vyson-website-quality-engineering`) every installed file matched its source (7, 11, 10 and 7 files), including the new `NOTICE.md` and the React and Vue helper files. `vyson-3d-interactive-web` was not compared in this re-run.

**What this shows:** the four draft skills are in the folder shape the installer expects, can be installed one at a time, and keep working after being copied on their own.

**What this does not show:** that installing from GitHub works for them (they are not published, so that is **untested**), or that any agent loads or follows them (**untested**). Everything listed under "Not tested" above still applies.

## GitHub install test (10 November 2026)

Setup: public repository `vijetarajput/vyson-web-skills` at commit `b01f875`, `skills` **1.7.6**, Node.js 24, **Windows 10**, project-level installs into empty temporary folders, telemetry switched off (`DISABLE_TELEMETRY=1`, `DO_NOT_TRACK=1`, so we did not observe what the installer sends when telemetry is on), and a temporary home folder so nothing could be written to the real one. The temporary folders were deleted afterwards. No sign-in was needed.

| Question | Result |
|---|---|
| `npx skills add vijetarajput/vyson-web-skills --list` | **Passed.** Found exactly one skill, `vyson-css-motion`. The template and the test fixtures in this repository are not found, because they are outside the folders the installer searches. Nothing was installed. |
| Default command without extra options (`npx skills add vijetarajput/vyson-web-skills`) | **Passed, but only in an agent terminal.** The test ran inside an agent terminal, where the installer reported "Agent detected — installing non-interactively", so it asked no questions. It made one copy in `.agents/skills/vyson-css-motion/` (7 files) and wrote `skills-lock.json`. It made **no** copy in `.claude/skills/`. How the default command behaves in a normal interactive terminal (questions, agent choice, copy or link mode) was **not tested**. |
| Explicit command with Cursor, Claude Code and Codex targets, `--copy` and `-y` (first run as `npx --yes skills@1.7.6 add ...`; later re-run exactly as written in the README, without `--yes` and with an empty npm cache, where `npx` printed a warning that it would install `skills@1.7.6` and carried on, because the shell was not interactive) | **Passed both times.** 7 files in `.agents/skills/vyson-css-motion/` (the folder the Skills CLI documents for Cursor and Codex) and 7 files in `.claude/skills/vyson-css-motion/` (the folder it documents for Claude Code). No links were created. |
| `skills list` after the default install | Showed `vyson-css-motion` with source `vijetarajput/vyson-web-skills`. |
| Does the installed copy pass our validator? | **Yes.** Specification profile: 5 Markdown files and 13 relative links checked, no errors. |
| Does the installed `motion-lint.mjs` work? | **Yes.** Run from the installed folder on the example result in `examples/vyson-css-motion/result/`: 5 files checked, 0 errors, 0 warnings. This is a static check only. |
| Why do the installed files have different line endings? | The installed files use Windows line endings (CRLF), while the repository stores them with LF. This came from Git's checkout settings on the Windows test PC (`core.autocrlf` was `true`, and the repository's `.gitattributes` has `* text=auto`), not from the installer or from us editing the files. After allowing for that, all 7 files had the same content as the published ones, and the validator and linter still passed. |
| Was anything written to the real home folder? | No. The tests used a temporary home folder, which stayed empty. The skill folders in the real home folder (`.agents`, `.claude/skills`, `.cursor/skills`, `.codex/skills`) were compared before and after and did not change. |

**What this shows:** the install command finds the skill on GitHub, copies its files to the folders that the Skills CLI documents for Cursor, Claude Code and Codex, and the copied files are intact and pass our own checks. We did not check that any of these agents reads those folders.

**What this does not show:** that any agent loads or follows the skill. That is **untested**. Only file placement and our own checks were run. No agent was started with the skill.

**Not tested against GitHub:**

- macOS and Linux.
- Global installation (`-g`).
- The default symlink mode (the explicit command above uses `--copy`).
- The installer's update, check and remove commands.
- Private repositories and access tokens.
- Any Skills CLI version other than 1.7.6, including the unpinned `npx skills ...` form. These results are specific to that version, and the installer is a separate third-party tool that may change.
- The installer's behaviour in a normal interactive terminal. All tests ran in a non-interactive agent terminal, so the question that `npx` itself can ask in a normal terminal before downloading a package (and any prompts from the installer) were not seen.

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
