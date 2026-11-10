# Roadmap

This roadmap shows intent, not promises. Dates depend on testing results.

## v0.1 (in progress)

Goal: five good, tested skills (one per pillar), one working audit script, and a small honest benchmark.

| Pillar | Skill | Status |
|---|---|---|
| Design | `vyson-brief-to-direction` | Planned |
| Motion | `vyson-css-motion` | Written and improved after review (pilot skill). One exploratory with/without run exists: **1 run per condition, with known confounds**, so it is an anecdote and **proves nothing about effectiveness**. See the [pilot experiment report](bench/experiments/css-motion-pilot-001/README.md). |
| 3D | `vyson-three-foundations` | Planned |
| Frontend | `vyson-responsive-layouts` | Planned |
| Quality | `vyson-site-audit-report` | Planned |

### Seven-day plan

| Day | Goal | Status |
|---|---|---|
| 1 | Foundation: structure, README, contribution files, license manifest, skill template | Done, awaiting review |
| 2 | Tooling: skill validator, test of the `npx skills add` install from this repo | Done, awaiting review |
| 3 | Pilot skill end to end: `vyson-css-motion` with example, eval file, recorded with/without run | Skill, example, eval file and local install tests done and reviewed. The with/without run was done **once per condition** as an exploratory pilot ([report](bench/experiments/css-motion-pilot-001/README.md)). Known confounds: the "without" agent still saw this repository's `AGENTS.md` motion rules, and the skill was supplied through the prompt, not discovered by Cursor itself. Result: not proof of effectiveness. A controlled three-repeat experiment is planned and **not started** ([plan](bench/experiments/css-motion-repeat-plan.md)). |
| 4 | `vyson-brief-to-direction` and `vyson-responsive-layouts` | Not started |
| 5 | `vyson-three-foundations` with example and fallback | Not started |
| 6 | `vyson-site-audit-report` and its audit script | Not started |
| 7 | Release: install guides tested on Cursor, Claude Code and Codex, benchmark v0, tag `v0.1.0` | Not started |

If a day reveals a problem in the process, we fix the process before building more skills.

## v1.0 target: 15 skills

| Pillar | Additional skills planned |
|---|---|
| Design | `vyson-premium-sites` (vertical playbooks), `vyson-conversion-landing` |
| Motion | `vyson-gsap-scroll`, `vyson-cinematic-transitions` |
| 3D | `vyson-product-3d-viewer`, `vyson-3d-performance-fallbacks` |
| Frontend | `vyson-nextjs-marketing-site`, `vyson-design-tokens` |
| Quality | `vyson-accessibility-audit`, `vyson-performance-seo-audit` |

## Later (not scheduled)

- Reference-image analysis with a built-in originality check (v1.1 candidate).
- Plugin manifests for agent marketplaces.
- Documentation website with live previews.
- Before-and-after gallery generated from real benchmark runs.

## Deliberately not planned

- Our own installer command, background hooks, or telemetry (extra maintenance and trust risk).
- A general component library (other projects already do this well).
