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
