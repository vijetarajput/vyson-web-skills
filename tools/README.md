# tools/

Small checking scripts that keep the project healthy. Plain Node.js (`.mjs`), **no dependencies to install**. You need Node.js 22 or newer.

## Quick start

From the repository root:

```powershell
npm run check
```

This one command runs everything below. If it ends with `RESULT: PASSED` lines and no red text, the repository is healthy.

| Command | What it does |
|---|---|
| `npm test` | Runs the automated tests (valid skills, invalid skills, links, installer, command-line behavior). |
| `npm run validate:template` | Checks `templates/skill-template/` against the Agent Skills specification only. |
| `npm run validate` | Checks every skill in `skills/` against the specification **and** the VYSON project rules. |
| `npm run check:links` | Checks every relative link in every Markdown file in the repository. |
| `npm run check` | All of the above, in order. |

If `skills/` is ever empty (it holds five skills now), `npm run validate` prints a note and passes. That is expected.

## The skill validator

```powershell
node tools/validate-skills.mjs [folder] [options]
```

`folder` can be one skill (a folder containing `SKILL.md`) or a folder that contains many skills. The default is `skills/`.

| Option | Meaning |
|---|---|
| `--profile spec` | Specification rules and link checks only. Use this for any skill, including third-party ones. |
| `--profile project` | Default. Specification rules plus VYSON rules (`vyson-` prefix, pillar, example, eval file). |
| `--strict` | Treat warnings as errors. |
| `--json` | Machine-readable output. |
| `--no-color` | Plain text, no colors. |
| `--repo-root <path>` | Use another folder as the repository root. |

Exit codes: `0` passed, `1` one or more errors, `2` the command was used incorrectly.

Every problem has a code (for example `VS012`), a plain-English explanation and a "How to fix" line. The full list is in [docs/validator-rules.md](../docs/validator-rules.md).

### What it checks

- **Specification (`VS…`)**: `SKILL.md` exists; the header is present and closed; `name` and `description` rules; folder name equals `name`; allowed optional fields; file size limits.
- **Links (`VL…`)**: relative links and images resolve; links stay inside the skill folder; `#heading` anchors exist; capital letters match exactly (so a link that works on Windows but breaks on GitHub or Linux is caught).
- **VYSON project rules (`VP…`)**: `vyson-` prefix, pillar metadata, example and eval files, and motion/3D skills mentioning performance budget, reduced motion and mobile.

Some checks are **heuristics** (keyword-based) and are marked as warnings. They catch common mistakes but cannot judge quality. A human reviewer still decides that.

## The link checker

```powershell
node tools/check-links.mjs [folder] [--strict] [--json] [--no-color]
```

Checks relative links in all Markdown files under the repository (default) or the folder you give. The intentionally broken files in `tools/test/fixtures/` are skipped.

## Checkers that ship inside a skill

A skill may carry its own small checkers, so they keep working after the skill is installed into someone's project. There are six tools in five skills. All have no dependencies. Five are **static checkers** (they read files and never open a browser), so passing them is not a browser test. One, `browser-check.mjs`, is a **browser test**: it starts a Chrome or Edge that is already installed, so it needs one on the computer. None is part of `npm run validate`; run them on a website's files:

| Checker | Skill | Tests | What it covers | Manual browser steps |
|---|---|---|---|---|
| [`motion-lint.mjs`](../skills/vyson-css-motion/scripts/motion-lint.mjs) | `vyson-css-motion` | `tools/test/motion-lint.test.mjs` | Motion rules (14) | the skill's `references/verification.md` |
| [`design-lint.mjs`](../skills/vyson-premium-website-design/scripts/design-lint.mjs) | `vyson-premium-website-design` | `tools/test/design-lint.test.mjs` | Page basics, headings, focus, text size, token contrast, external files (18 rules) | the skill's `references/quality-checks.md` |
| [`3d-lint.mjs`](../skills/vyson-3d-interactive-web/scripts/3d-lint.mjs) | `vyson-3d-interactive-web` | `tools/test/3d-lint.test.mjs` | Loop that cannot stop, reduced motion, pixel ratio, canvas name, fallback, context loss, files from other websites, asset size (14 rules) | the skill's `references/performance-and-fallbacks.md` |
| [`frontend-lint.mjs`](../skills/vyson-frontend-development/scripts/frontend-lint.mjs) | `vyson-frontend-development` | `tools/test/frontend-lint.test.mjs` | Labels, HTML built from variables, `eval`, secrets, `fetch` handling, inline handlers, blocking scripts, debugging code (15 rules) | the skill's `references/quality-and-security.md` |
| [`site-audit.mjs`](../skills/vyson-website-quality-engineering/scripts/site-audit.mjs) | `vyson-website-quality-engineering` | `tools/test/site-audit.test.mjs` | A whole built site: links and files, language, viewport, titles, headings, alt text, labels, favicon, previews, heavy files, other websites (28 rules) | the skill's `references/accessibility-checks.md` |
| [`browser-check.mjs`](../skills/vyson-website-quality-engineering/scripts/browser-check.mjs) | `vyson-website-quality-engineering` | `tools/test/browser-check.test.mjs` | **Browser test.** Sideways scrolling, tap-target size, text size, console errors, failed requests, layout shift, keyboard focus, reduced motion (14 rules) | the same reference |

