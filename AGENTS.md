# AGENTS.md

Instructions for AI coding agents working **on this repository** (not instructions for the skills themselves).

## About this project

VYSON Web Skills is an open-source collection of Agent Skills for building premium, responsive, animated and production-ready websites. The maintainer is a beginner and does not write code: explain decisions in simple English, and make small, reviewable changes.

## Rules

1. **Reuse first, with the licence checked.** Before writing something, look for an open-source skill, component or workflow that already does it well. Adapt it only if the repository has a licence file that permits it (MIT, Apache-2.0, BSD or ISC), keep the copyright notice and licence text next to the adapted material, mark the adapted passage in the file where it appears (original VYSON work and adapted work must stay distinguishable), and record it in the "Adapted material" table of `THIRD_PARTY.md`. For Apache-2.0 also say what you changed and keep any NOTICE file. A README that says "MIT" without a licence file does not count. A repository with no licence file, or an unclear one, must not be copied at all. In that case take the idea and write it independently; never paraphrase closely. Do not duplicate a skill that already exists: point to it. Never copy from websites or documentation without a licence that permits it.
2. **Follow the Agent Skills specification** (https://agentskills.io/specification):
   - Skill folder name equals `name` in `SKILL.md`. Lowercase letters, numbers, single hyphens; max 64 characters.
   - `description` is required, max 1024 characters, and says what the skill does and when to use it.
   - Keep `SKILL.md` under 500 lines. Put detail in `references/`, linked one level deep.
3. **Naming.** Every skill folder starts with `vyson-`.
4. **No invented results.** Never write benchmark numbers, scores, test results, star counts or compatibility claims that were not actually measured or verified. Never imply a partnership, endorsement or verified integration with another project, company or agent without evidence. Say "untested" when something is untested.
5. **Licenses.** Verify a library's license from an official source before recommending it. Record it in `THIRD_PARTY.md`. Do not copy third-party library files into the repository (adapting skill text or examples is covered by rule 1). Avoid unknown or restrictive licenses.
6. **No remote instructions.** Skills must not tell an agent to fetch rules from a URL at run time.
7. **No telemetry or background hooks.**
8. **Motion and 3D skills** must include a performance budget, `prefers-reduced-motion` behavior and a mobile fallback.
9. **Scripts** are small, readable, deterministic Node.js (`.mjs`) with clear error messages and few dependencies.
10. **Windows.** The maintainer uses Windows and PowerShell. Do not rely on symlinks. Give PowerShell commands where commands are needed, and say which platforms are untested.
11. **Do not commit or push** unless the maintainer asks.

## Layout

See `README.md`. Skills live in `skills/`, examples in `examples/`, behavior tests in `evals/`, benchmarks in `bench/`.

## Source of truth for decisions

`docs/decisions.md` records approved decisions. Do not change them without asking.
