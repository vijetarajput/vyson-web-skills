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
| `npm test` | Runs the automated tests (valid skills, invalid skills, links, command-line behavior). |
| `npm run validate:template` | Checks `templates/skill-template/` against the Agent Skills specification only. |
| `npm run validate` | Checks every skill in `skills/` against the specification **and** the VYSON project rules. |
| `npm run check:links` | Checks every relative link in every Markdown file in the repository. |
| `npm run check` | All of the above, in order. |

While `skills/` is empty (pre-alpha), `npm run validate` prints a note and passes. That is expected.

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

A skill may carry its own small checker, so it keeps working after the skill is installed into someone's project. The first one is [`motion-lint.mjs`](../skills/vyson-css-motion/scripts/motion-lint.mjs) in `vyson-css-motion`. It has no dependencies and is tested by `tools/test/motion-lint.test.mjs`. It is a **static checker** (it reads files and never opens a browser), so passing it is not a browser test; the manual browser steps are in the skill's `references/verification.md`. It is not part of `npm run validate`; run it on a website's files:

```powershell
node skills/vyson-css-motion/scripts/motion-lint.mjs path/to/site
```

## How the code is organized

```text
tools/
├── validate-skills.mjs   command-line entry point for the validator
├── check-links.mjs       command-line entry point for the link checker
├── lib/
│   ├── issues.mjs        the rule catalog: code, severity, plain-English fix
│   ├── frontmatter.mjs   reads the SKILL.md header (a small YAML subset)
│   ├── links.mjs         finds and checks Markdown links
│   ├── fs-utils.mjs      file helpers, including exact-capitalisation checks
│   ├── validate-skill.mjs  specification checks for one skill
│   ├── rules-project.mjs   VYSON project rules and eval-file checks
│   ├── discover.mjs      finds skill folders
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
