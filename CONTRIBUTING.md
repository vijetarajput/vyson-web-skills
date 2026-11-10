# Contributing to VYSON Web Skills

Thank you for helping. This guide explains how to propose and add a skill. You do not need to be an expert programmer: most skills are written in Markdown.

## Ground rules

1. **Original work only.** Write skill text, examples, and code yourself. Do not copy text, code, images, or structure from other skill repositories, component libraries, or websites. Use other work only as inspiration for *ideas*.
2. **License-compatible only.** Everything you submit must be your own work, or released under a license compatible with MIT with the required attribution kept. If you are not sure, ask first.
3. **Declare libraries.** If a skill recommends a library, add it to [THIRD_PARTY.md](THIRD_PARTY.md) with its license. Check the license yourself on the project's official page or npm listing. Do not add libraries with unknown or restrictive licenses. Do not copy a library's own files into this repository.
4. **No invented results.** Do not claim a skill improves anything unless you measured it and can show how. Benchmark results go in `bench/results/` with raw data.
5. **No remote instructions.** A skill must not tell the agent to download its rules from a URL at run time. Put the content in the skill.
6. **Be kind.** See the [Code of Conduct](CODE_OF_CONDUCT.md).

## What a skill must have

A skill lives in `skills/<skill-name>/` and follows the [Agent Skills specification](https://agentskills.io/specification).

| Requirement | Detail |
|---|---|
| Folder name | Lowercase letters, numbers and single hyphens. Starts with `vyson-`. Maximum 64 characters. Must match `name` in `SKILL.md`. |
| `SKILL.md` | Required. Starts with a header containing `name` and `description`. Under 500 lines. |
| `description` | Says what the skill does **and when to use it**, with words a user might actually say. Maximum 1024 characters. |
| Detail files | Longer material goes in `references/`, linked directly from `SKILL.md` (one level deep). |
| Scripts | Optional, in `scripts/`. Small, readable, with clear error messages. Same input must give the same output. |
| Example | A folder in `examples/<skill-name>/` with the exact prompt and the result, plus a preview image. |
| Eval file | `evals/<skill-name>/evals.json`: test prompts, including one where the skill should **not** activate. |
| Motion and 3D skills | Must state the performance budget, `prefers-reduced-motion` behavior, and mobile fallback. |
| Accessibility | Output the skill produces must be keyboard-usable and have text alternatives. |

Start from [`templates/skill-template/`](templates/skill-template/).

## How to contribute, step by step

1. **Open an issue first** using the "Skill idea" form. We will confirm it fits the five pillars and does not duplicate an existing skill.
2. **Fork** the repository and create a branch, for example `skill/vyson-css-motion`.
3. **Copy the template** and fill it in. Keep instructions specific and practical.
4. **Add the example and the eval file.**
5. **Run the checks:** `npm run check` (needs Node.js 22 or newer, nothing to install). Fix every error it reports; each one comes with a plain-English "How to fix" line. Details: [tools/README.md](tools/README.md). Then review your work against the pull request checklist.
6. **Open a pull request** using the template. Describe how you tested the skill.

## Commit messages

Use a short prefix so the history is easy to read:

`feat(skill-name): ...`, `fix(skill-name): ...`, `docs: ...`, `chore: ...`, `test: ...`

Example: `feat(vyson-css-motion): add scroll-driven reveal guidance`

## Review

We review for: originality, clarity, correctness, accessibility, performance honesty, and license safety. We may ask for changes. Maintainers aim to respond within a few days, but this is a volunteer project and timing is not guaranteed.

## Using AI to help you contribute

AI assistance is welcome. You remain responsible for what you submit: you must understand it, have checked that it is original, and have tested it.
