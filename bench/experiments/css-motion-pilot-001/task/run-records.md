# Run records

> **Public copy note:** in this public copy, personal folder paths and agent session ids were replaced by placeholders (for example `<working folder for run 1>`). The original, unedited records are kept privately outside the repository. Nothing else was changed.

Both runs used the same tool (a Cursor `generalPurpose` sub-agent started with the `Task` tool), the same requested model setting (`claude-sonnet-5-5-high`; Cursor does not let us confirm the model that actually ran), the same task text, a fresh session, and an empty working folder outside this repository.

The two prompts are in this folder: [`prompt-run1-without-skill.txt`](prompt-run1-without-skill.txt) and [`prompt-run2-with-skill.txt`](prompt-run2-with-skill.txt). They differ only in (a) the working-folder path and (b) the "AVAILABLE SKILLS" block that run 2 adds. A line-by-line comparison reported 7 differing lines in total.

| | Run 1: WITHOUT skill | Run 2: WITH skill |
|---|---|---|
| Date and time (PC clock) | 2026-11-10, 20:56:20 to 20:58:24 (about 2 min) | 2026-11-10, 20:58:24 to 21:01:39 (about 3 min 15 s) |
| Working folder | an empty folder outside this repository | an empty folder outside this repository, plus the installed skill (see below) |
| Skill available | none | `vyson-css-motion`, installed with the `skills` CLI into `.agents/skills/vyson-css-motion/` inside the working folder, plus an "available skills" block in the prompt that names it and gives the path to its `SKILL.md` |
| Files produced | `index.html`, `styles.css`, `script.js` | `index.html`, `styles.css`, `motion.css`, `script.js` |
| Agent opened a browser | No (self-reported) | No: its browser tool refused `file://` addresses (self-reported) |
| Agent ran any checks | `node --check script.js`, structure checks (self-reported) | The skill's `motion-lint.mjs` (0 errors, 0 warnings), a syntax check, a link and `aria-controls` check, and searches for `transition: all`, scroll listeners and `http` (self-reported) |
| Repository touched by the agent | No (all 81 repository files had the same SHA-256 before and after each run) | No (same check) |
| Installed skill identical to the repository copy | not applicable | Yes (6 files, SHA-256 match) |

## What each agent said it could see at the start (self-reports, not verifiable)
- **Run 1** said it saw this repository's `AGENTS.md` and the session's list of Cursor skills, and that it followed `AGENTS.md`'s motion guidance (reduced-motion behaviour, a mobile fallback, light animation). It used none of the listed skills.
- **Run 2** said the only skill visible was `vyson-css-motion`, and that apart from that it looked only in its working folder. It did not mention `AGENTS.md`. We cannot tell whether that means `AGENTS.md` was not visible to it or only that it did not mention it. The two self-reports differ, and that difference is itself uncertain.

## Evidence that run 2 really used the skill
- Its output contains class names and variables that exist because of the skill's recipes (`vy-enter`, `vy-reveal`, `vy-link`, `--vy-i`, `--vy-duration-*`). The run 1 output contains none of them.
- Its output has no mention of the example's text ("Northlight") and no copied example file. Run 1 has none either.
- Run 2 wrote its own `motion.css` rather than copying the skill's `motion-base.css`, so it adapted the skill instead of copying it.

## Run 2 final reply (condensed from the agent's own words)
It listed four files; said the hero label, headline, sentence and button fade and rise in turn in about a second; scroll reveals run once for headings, 6 cards, 4 steps, the FAQ list and the contact block; buttons shrink slightly when pressed; cards lift 4px on hover-capable devices only; the FAQ answers open with a 240 ms slide with the plus icon turning into a cross; with reduced motion nothing slides and only short colour changes remain; if the script fails all content is visible; on phones travel distance and stagger are shorter. It said it had **not** seen the page rendered, tested smoothness, tested reduced-motion emulation, tried a phone or other browsers, or checked focus appearance.

## Run 1 final reply (paraphrase)
It listed the three files; described hero stagger, scroll reveals, hover and press feedback, a smooth FAQ open, a mobile menu, reduced-motion handling, hover lifts switched off on touch devices, and a no-JavaScript fallback; and said it verified only the script's syntax and the page structure and never opened a browser.