```powershell
node skills/vyson-css-motion/scripts/motion-lint.mjs path/to/site
node skills/vyson-premium-website-design/scripts/design-lint.mjs path/to/site
node skills/vyson-3d-interactive-web/scripts/3d-lint.mjs path/to/site
node skills/vyson-frontend-development/scripts/frontend-lint.mjs path/to/site
node skills/vyson-website-quality-engineering/scripts/site-audit.mjs path/to/built-site
node skills/vyson-website-quality-engineering/scripts/browser-check.mjs path/to/built-site
```

`tools/framework-checks/` holds optional checks for the React hook and the Vue composable in `vyson-frontend-development`. They need real React and Vue, which this repository does not depend on, so they are **not** part of `npm test`. `node tools/framework-checks/run.mjs` installs pinned versions in a temporary folder (telemetry off), runs the checks and deletes the folder. It exits 3 with "NOT PERFORMED" when the packages cannot be installed. These are logic checks in Node, not browser tests. `frontend-lint.mjs` also reads `.vue` files (the `<script>` blocks and `v-html`).

`browser-check.mjs` is one headless run on one computer (not a phone, not Firefox or Safari). Its tests in `tools/test/browser-check.test.mjs` that open a real browser are skipped when no Chrome or Edge is found, or when the environment variable `VYSON_SKIP_BROWSER_TESTS` is set to `1` (PowerShell: `$env:VYSON_SKIP_BROWSER_TESTS = "1"`). `skills/vyson-3d-interactive-web/scripts/serve.mjs` is a small local server for trying module and model files; it is not a checker.

## Skill installer

```powershell
node tools/install-skills.mjs --to path\to\your\website --agent cursor
```

Copies skill folders from `skills/` into the chosen agent's documented project path. It creates missing folders, never overwrites a different existing copy, stays project-level unless you pass `--global` and `--confirm-global`, and always reports discovery as **pending**. After a copy it prints the prompt of the skill you installed (step 1 when you install all five) and the path of all five prompt files, which are the ones in [docs/five-prompts.md](../docs/five-prompts.md). Details: [integrations/agents.md](../integrations/agents.md).

| Command | npm script |
|---|---|
| `node tools/install-skills.mjs --help` | `npm run install-skills -- --help` |
| `node tools/install-skills.mjs --list-agents` | `npm run install-skills -- --list-agents` |

## How the code is organized

```text
tools/
├── validate-skills.mjs   command-line entry point for the validator
├── install-skills.mjs    copy skills into an agent's documented folder
├── check-links.mjs       command-line entry point for the link checker
├── lib/
│   ├── issues.mjs        the rule catalog: code, severity, plain-English fix
│   ├── frontmatter.mjs   reads the SKILL.md header (a small YAML subset)
│   ├── links.mjs         finds and checks Markdown links
│   ├── fs-utils.mjs      file helpers, including exact-capitalisation checks
│   ├── validate-skill.mjs  specification checks for one skill
│   ├── rules-project.mjs   VYSON project rules and eval-file checks
│   ├── discover.mjs      finds skill folders
│   ├── agents.mjs        agent ids and documented skill folders
│   ├── install-skills.mjs  copy logic (no overwrites, hash check)
│   └── report.mjs        success and failure reports (text and JSON)
└── test/
    ├── *.test.mjs        automated tests (built-in `node:test`)
    └── fixtures/         valid and intentionally invalid example skills
```

To add a rule: add it to `lib/issues.mjs`, implement it in the matching `lib/` file, add a test, and add a row to `docs/validator-rules.md`. A test fails if the documentation and the code disagree.

## Planned

| Script | What it will check | Status |
|---|---|---|
| `check-licenses` | Every library a skill mentions is listed in `THIRD_PARTY.md` with an allowed license | Not written yet |
| `new-skill` | Creates a new skill folder from the template | Not written yet |
