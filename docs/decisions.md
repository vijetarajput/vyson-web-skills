# Project Decisions

This file records decisions the maintainer has approved. Change a decision only by discussing it first and updating this file.

## Approved on 2026-11-10

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 1 | Positioning | **Premium sites that are fast, accessible and provable**: built-in quality checks plus published, reproducible benchmarks | Design-taste skill packs already exist at large scale. Evidence and safe motion and 3D are the gaps we found. |
| 2 | Scope of v0.1 | **5 skills (one per pillar), one audit script, and a small benchmark** | Five tested skills are more valuable than fifteen untested ones. |
| 3 | Installation | **Use the existing `npx skills` installer, plus manual-copy guides** | Avoids building and securing our own CLI. Works across many agents. |
| 4 | Officially tested agents | **Cursor, Claude Code, Codex** | Test fewer agents properly rather than claim many. Others "should work" through the open standard but are untested. |
| 5 | Next step | **Day 1 foundation, then pause for review** | Keeps the beginner-friendly, approve-each-step process. |

## Approved on 2026-11-10 (after reviewing the `vyson-css-motion` pilot experiment)

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 6 | Accordion and FAQ rule | **Only one panel may stay expanded.** Opening a panel closes the one that was open. It must work with the keyboard. | The old wording "one panel at a time" was unclear, and the pilot's agents read it in different ways. |
| 7 | Tap-target criterion | **Aim for 44 by 44 CSS pixels on touch screens; never under 24 by 24** (WCAG 2.2 level AA, success criterion 2.5.8, with its exceptions such as links inside a sentence). | The pilot's with-skill output had 7 of 13 controls under 44px on a phone. |
| 8 | Static checks versus browser tests | **Reported in two separate lists**, and every checker run says it is a static check. | Passing a text checker had been easy to mistake for a real test. |
| 9 | Status of the pilot result | **Exploratory only: 1 run per condition, known confounds. It must never be quoted as proof that a skill works.** The original findings are kept as they were. | Honest evidence rules (decision 1 and `AGENTS.md` rule 4). |
| 10 | Personal data in public files | **No personal paths, user names or machine details** in files meant for release. The original, unscrubbed experiment records are kept privately outside the repository. | Privacy and safe publishing. |
| 11 | Next experiment | **A controlled three-repeat Cursor experiment in two separate clean workspaces, with skill discovery verified independently, is planned but must not start until the maintainer approves it.** | See `bench/experiments/css-motion-repeat-plan.md`. |

## Approved on 2026-11-11 (maintainer instruction)

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 12 | Reuse and adoption | **Reuse first, licence checked.** Adapt open-source skills, components and workflows only when a licence file permits it, keep the notice, and record it in `THIRD_PARTY.md`. Original VYSON work stays under this repository's MIT licence and stays distinguishable from adapted material, which keeps its own copyright notice and licence text (Apache-2.0 also needs a note of changes and any NOTICE file). Material with no licence file or an unclear licence is never copied; write it independently. No partnership, endorsement or verified integration is implied without evidence. Do not duplicate skills that already exist; point to them. Build for daily usefulness and easy adoption (React, Next.js, Vue and plain HTML/CSS/JS where relevant, no forced dependencies), and never exaggerate compatibility, performance, quality or adoption. | The maintainer asked for maximum genuine adoption and reuse. This replaces the earlier "originality only" rule in `AGENTS.md` and `CONTRIBUTING.md`. The contribution legal model below is now "MIT plus a licence statement in the pull request template". |

## Approved on 2026-11-12 (maintainer instruction after a real Cursor install)

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 13 | Installation | **Ship a small project-level copier** (`tools/install-skills.mjs`) that writes to each agent's **documented** skill folder. Keep the third-party `npx skills` CLI as an optional GitHub fetch method, with its Cursor limit recorded. No extra npm dependencies, no telemetry, no global install without `--global` and `--confirm-global`. | Decision 3 avoided a custom CLI. In one real Next.js session (not repeated), Skills CLI 1.7.6 put Cursor skills in `.agents/skills/`, which Cursor's catalog did not list. Cursor's documented project path is `.cursor/skills/`. VYSON now copies to the documented path and still does not claim the agent loaded the skill. |

