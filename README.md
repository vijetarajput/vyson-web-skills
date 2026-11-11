# VYSON Web Skills

**Turn Your Website Vision into Reality.**

[![Licence: MIT](https://img.shields.io/github/license/vijetarajput/vyson-web-skills)](LICENSE) ![Status: v0.1 beta](https://img.shields.io/badge/status-v0.1%20beta-orange)

An open-source toolkit of **Agent Skills** that help AI coding agents (Cursor, Claude Code, Codex and tools that read the same format) build premium, responsive, animated and production-ready websites. Each skill is a folder of instructions, with small checker scripts, a working example and a test prompt file, following the open [Agent Skills specification](https://agentskills.io/specification).

> **Status: v0.1 Beta.** Five skills are written and pass this repository's own checks. This is an early beta: read [Limitations](#limitations-read-this-first) before relying on it.

## Contents

[Limitations](#limitations-read-this-first) · [The five skills](#the-five-skills) · [Which skill should I use?](#which-skill-should-i-use) · [Frameworks](#frameworks) · [Installation](#installation) · [The five prompts](#use-the-five-skills-five-prompts) · [Examples](#examples) · [Checking tools and tests](#checking-tools-and-tests) · [Repository structure](#repository-structure) · [Contributing](#contributing) · [Licensing and attribution](#licensing-and-attribution) · [Roadmap](#roadmap)

## Limitations (read this first)

We would rather tell you what is not proven than have you find out later.

- **No agent-level results yet.** No AI coding agent has been confirmed to find, load or follow any of the five skills. The test prompts in [`evals/`](evals/) are written but **have never been run with an agent**. The one with/without experiment, for `vyson-css-motion`, had one run per condition and is **inconclusive**: it does not show that a skill helps ([report](bench/experiments/css-motion-pilot-001/README.md)).
- **The five-prompt workflow has not been proven.** The prompts in [docs/five-prompts.md](docs/five-prompts.md) are checked by this repository's tests for structure only. No agent has followed all five on a real website project yet, so a complete, working site from the five prompts is a design goal, not a result.
- **Installation is verified; agent behaviour is not.** Files can be copied into each agent's documented folder. That is **not** the same as the agent listing the skill in its catalog. In one real Cursor session (12 November 2026, not repeated), files that Skills CLI 1.7.6 wrote to `.agents/skills/` did **not** appear in Cursor's skill catalog, although Cursor's docs list that folder. VYSON's copier uses `.cursor/skills/` for Cursor. After any install, open a **new** agent session and ask which VYSON skills it can see. `skills update` is **untested**.
- **React, Vue, Next.js, Nuxt.** The React and Vue helpers were tested in Node only. Next.js and Nuxt were not tested at all.
- **Limited browser and device testing.** Every browser check ran in **headless Chrome 157 on one Windows 10 computer**, with software-rendered WebGL for the 3D example. **Not tested:** Firefox, Safari, Edge by hand, a real phone or tablet, a real GPU, a screen reader, a slow network, Linux and macOS.
- **Not independent.** The examples and the checkers were written by the same AI agent as the skills, so they are not independent tests. Nothing here has had independent external testing yet.
- **No guarantees.** Nothing here guarantees a result, a speed, an accessibility level, security or compatibility. Numbers in the skills are VYSON defaults, not measurements. The checkers cannot certify anything.

Skill status: `vyson-css-motion` is a **pilot**. The other four have the metadata status **draft** until they have been tried with real agents.

## The five skills

Each skill installs on its own. Every skill has its own checker, an example in [`examples/`](examples/) and a test file in [`evals/`](evals/).

| Skill | What it helps you do | Bundled helpers |
|---|---|---|
| **`vyson-premium-website-design`** | Make a site look decided, not generated. Write a short direction note (audience, feeling, one signature move), then set type, colour, spacing, layout, imagery and finishing details. | 8 references (incl. workflow and prompt), a design-token stylesheet, `design-lint.mjs` (18 rules) |
| **`vyson-css-motion`** *(pilot)* | Add CSS-only motion that stays fast and accessible: page-load entrances, scroll reveals, hovers, an accordion, a marquee, page transitions, a progress bar. Includes reduced-motion handling and a mobile fallback. | 6 references (incl. workflow and prompt) with 10 recipes, a starter stylesheet, `motion-lint.mjs` (14 rules) |
| **`vyson-3d-interactive-web`** | Decide whether 3D is worth it, then add the lightest option (CSS, 2D canvas, plain WebGL or Three.js) with a performance budget, a fallback ladder (high, low, still image, no WebGL), reduced motion and context-loss handling. | 6 references (incl. workflow and prompt), `canvas-stage.js`, a local server, `3d-lint.mjs` (14 rules) |
| **`vyson-frontend-development`** | Build forms, data loading, dialogs, tabs and menus that work without JavaScript first and fail politely: every state visible (loading, empty, error, success), no HTML built from variables, safe handling of secrets and storage. | 7 references (incl. workflow and prompt), `fetch-state.js`, `form-helpers.js`, a React hook, a Vue composable, `frontend-lint.mjs` (15 rules) |
| **`vyson-website-quality-engineering`** | Check a finished site before launch and report honestly: a static audit of the built files, a real-browser check, the manual checks a tool cannot do, and a report that keeps the three apart. | 6 references (incl. workflow and prompt), `site-audit.mjs` (28 rules), `browser-check.mjs` (14 rules) |

Each skill names the others in its "when not to use" section, so an agent can hand a task to the right one. VYSON does not try to replace library-specific skill packs (see [Licensing and attribution](#licensing-and-attribution)).

## Which skill should I use?

| You want to... | Use | If you also use another skill |
|---|---|---|
| Redesign a landing page so it stops looking like a template; choose fonts, colours, spacing, layout | `vyson-premium-website-design` | Add `vyson-css-motion` afterwards for animation |
| Add fade-ins, scroll reveals, hover effects, a smooth accordion, with `prefers-reduced-motion` respected | `vyson-css-motion` | |
| Put a 3D product viewer, WebGL background or Three.js scene on a page without breaking mobile | `vyson-3d-interactive-web` | |
| Add a contact or signup form, search and filter, an API call with loading and error states, a modal or tabs | `vyson-frontend-development` | |
| Check a site before launch: accessibility basics, broken links, tap targets, speed hints, SEO basics | `vyson-website-quality-engineering` | Run it last, after the others |
| Make a whole site from scratch | Install all five. Typical order: design, frontend, motion (and 3D if needed), then quality | |

Not covered yet: back-end work, e-commerce, content writing, GSAP or timeline animation, and component-library-specific skills.

## Frameworks

The skills are written to work on plain HTML, CSS and JavaScript first, so they do not force a framework or a dependency. Here is what exists for each stack and how far it has been checked. "Checked" means by this repository's own tools, in the environment described under [Limitations](#limitations-read-this-first).

| Stack | What the skills give you | Verification |
|---|---|---|
| **Plain HTML, CSS, JavaScript** | All five skills. The five examples are plain HTML, CSS and JavaScript (the 3D example uses plain WebGL, no library). | The examples and checkers were run in headless Chrome 157 on Windows 10. |
| **React** | `vyson-frontend-development` has a data-loading hook (`use-fetch-state.react.js`) and React notes. `vyson-3d-interactive-web` has written guidance for mounting a scene. | The hook passed 8 logic checks in Node with React 19.3.1 and its test renderer. **Not tested in a browser.** The 3D guidance is **untested**. |
| **Next.js** | Notes in `vyson-frontend-development` (client components, hydration, which settings are public) and written 3D mounting guidance. | **Untested.** No Next.js project was built. |
| **Vue 3 / Nuxt** | `vyson-frontend-development` has a composable (`use-fetch-state.vue.js`) and Vue notes. `frontend-lint.mjs` also reads the `<script>` blocks and `v-html` in `.vue` files. | The composable passed 6 logic checks in Node with Vue 3.5.45. **Not tested in a browser or in Nuxt.** The 3D guidance is **untested**. |

Reproduce the Node checks with `node tools/framework-checks/run.mjs` (it installs the pinned React and Vue packages in a temporary folder, then deletes it).

## Installation

You need **Node.js 22 or newer**. Clone this repository, then copy skills into **your website folder**. The copier is a small Node script in this repo. It does not use the network, does not add packages, and does not install globally unless you pass two explicit flags.

**Installation is not discovery.** Matching files on disk do not mean the agent loaded the skill. After a copy, open a **new** agent session and ask which VYSON skills it can see.

### Where files go

| Agent | `--agent` | Project folder |
|---|---|---|
| Cursor | `cursor` | `.cursor/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` |
| Codex | `codex` | `.agents/skills/` |

Do not assume `.agents/skills/` is read by every agent. Full table and the Cursor finding: [integrations/agents.md](integrations/agents.md).

### Install all five skills (recommended)

```powershell
git clone https://github.com/vijetarajput/vyson-web-skills.git
cd vyson-web-skills
node tools/install-skills.mjs --to path\to\your\website --agent cursor
```

Passing `--agent` is the reliable way. If you leave it out, the script makes a best-effort guess from environment variables (only the Cursor signal has been seen in practice). When the guess is missing or unclear, it asks you, or stops and tells you to pass `--agent`. Run `node tools/install-skills.mjs --help` to see all options.

### Install one skill

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent cursor --skill vyson-premium-website-design
```

| Skill | `--skill` name |
|---|---|
| Premium website design | `vyson-premium-website-design` |
| CSS motion (pilot) | `vyson-css-motion` |
| 3D and interactive web | `vyson-3d-interactive-web` |
| Frontend development | `vyson-frontend-development` |
| Website quality engineering | `vyson-website-quality-engineering` |

### What the copier does

- Creates the agent's skills folder if it is missing.
- Copies `SKILL.md`, `references/`, `scripts/`, `assets/` and licence notices.
- Skips a skill that is already installed and identical.
- **Never overwrites** a skill whose files differ (your edits stay).
- Stays **project-level** unless you pass `--global` **and** `--confirm-global`.
- Prints installed names, exact paths, file verification, discovery status (**pending** until a new session lists the skill), recovery steps, and the prompt to paste.

The prompts are described in [Use the five skills](#use-the-five-skills-five-prompts) below. After a successful copy the installer prints the step 1 prompt (or the prompt of the one skill you installed) and the path of all five prompt files. It does not claim the agent has loaded the skill.

### If the agent does not list the skills

1. Check that `<project>/.cursor/skills/<name>/SKILL.md` exists (or the Claude Code / Codex path above).
2. Open a **fresh** agent chat in that project. If the skills are still missing, restart the agent. Cursor's docs say it discovers skills when it starts. Claude Code's docs say to run `/reload-skills` if `.claude/skills/` did not exist when the session began.
3. Ask: "Which VYSON skills appear in your skill catalog?"
4. For Cursor, do not rely on `.agents/skills/` alone.

Agent guides: [Cursor](integrations/cursor.md), [Claude Code](integrations/claude-code.md), [Codex](integrations/codex.md).

### Optional: third-party Skills CLI 1.7.6

This still works as a file copier for some folders, and it can fetch from GitHub. It is a separate tool with its own telemetry (see below), and it needs **Node.js 22.20 or newer**. **For Cursor it writes to `.agents/skills/`, which did not load in one real Cursor session (not repeated).** Prefer `tools/install-skills.mjs` for Cursor.

```powershell
$env:DISABLE_TELEMETRY = "1"
$env:DO_NOT_TRACK = "1"
npx skills@1.7.6 add vijetarajput/vyson-web-skills --skill '*' --copy
```

What has been tested with that CLI is recorded in [integrations/README.md](integrations/README.md). Those tests used earlier commits, before the workflow and prompt files existed, so installing the current `main` with the Skills CLI is **untested**. The VYSON copier (run from a clone of this repository, as above) was tested on the current files. `skills update` is **untested**. macOS, Linux and other CLI versions are **untested**.

### Telemetry note

The VYSON copier sends nothing. The optional `skills` CLI (Vercel Labs, MIT) documents anonymous usage data on by default. Opt out with `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` before running it. We have not audited it. See [THIRD_PARTY.md](THIRD_PARTY.md#skills-cli-telemetry).

## Use the five skills: five prompts

After installing, open your website project (empty or existing) and paste **one prompt per skill, in this order, each in a new agent chat**. Every prompt tells the agent to read the project, decide small choices itself, build the result, check it and report. It asks a question only if it cannot continue at all.

| Step | Skill | Result |
|---|---|---|
| 1 | `vyson-premium-website-design` | Visual direction, tokens, responsive polished pages |
| 2 | `vyson-frontend-development` | A working site: structure, navigation, forms, data, every state |
| 3 | `vyson-3d-interactive-web` | One purposeful 3D or interactive visual, with fallbacks |
| 4 | `vyson-css-motion` | Restrained, accessible motion |
| 5 | `vyson-website-quality-engineering` | Whole-site checks, safe fixes, an honest launch report |

The prompts are in [docs/five-prompts.md](docs/five-prompts.md). The same text is installed with each skill, in `references/prompt.md`. The skills share one hand-off file, `VYSON-NOTES.md`, at your project root, and each edits only its own section. They never commit, push, deploy, overwrite your work or submit real forms without your say-so.

**Not verified:** no agent has yet followed all five prompts on a real project. The structure of the prompts and skills is checked by this repository's tests, not the outcome. Treat your first run as a test and read each report.

## Examples

Each skill has a small example site with the exact prompt used and notes on what was and was not checked. All content is made up, and nothing is sent anywhere.

| Example | What it is | How to open it |
|---|---|---|
| [`examples/vyson-premium-website-design/`](examples/vyson-premium-website-design/README.md) | An architecture studio page (plain HTML and CSS, no script) | Double-click `result/index.html` |
| [`examples/vyson-css-motion/`](examples/vyson-css-motion/README.md) | A coffee roaster page with entrances, reveals and an accordion | Double-click `result/index.html` |
| [`examples/vyson-3d-interactive-web/`](examples/vyson-3d-interactive-web/README.md) | A glass paperweight viewer in plain WebGL, with fallbacks | `node skills/vyson-3d-interactive-web/scripts/serve.mjs examples/vyson-3d-interactive-web/result`, then open the printed address |
| [`examples/vyson-frontend-development/`](examples/vyson-frontend-development/README.md) | A workshop programme with search, a dialog and a form, plus buttons that simulate a slow, empty or failing server | Serve the folder as above with `examples/vyson-frontend-development/result` |
| [`examples/vyson-website-quality-engineering/`](examples/vyson-website-quality-engineering/README.md) | A deliberately flawed bakery site, its repaired version, and the unedited tool output before and after | Read the README and [REPORT.md](examples/vyson-website-quality-engineering/REPORT.md) |

The examples were checked in headless Chrome only (see [Limitations](#limitations-read-this-first)).

## Checking tools and tests

Everything below uses only Node.js (22 or newer), with nothing to install. It was run on **Windows 10 with Node.js 24**; Linux and macOS are untested.

```powershell
git clone https://github.com/vijetarajput/vyson-web-skills.git
cd vyson-web-skills
npm run check
```

`npm run check` runs the automated tests, validates the skill template and every skill against the Agent Skills specification and the project rules (including strict mode for warnings), and checks every relative link in the Markdown files.

| Command | What it does |
|---|---|
| `npm run check` | Everything below, in order |
| `npm test` | Automated tests of the validator, link checker, all five skills and their checkers. The tests that open headless Chrome or Edge are skipped if none is installed, or when `VYSON_SKIP_BROWSER_TESTS=1` is set |
| `npm run validate` | Validates every skill in `skills/` |
| `npm run validate:template` | Validates the skill template against the specification |
| `npm run check:links` | Checks relative links in Markdown files |

Rules the validator can report are explained in [docs/validator-rules.md](docs/validator-rules.md).

### Checkers inside the skills

Each skill carries small checkers that keep working after the skill is installed. Adjust the path if you installed a skill into a project.

| Skill | Command | Kind |
|---|---|---|
| `vyson-css-motion` | `node skills/vyson-css-motion/scripts/motion-lint.mjs path\to\site` | Static check |
| `vyson-premium-website-design` | `node skills/vyson-premium-website-design/scripts/design-lint.mjs path\to\site` | Static check |
| `vyson-3d-interactive-web` | `node skills/vyson-3d-interactive-web/scripts/3d-lint.mjs path\to\site` | Static check |
| `vyson-frontend-development` | `node skills/vyson-frontend-development/scripts/frontend-lint.mjs path\to\site` | Static check |
| `vyson-website-quality-engineering` | `node skills/vyson-website-quality-engineering/scripts/site-audit.mjs path\to\built\site` | Static check |
| `vyson-website-quality-engineering` | `node skills/vyson-website-quality-engineering/scripts/browser-check.mjs path\to\built\site` | **Browser test**: needs Chrome or Edge installed, runs one headless pass |

A **static check** reads files and never opens a browser. The browser check serves your folder on `127.0.0.1` only, downloads nothing and removes its temporary browser profile. Passing any of these is **not** a design review, a security review, an accessibility audit or a performance measurement.

## Repository structure

| Path | Purpose |
|---|---|
| [`skills/`](skills/) | **The product:** one folder per skill (`SKILL.md`, `references/`, `assets/`, `scripts/`) |
| [`examples/`](examples/) | One demo site per skill, with the prompt and honest notes |
| [`evals/`](evals/) | One `evals.json` per skill: test prompts, including cases where the skill should not activate (written, not yet run with an agent) |
| [`tools/`](tools/) | The validator, the skill copier (`install-skills.mjs`), the link checker, the test suite and the optional React/Vue checks |
| [`bench/`](bench/) | The CSS Motion pilot experiment records and the repeat plan |
| [`integrations/`](integrations/) | Install notes and the install test results for each agent |
| [`docs/`](docs/) | Validator rules and the project's approved decisions |
| [`templates/`](templates/) | A starting point for a new skill |
| `AGENTS.md`, `CONTRIBUTING.md`, `THIRD_PARTY.md`, `CHANGELOG.md`, `ROADMAP.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `LICENSE` | Project policy and history |

## Contributing

Contributions are welcome, including small ones (a wording fix, a bug in a checker, a new test prompt).

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).
2. Open an issue first for a new skill, using the "Skill idea" form, so we can check it does not duplicate an existing one.
3. Start from [`templates/skill-template/`](templates/skill-template/), add an example and an eval file, and run `npm run check`.
4. Open a pull request using the template. Say how you tested it, and do not claim results you did not measure.

Reuse of other open-source work is welcome only when its licence file allows it. See the policy below. To report a security problem, see [SECURITY.md](SECURITY.md). The Code of Conduct does not yet list a private contact address; the maintainer has to add one.

## Licensing and attribution

- **Original VYSON work** is under the [MIT licence](LICENSE).
- **Adapted third-party material** is allowed only when the source repository has a licence file that permits it (MIT, Apache-2.0, BSD or ISC). The copyright notice and licence text stay next to it, it is marked as adapted in the file, and it is listed in [THIRD_PARTY.md](THIRD_PARTY.md). Material with no licence file or an unclear licence is never copied; we write our own version.
- **Today** one short piece is adapted: a five-step "removal test" in `vyson-premium-website-design`, from [MengTo/skills](https://github.com/MengTo/skills) (MIT, Copyright (c) 2026 Meng To). The full notice is in [`skills/vyson-premium-website-design/NOTICE.md`](skills/vyson-premium-website-design/NOTICE.md). No third-party library code is included.
- **Libraries the skills mention** (React, Next.js, Vue, Vite, Three.js and others) are not bundled. Each is listed in [THIRD_PARTY.md](THIRD_PARTY.md) with the licence we read and the date. GSAP is not open source; the file explains how we treat it.
- **Other skill packs** were reviewed and are listed there too (shadcn-ui/ui, magicuidesign/magicui, vercel-labs/agent-skills). Nothing was copied from them, and naming them is **not** an endorsement, a partnership or a tested integration.
- **No telemetry**, no background hooks and no instructions fetched from the internet at run time in any skill.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full plan and [CHANGELOG.md](CHANGELOG.md) for what changed. In short:

| Stage | Goal | State |
|---|---|---|
| v0.1 Beta | Five skills (one per pillar), checkers, examples, install tests | Written and checked by this repository's tools. A small copier writes to documented agent folders. Skills CLI GitHub install still verified for file placement only. Not done: agent catalog discovery, `skills update`, wider browser and device testing, independent external testing |
| v1.0 | About 15 skills across the five pillars | Planned |
| Later | Plugin manifests, a documentation website, a before-and-after gallery built from real benchmark runs | Not scheduled |

The roadmap shows intent, not promises.
