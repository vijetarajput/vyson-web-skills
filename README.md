# VYSON Web Skills

**Turn Your Website Vision into Reality.**

An open-source toolkit of Agent Skills for building premium, responsive, animated and production-ready websites with AI coding agents.

> **Status: pre-alpha (v0.1 in progress).** One pilot skill, [`vyson-css-motion`](skills/vyson-css-motion/SKILL.md), is written, and the checking tools and tests are working. The other four planned v0.1 skills are not written yet. **No AI coding agent has been confirmed to find and use the skill automatically yet.** The first CSS Motion experiment is inconclusive (see [Evidence](#evidence-and-honesty)). See the [roadmap](ROADMAP.md).

## What this is

VYSON Web Skills is a collection of **Agent Skills**: folders of instructions that teach an AI coding agent how to do one specific web development job well. Skills follow the open [Agent Skills specification](https://agentskills.io/specification).

The goal is not a pile of prompts. Each skill should be practical, original, tested, and backed by a small example.

## What exists today, and what does not

| Area | Status |
|---|---|
| Project structure, contribution rules, licence and third-party list | **Implemented** |
| Skill validator, Markdown link checker and automated tests | **Implemented** (see [Checking tools](#checking-tools-and-tests)) |
| One pilot skill: `vyson-css-motion` (with an example, an eval file and its own static checker) | **Implemented, pilot**. Not yet shown to work better than no skill. |
| An experiment comparing the skill with no skill | **One exploratory run per condition, inconclusive.** A controlled three-repeat experiment is prepared but **not started**. |
| Installing `vyson-css-motion` from GitHub into a project folder with the `skills` installer | **Tested** on Windows 10 with Skills CLI 1.7.6 (files copied and checked). See [Installation](#installation). |
| Cursor, Claude Code or Codex actually loading and following the installed skill | **Not verified yet** |
| The other four v0.1 skills (design, 3D, frontend, quality) | **Planned, not written** |
| Skills beyond v0.1 (GSAP, Lenis, Three.js, React, Next.js and more) | **Planned only** |

## The five pillars

These are the five areas the project aims to cover. Only the motion pillar has a skill so far.

| Pillar | Focus | Status |
|---|---|---|
| **Premium design** | Luxury, SaaS, agency, interior and architecture, real estate, and high-converting landing pages | Planned |
| **Animation and motion** | Native CSS first. GSAP, Lenis, scroll-based animation and cinematic transitions are later goals | One pilot skill (CSS only) |
| **3D and interactive web** | Three.js, WebGL, 3D objects, interactive product experiences | Planned |
| **Frontend development** | React, Next.js, responsive layouts, reusable components, design systems | Planned |
| **Website quality** | Accessibility, SEO, performance, responsive testing, website audits | Planned |

## Available skill: `vyson-css-motion` (pilot)

Adds CSS-based motion to a website while keeping it fast and accessible. It is a pilot, so expect rough edges.

- **Recipes (10):** page-load entrance, scroll reveal (with and without JavaScript), button hover and press, card lift, link underline, FAQ or accordion panel (one open at a time, keyboard accessible), marquee, page transition, scroll progress bar.
- **Safety rules:** a performance budget, `prefers-reduced-motion` handling, a mobile fallback, and a tap-target size guide (aim for 44 by 44 CSS pixels; 24 by 24 is the minimum, with a few exceptions).
- **Starter CSS:** [`assets/motion-base.css`](skills/vyson-css-motion/assets/motion-base.css).
- **Its own checker:** [`scripts/motion-lint.mjs`](skills/vyson-css-motion/scripts/motion-lint.mjs) reads CSS, JavaScript and HTML files and applies 14 rules. It is a **static check**: it never opens a browser, and passing it does not mean a page works. The manual browser steps are in [`references/verification.md`](skills/vyson-css-motion/references/verification.md).
- **Example site:** [`examples/vyson-css-motion/`](examples/vyson-css-motion/README.md), with notes on what was and was not checked.
- **Eval cases:** [`evals/vyson-css-motion/evals.json`](evals/vyson-css-motion/evals.json) (cases are written; they have not been run with an agent yet).

It is not for 3D scenes, or for timeline libraries such as GSAP.

## Checking tools and tests

Everything below is implemented and uses only Node.js, with no packages to install. It needs Node.js 22 or newer. It has been run on **Windows 10 with Node.js 24**. Linux and macOS are **untested**.

```powershell
git clone https://github.com/vijetarajput/vyson-web-skills.git
cd vyson-web-skills
npm run check
```

`npm run check` runs the automated tests, checks the skill template and every skill against the Agent Skills specification and the project rules, and checks every relative link in the Markdown files. You can also run each step on its own:

| Command | What it does |
|---|---|
| `npm test` | Automated tests of the validator, link checker and the CSS Motion skill |
| `npm run validate` | Validates every skill in `skills/` |
| `npm run validate:template` | Validates the skill template against the specification only |
| `npm run check:links` | Checks relative links in Markdown files |

Every problem the validator can report has a code and an explanation in [docs/validator-rules.md](docs/validator-rules.md). To run the CSS Motion checker on a site: `node skills/vyson-css-motion/scripts/motion-lint.mjs path\to\your\site`.

## Installation

**Recommended command (pinned to the tested version).** Run this from inside your own project folder (it needs Node.js 22.20 or newer):

```powershell
npx skills@1.7.6 add vijetarajput/vyson-web-skills --skill vyson-css-motion -a cursor -a claude-code -a codex --copy -y
```

> **Telemetry note.** `skills` is a separate, third-party installer (Vercel Labs, MIT licence), not part of this project. According to the installer's documentation, it sends anonymous usage data by default, which can include the repository and skill names for public GitHub repositories. According to the installer's documentation, either of these PowerShell commands switches that off for the current window when you run it before the install command:
>
> ```powershell
> $env:DISABLE_TELEMETRY = "1"
> $env:DO_NOT_TRACK = "1"
> ```
>
> These controls belong to the installer, not to VYSON Web Skills. We have not audited the installer and did not observe its network traffic (our tests ran with telemetry switched off). Details: [THIRD_PARTY.md](THIRD_PARTY.md#skills-cli-telemetry).

**Optional alternative (not pinned):**

```powershell
npx skills add vijetarajput/vyson-web-skills --skill vyson-css-motion -a cursor -a claude-code -a codex --copy -y
```

The difference: `skills@1.7.6` always runs version 1.7.6, the only version we tested. Without the version, `npx` runs whatever the latest version is at that moment. On 10 November 2026 that was also 1.7.6, but a later version may behave differently, and we have **not** tested any later version.

The command copies the skill into `.agents/skills/vyson-css-motion/` (the folder the Skills CLI documents for Cursor and Codex) and `.claude/skills/vyson-css-motion/` (the folder it documents for Claude Code), and writes a `skills-lock.json` file in your project. We have not checked that any of these agents reads those folders.

**What was tested (10 November 2026).** Installing from the public GitHub repository, with Skills CLI **1.7.6**, on **Windows 10**, into a temporary project folder:

- `npx skills add vijetarajput/vyson-web-skills --list` found exactly one skill, `vyson-css-motion`.
- The default command without extra options (`npx skills add vijetarajput/vyson-web-skills`) passed. It installed one copy, in `.agents/skills/`. This test ran inside an agent terminal, where the installer reported that it had detected an agent and installed without asking questions. How it behaves in a normal interactive terminal was **not tested**.
- The recommended command above (pinned to 1.7.6) passed, with copies in both folders.
- The installed files passed the skill validator, and the installed `motion-lint.mjs` ran correctly.
- The installed files had Windows line endings (CRLF), while the repository stores them with LF. This came from Git's checkout settings on the Windows test PC (`core.autocrlf` was `true`), not from the installer or us editing the files. After allowing for that, all 7 files had the same content as the published ones.

**This proves where the files end up. It does not prove that any agent uses the skill.** We have **not** checked that Cursor, Claude Code or Codex finds, loads or follows the installed skill, and we make no support claim for any agent until that has been checked. The details are in [integrations/README.md](integrations/README.md).

**What has not been tested:**

- macOS and Linux.
- Global installation (`-g`), the default symlink mode, and the installer's update, check and remove commands, all against GitHub.
- Agent execution: any agent loading and following the skill.
- Any agent other than the three above.
- Any Skills CLI version other than 1.7.6, including the unpinned alternative. These results may change with other versions.
- Normal interactive terminal behaviour of the installer (the default-command test ran in an agent terminal).

A manual-copy guide for each agent is planned, not written.

## Evidence and honesty

We publish how skills are tested, including weak results.

- A first exploratory comparison of `vyson-css-motion` with and without the skill is recorded in [`bench/experiments/css-motion-pilot-001/`](bench/experiments/css-motion-pilot-001/README.md). It had **one run per condition and known flaws** (the "without" run was not a clean baseline). **It does not show that the skill works.** It did surface real problems in both generated sites (for example accordions that left two panels open, and small tap targets) and gaps in the skill's own guidance and example. The skill and example were changed afterwards, so the current skill text is not the text that was tested.
- A controlled experiment with three runs per condition in two separate clean workspaces is planned: [css-motion-repeat-plan.md](bench/experiments/css-motion-repeat-plan.md). **It has not started**, and there are no results from it. Even when it finishes, three runs per condition is a small sample, so it can suggest, not prove.
- The proposed larger benchmark is described in [bench/](bench/README.md). It does not exist yet.

## Principles

- **Evidence over claims.** Nothing is claimed that we have not measured, and we say "untested" when something is untested.
- **Safe motion and 3D.** Animation and 3D skills must state their performance budget and their reduced-motion and mobile fallbacks.
- **Original work.** Skills and examples are written from scratch. We do not copy or rebrand other projects. See [CONTRIBUTING.md](CONTRIBUTING.md).
- **Trust by default.** No telemetry, no background hooks, and no instructions fetched from the internet at run time.
- **Licences are checked.** Every library a skill recommends is listed in [THIRD_PARTY.md](THIRD_PARTY.md) with its licence.

## Roadmap

The full plan is in [ROADMAP.md](ROADMAP.md). In short:

| Stage | Goal | State |
|---|---|---|
| v0.1 | Five tested skills (one per pillar), one audit script, a small honest benchmark, and install guides tested on Cursor, Claude Code and Codex | In progress. Foundation, validator and the pilot skill are done. The next skills are not started. |
| v1.0 | About 15 skills across the five pillars | Planned |
| Later | Plugin manifests, a documentation website, a before-and-after gallery built from real benchmark runs | Not scheduled |

The roadmap shows intent, not promises. Dates depend on testing results.

## Repository layout

| Folder | Purpose |
|---|---|
| [`skills/`](skills/) | The product: one folder per skill |
| [`examples/`](examples/) | Small demo websites showing what each skill produces |
| [`evals/`](evals/) | Per-skill behaviour tests (written, not yet run with an agent) |
| [`bench/`](bench/) | VYSON Bench: experiments and the planned with-and-without comparison |
| [`integrations/`](integrations/) | Install notes for each AI agent, with what was and was not tested |
| [`docs/`](docs/) | Documentation, validator rules and project decisions |
| [`templates/`](templates/) | Starting point for new skills |
| [`tools/`](tools/) | The validator, link checker and their tests |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first. To report a security problem, see [SECURITY.md](SECURITY.md). Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## Licence

[MIT](LICENSE). Third-party libraries mentioned by skills keep their own licences. See [THIRD_PARTY.md](THIRD_PARTY.md).
