# Changelog

All notable changes to this project are recorded here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/) while in pre-1.0 development.

## [Unreleased]

### Added
- Project foundation: README, contribution guide, code of conduct, security policy, roadmap.
- Folder structure for skills, examples, evals, benchmarks, integrations, docs, templates and tools.
- Third-party license manifest (`THIRD_PARTY.md`).
- Skill template and eval-file template.
- GitHub issue forms, pull request template and code owners file.
- Record of approved project decisions (`docs/decisions.md`).
- Skill validator (`tools/validate-skills.mjs`) following the Agent Skills specification, with VYSON project rules, plain-English error reports, `--strict` and `--json` modes.
- Repository-wide Markdown link checker (`tools/check-links.mjs`), including exact-capitalisation checks.
- Automated tests with valid and intentionally invalid example skills (`tools/test/`), and a rule reference (`docs/validator-rules.md`).
- `package.json` with `npm run check` and related scripts (no dependencies).
- Pilot skill `vyson-css-motion`: CSS-only motion with recipes, a performance budget, reduced-motion guidance, a starter stylesheet and a small checker script (`motion-lint.mjs`).
- Example site `examples/vyson-css-motion/` and eval file `evals/vyson-css-motion/evals.json` (cases written, not yet run with an agent).
- Tests for the motion checker and for the skill's own files.
- Pilot experiment record `bench/experiments/css-motion-pilot-001/`: one with-skill and one without-skill run of the same task (**1 run per condition, known confounds, not proof of effectiveness**), the measuring scripts, results, representative screenshots, a blinded AI review and a human review sheet. Plan for a controlled three-repeat experiment (`bench/experiments/css-motion-repeat-plan.md`, not started).
- `vyson-css-motion` after the pilot review:
  - Recipe 7 (accordion): only one panel may be expanded at a time, opening one closes the other, full keyboard use (`Tab`, `Enter`, `Space`, arrows, `Home`, `End`), and the closing animation no longer plays on page load.
  - Tap-target rule: 44 by 44 CSS pixels to aim for on touch screens, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8). Starter helper `.vy-tap`, advice in recipes 4, 6 and 7, and a console snippet that measures it.
  - New reference `references/verification.md` that keeps static checks and real browser tests apart, with manual browser steps and an accordion test.
  - `motion-lint.mjs` has five new static rules (ML010 scroll listeners, ML011 hover movement on touch screens, ML012 tiny controls, ML013 `aria-expanded` wiring, ML014 content hidden without a script gate), now also reads `.js` files and inline scripts, and says in every run that it is a static check and opened no browser.
  - The example site follows the new tap-target and accordion rules.
  - Simulated tests (a fake page, not a browser) for the accordion logic of the recipe and of the example, and static tests for the tap-target rule.

### Changed
- `bench/README.md` now reports the one-run pilot honestly and keeps it apart from the planned three-repeat benchmark.
- `ROADMAP.md` links to the pilot report and labels it as one run per condition with known confounds.
- Measuring script (pilot harness version 3): real hover test, a stronger scripts-off check, an accordion test, and no machine paths in result files. Version 2, which produced the first results, is kept in `archive/`.
- Public experiment files no longer contain personal Windows paths or user names. Screenshots were reduced to four representative, smaller images.

### Fixed
- `integrations/README.md` wrongly said the Claude Code program was not installed on the test PC. It is installed (version 2.1.322) but is not on the PATH. The page now separates "installed" from "on the PATH".
- The skill validator now follows links (symlinks and Windows junctions) when listing skills, so it can check folders made by `npx skills add` in its default mode.
