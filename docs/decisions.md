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

## Defaults adopted from the proposal (change only on request)

| Topic | Default |
|---|---|
| Skill folder layout | Flat: `skills/vyson-<name>/` |
| Skill name prefix | `vyson-` |
| Script language | Node.js (`.mjs`), few dependencies |
| Example websites | Plain HTML/CSS/JS first; Vite for 3D examples |
| Versioning | One repository version (SemVer), with a version in each skill's `metadata` |
| Contribution legal model | MIT plus an originality statement in the pull request template. No CLA. |
| Documentation | Markdown in the repository. No documentation website before v1.0. |
| Telemetry, hooks, remote instructions | None |
| Language | English |

## Open items for the maintainer

- A private contact method for the Code of Conduct (see `CODE_OF_CONDUCT.md`).
- Enable GitHub "Private vulnerability reporting" (see `SECURITY.md`).
- Decide whether the copyright holder in `LICENSE` stays as a personal name or moves to an organization later.
- Do a basic name and trademark search for "VYSON" before wide promotion.
