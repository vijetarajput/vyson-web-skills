# Roadmap

This roadmap shows intent, not promises. Dates depend on testing results.

## v0.1 (Beta: pushed to `main`, not tagged)

State on 12 November 2026: all five skills are written, pass `npm run check`, and install from the public GitHub repository with `--skill '*'` (file placement only). Decision 14 makes every skill run in one pass (understand, plan internally, implement, verify, present) and adds one prompt per skill ([`docs/five-prompts.md`](docs/five-prompts.md)). **Next milestone:** an end-to-end validation, pasting the five prompts in order into a fresh dummy project. It has **not been run**, so the five-prompt workflow is untested. Feature development is paused until it is done. **Not verified:** any agent loading or following a skill, running the eval files with an agent, browsers other than headless Chrome 157 on one Windows 10 PC, real phones and GPUs, installing each newer skill on its own from GitHub, `skills update`, and independent external testing.

Goal: five good, tested skills (one per pillar), one working audit script, and a small honest benchmark.

| Pillar | Skill | Status |
|---|---|---|
| Design | `vyson-premium-website-design` | Draft written (direction note, layout, type, colour, imagery, responsive design, details, checker, example and eval file). **Not tested with an agent**, so it proves nothing about effectiveness yet. It replaces the earlier planned `vyson-brief-to-direction`: that idea is covered by steps 1 to 3 of the new skill. Revisit if a separate brief-writing skill turns out to be needed. |
| Motion | `vyson-css-motion` | Written and improved after review (pilot skill). One exploratory with/without run exists: **1 run per condition, with known confounds**, so it is an anecdote and **proves nothing about effectiveness**. See the [pilot experiment report](bench/experiments/css-motion-pilot-001/README.md). |
| 3D | `vyson-3d-interactive-web` | Draft written (decide whether 3D is worth it, approach choice, a starter stage file, a local server, a static checker, an example and an eval file). The example was checked in headless Chrome with software-rendered WebGL only. **Not tested with an agent, on a real GPU or on a phone.** It replaces the earlier planned `vyson-three-foundations`. |
| Frontend | `vyson-frontend-development` | Draft written (HTML first, forms, data states, widgets, safe DOM updates, two helper modules, a React hook and a Vue composable checked in Node only, a static checker, an example and an eval file). **Not tested with an agent.** It replaces the earlier planned `vyson-responsive-layouts`: responsive layout is covered by the design skill, and behaviour was the larger gap. |
| Quality | `vyson-website-quality-engineering` | Draft written (a static site audit, a real-browser check, a report method, an example with saved before and after output, and an eval file). **Not tested with an agent**, and the tools were run on one Windows PC with headless Chrome only. It replaces the earlier planned `vyson-site-audit-report`. |

### Seven-day plan

| Day | Goal | Status |
|---|---|---|
| 1 | Foundation: structure, README, contribution files, license manifest, skill template | Done, awaiting review |
| 2 | Tooling: skill validator, test of the `npx skills add` install from this repo | Done, awaiting review |
| 3 | Pilot skill end to end: `vyson-css-motion` with example, eval file, recorded with/without run | Skill, example, eval file and local install tests done and reviewed. The with/without run was done **once per condition** as an exploratory pilot ([report](bench/experiments/css-motion-pilot-001/README.md)). Known confounds: the "without" agent still saw this repository's `AGENTS.md` motion rules, and the skill was supplied through the prompt, not discovered by Cursor itself. Result: not proof of effectiveness. A controlled three-repeat experiment is planned and **not started** ([plan](bench/experiments/css-motion-repeat-plan.md)). |
| 4 | The design skill | `vyson-premium-website-design` written as a draft, awaiting review. |
| 5 | The 3D skill with example and fallback | `vyson-3d-interactive-web` written as a draft with an example, awaiting review. |
| 6 | The frontend and quality skills, and the audit tools | `vyson-frontend-development` and `vyson-website-quality-engineering` (with `site-audit.mjs` and `browser-check.mjs`) written as drafts with examples, awaiting review. |
| 7 | Release: install guides tested on Cursor, Claude Code and Codex, benchmark v0, tag `v0.1.0` | Not started. Open items: run the eval files and the benchmark with agents, check that each agent loads the skills, tag the release, and test `skills update`. (Installing all five skills from GitHub was tested after the beta push.) |

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

- Background hooks or telemetry.
- A large package-manager-style installer. v0.1 ships only a small local copier (`tools/install-skills.mjs`) that writes to documented agent folders (decision 13).
- A general component library (other projects already do this well).