## Approved on 2026-11-12 (maintainer instruction: ready-to-use product)

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 14 | How the skills behave | **Implement first, ask last.** When a user asks for work, each skill runs *understand, plan internally, implement, verify, present* in one pass. It decides small choices itself and asks only when it is genuinely blocked. It still asks first before committing, pushing, deploying, deleting or replacing important user files, real form submissions, and paid or tracking services. The five skills are used through **exactly five prompts** (`docs/five-prompts.md`, also stored in each skill's `references/prompt.md`), in a fixed order: design, frontend, 3D, motion, quality. They share one hand-off file, `VYSON-NOTES.md`, in which each skill edits only its own section. | The maintainer wants a developer to install, paste five prompts and get a working site, without approval rounds. This replaces the "approve each step" habit of decision 5 **for the skills' behaviour**; the maintainer's own review of repository changes is unchanged. No end-to-end agent run is recorded yet, so the result is untested. |

## Approved on 2026-11-12 (maintainer instruction: zero-terminal install)

| # | Decision | Chosen option | Why |
|---|---|---|---|
| 15 | How end users install | **Install by prompt, with no terminal for the user.** The user pastes one install prompt (`docs/install.md`, copied into the README) that names a VYSON skill. The agent downloads `skills-manifest.json` from the public GitHub repository with its own terminal tool, downloads only the named skills' files into a temporary folder, checks every file's size and sha256, copies the verified folders into the agent's project skills folder, never overwrites a different copy, reports honestly, then reads the installed `SKILL.md` and starts the work in the same chat. Only data is downloaded; nothing downloaded is run. Documented target agents (folders as documented by each agent; none is a verified integration and none has run the prompt): Cursor `.cursor/skills`, Claude Code `.claude/skills`, Codex `.agents/skills`, Antigravity `.agents/skills`. The manifest is generated (`npm run build:manifest`) and kept fresh by a test. `tools/install-skills.mjs --from-github` is the tested reference of the same steps and the developer route; the clone-and-copy route stays, documented separately for contributors. This install prompt is a one-time setup step and does **not** count as one of the five workflow prompts of decision 14. | The maintainer wants a first-time user to install without a terminal, a manual clone, Node.js or knowledge of agent folders. An agent-run procedure with a verified manifest gives that without a new package manager. No agent has run the prompt against the published repository yet, so it is untested; the manifest only reaches users after the maintainer pushes it. |

## Defaults adopted from the proposal (change only on request)

| Topic | Default |
|---|---|
| Skill folder layout | Flat: `skills/vyson-<name>/` |
| Skill name prefix | `vyson-` |
| Script language | Node.js (`.mjs`), few dependencies |
| Example websites | Plain HTML/CSS/JS first; Vite for 3D examples |
| Versioning | One repository version (SemVer), with a version in each skill's `metadata` |
| Contribution legal model | MIT plus a licence statement in the pull request template (changed from "originality statement" by decision 12). No CLA. |
| Documentation | Markdown in the repository. No documentation website before v1.0. |
| Telemetry, hooks, remote instructions | None |
| Language | English |

## Open items for the maintainer

None of these is a technical blocker for the v0.1 Beta. Only the maintainer can do them, so they are not invented or filled in by an agent.

**Before the first public release (project-hygiene tasks):**

- Add a private contact method for the Code of Conduct. `CODE_OF_CONDUCT.md` still has a TODO and currently names **no** contact. The maintainer chooses it (for example a dedicated project address, not a personal one they do not want published).
- Enable GitHub "Private vulnerability reporting" (see `SECURITY.md`, which also has a TODO).

**Before wide promotion (not needed for a quiet beta):**

- Do a basic name and trademark search for "VYSON". Until it is done, nothing should claim that the name is free to use or protected.

**Whenever convenient:**

- Decide whether the copyright holder in `LICENSE` stays as a personal name or moves to an organization later.
