---
name: vyson-website-quality-engineering
description: Audits and fixes a finished website before launch. Runs a static audit of the built files (broken links and files, language, viewport, titles, headings, alt text, labels, focus outlines, heavy files, third-party requests), runs a real headless-browser check (sideways scrolling, tap-target sizes, keyboard focus, reduced motion, console errors, layout shift), and turns the findings into a fix list and an honest report that separates what was tested from what was not. Use when a user asks for a pre-launch check, a QA or quality review, an accessibility, mobile, performance or SEO check, "is this ready to publish", or to fix problems found by Lighthouse or a similar tool. Not for building or styling pages (use vyson-premium-website-design), animation (use vyson-css-motion), 3D scenes (use vyson-3d-interactive-web) or writing app logic (use vyson-frontend-development).
license: MIT
metadata:
  vyson-pillar: "quality"
  vyson-version: "0.1.0"
  vyson-status: "draft"
---

# VYSON Website Quality Engineering

Helps an AI coding agent check a website before it goes live, fix what it finds, and report honestly. The idea: a launch check is a list of things that were looked at, not a feeling. Every claim in the report says how it was found out (static check, browser test, or reading the code), and every gap is named.

Detail lives in four reference files and two bundled tools. Read them when the steps tell you to.

## When to use

- "Is this site ready to launch?" "Do a pre-launch check." "QA this."
- "Check it on mobile." "Is this accessible?" "Check the SEO basics."
- "Lighthouse (or another tool) says the page has problems. Fix them."
- "Write a launch checklist for this project." "Set up a check we can re-run before each release."

## When not to use

- **Building or restyling pages.** Layout, type, colour and imagery: use `vyson-premium-website-design` if it is installed. This skill checks a result; it does not design one.
- **Animation.** Writing or tuning CSS motion: use `vyson-css-motion` if it is installed. This skill only reports that motion ignores `prefers-reduced-motion`, and passes the fix to that skill.
- **3D and canvas.** Scene performance and fallbacks: use `vyson-3d-interactive-web` if it is installed.
- **App logic.** Forms, data fetching, state and framework wiring: use `vyson-frontend-development` if it is installed. This skill reports a broken form; it does not rebuild the data layer.
- **Penetration testing, load testing, legal advice.** Say plainly that these are out of scope. This skill does not certify compliance with any law or standard.

## The quality contract

A launch check is finished only when all four are true.

- **Everything was looked at the right way.** Files were audited statically, and the page was opened in a real browser at phone and desktop widths. A check that was not run is listed as "not performed", never skipped silently.
- **Findings are specific and fixable.** Each one has a file and line (or a width and an element), a plain reason and a fix. Errors are fixed, or stay open in the report with a reason and a "not ready" or "ready with known problems" decision. Warnings are fixed or explained.
- **Results are re-run after fixes.** The same tools run again and the new result is reported next to the old one.
- **The report does not claim more than was tested.** "Passes the VYSON static audit and one headless Chrome run on Windows" is a claim. "Accessible", "fast" and "works on all devices" are not.

The numbers in this skill are VYSON defaults, not measured results (file-size limits, widths, tap-target sizes). The Core Web Vitals thresholds are Google's published values for field data. A lab run on one computer is not field data.

## How this skill runs

Default: **understand, plan internally, implement, verify, present.** When the user asks for a quality pass, run the checks, fix what is safe to fix, re-run, and report, all in one pass. Do not stop after a list of findings, and do not ask the user to approve each fix.

- **Your lane.** Verify responsive behaviour, accessibility, functionality, performance risks and code quality of the whole site, fix safe issues in place, and report everything that could not be verified. Default mode is check-and-fix, unless the user said check-only.
- **Safe fixes you make alone:** missing `lang`, viewport, titles, alt text, labels, broken links and file names, focus styles, tap-target sizes, sideways scrolling, missing reduced-motion blocks, console errors from a clear bug, oversized images you can safely resize or compress. **Do not change on your own:** copy, the design direction, features, or add dependencies. Report those with a suggested fix, and hand design, behaviour, 3D and motion problems to the matching VYSON skill if it is installed.
- **Read first.** `package.json` (build and dev commands), the build output folder, and `VYSON-NOTES.md` if it exists: it lists what the earlier steps built and did not test.
- **Ask only when blocked**, meaning there is nothing to check (no site, no way to build it). One short question. Otherwise choose a default and list it in the report.
- **Ask first only for** committing, pushing, deploying or publishing, deleting or replacing important user files, real form submissions, and changing the project's build or security configuration.

Defaults, build output per stack, the whole-site pass, the hand-off format and a worked example: [workflow.md](references/workflow.md). The one-paste prompt for this skill: [prompt.md](references/prompt.md).

## Before you start

Find out from the project, and read its files. Ask nothing unless you are blocked (see above).

1. **What is being checked?** A folder of built files (the folder you would upload), a dev server, or a live address. If the project has a build command, run it first and check its output folder.
2. **What is the launch bar?** Default: no audit errors, no browser-check errors, warnings fixed or explained.
3. **What can you not test?** No browser installed, no real phone, no internet. Note it now so the report can say so.
4. **What changes are you allowed to make?** Default: check-and-fix as described above, listing every change.

## Steps

### 1. Plan the check

Read [quality-plan.md](references/quality-plan.md). Decide the pages to check, the widths (default 320, 390, 768, 1280, 1440) and the order: static audit, browser check, manual checks, then fixes and a re-run. For a site with many pages, audit the whole folder statically and browser-check the home page and one page of each kind.

### 2. Run the static audit

```powershell
node skills/vyson-website-quality-engineering/scripts/site-audit.mjs path/to/built-site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-website-quality-engineering/scripts/site-audit.mjs`). Point it at the folder you would upload, such as `dist/`, not at the source folder of a framework. Each finding has a code (QA001 to QA028), a file and line, and a fix. The table is in [tools-and-automation.md](references/tools-and-automation.md).

**This is a static check.** It reads files. It never opens a browser, measures speed or contacts the internet, so it cannot say whether the page looks right or is accessible to a person.

Then run the checkers of the other VYSON skills that are installed in the same skills folder as this one (`design-lint.mjs`, `frontend-lint.mjs`, `3d-lint.mjs`, `motion-lint.mjs`, each in its own skill's `scripts/` folder). Point them at the folder with the site's HTML, CSS and JavaScript. They are static checks too; report them in the static list, and say "not run" for any skill that is not installed. Commands are in [workflow.md](references/workflow.md).

### 3. Run the browser check

```powershell
node skills/vyson-website-quality-engineering/scripts/browser-check.mjs path/to/built-site
```

It finds Chrome or Edge on the computer, serves the folder on `127.0.0.1` only, opens the page at each width, and reports sideways scrolling, tap-target sizes, small text, broken images, console errors, failed requests, layout shift, keyboard focus (a Tab-key walk), reduced-motion behaviour and requests to other websites. Add `--page about.html` for another page, `--screenshots folder` to save pictures, and `--widths` to change widths. If no browser is found, it says so; then write "browser test: not performed".

**This is one headless run on one computer.** It is not a phone, not Firefox or Safari, not a screen reader, and not field data.

### 4. Do the checks a tool cannot do

Go through [accessibility-checks.md](references/accessibility-checks.md): keyboard use by hand, zoom to 200 percent, headings and link text read in order, colour contrast, forms and errors, motion. Then [performance-and-seo.md](references/performance-and-seo.md): lab and field numbers, Lighthouse if the user has it, search basics and sharing previews. Also try the site's functions: every navigation link, the menu, each form with valid and invalid input (a demo form must not send real data), dialogs, tabs and accordions. Mark each item "done by hand", "tool", or "not performed".

### 5. Sort and fix the findings

Fix errors first, then warnings. Group repeated findings (one missing `lang` is one fix for the whole site). Change as little as needed: do not rewrite copy, change the design direction or add dependencies to satisfy a warning. If a finding is a false alarm, say why in the report, and use a short comment in the code only where the tool supports it. When a fix belongs to another discipline, make the smallest safe change or hand it over (for example, a motion fix goes to the motion skill).

### 6. Re-run and report

Run both tools again. Report as in [quality-plan.md](references/quality-plan.md): the launch decision, the result of each tool before and after, what was fixed, what remains and why, and what was **not** tested. Keep three separate lists: static audit, browser test, manual checks. Paste the last `RESULT` line of each tool.

## Common mistakes

| Mistake | Why it hurts | Instead |
|---|---|---|
| Treating a clean static audit as "ready" | It never ran the page | Run the browser check and the manual checks too |
| Auditing the source folder of a framework | Build output is what visitors get | Build first, then audit the output folder |
| Calling a Lighthouse score "accessible" | Automated tools find only part of the problems | Say what was checked and what needs a person |
| Fixing warnings by adding hacks | The finding goes away, the problem stays | Fix the cause, or explain the warning |
| Checking only the home page | Other pages often have the broken links and missing labels | Audit the whole folder; browser-check each page type |
| Testing at one width | Sideways scrolling and tiny tap targets show only on phones | Use 320 and 390 as well as desktop |
| Quoting lab numbers as real-user speed | One run on one computer is not field data | Say "lab, one run" and name the computer |
| "Works on mobile" from a desktop browser | A narrow window is not a phone | Say which devices were tested, or "no real phone" |

## Output

- A short launch report (see step 6) in plain language, with the decision first.
- Fixes made in the project files, listed one by one.
- The commands to re-run the two checks, written in the report. Add them as `package.json` scripts only if the user asked for that.
- The "Quality" section of `VYSON-NOTES.md` (the hand-off).
- No remote scripts and no telemetry. No dependency added without telling the user. The bundled tools use only what is built into Node.js.

## Acceptance checks

The work is finished only when all of these are true:

- [ ] The static audit ran on the folder that would be uploaded, and its last `RESULT` line is in the report.
- [ ] The browser check ran at 320, 390, 768 and a desktop width, or "browser test: not performed" is in the report with the reason.
- [ ] Safe issues were fixed in the project (not only listed), and no approval was requested for fixes the skill could make safely.
- [ ] Every audit and browser error is fixed, or stays open in the report with a reason and a matching launch decision.
- [ ] Every warning is fixed or explained.
- [ ] Both tools were re-run after the fixes, and before and after results are reported.
- [ ] Keyboard use, 200 percent zoom, link and heading reading order and colour contrast were checked by hand, or listed as not performed.
- [ ] The report keeps static audit, browser test and manual checks in three lists, and names what was not tested (real phone, other browsers, screen reader, field data).
- [ ] Nothing in the report claims compliance, accessibility or speed that was not measured.
- [ ] No design or copy was changed to satisfy a tool. Such findings are listed with a suggested fix.
- [ ] The checkers of the other installed VYSON skills were run and reported in the static list, or "not run" is stated for each.

## Accessibility

This skill checks accessibility but cannot certify it. Automated checks find a minority of problems. The tools here cover language, names, labels, alt text, focus visibility, tap-target size (WCAG 2.2 level AA, SC 2.5.8: never under 24 by 24 CSS pixels, aim for 44 by 44) and reduced motion. A person still has to check the keyboard path, the reading order, contrast in context, error messages and anything a screen reader says. Say so in the report.

## References

Load these only when needed. They are one level deep and do not link to each other.

- [workflow.md](references/workflow.md): defaults to decide alone, when you are blocked, safeguards, build output per stack, the whole-site pass, the hand-off section, a worked example.
- [prompt.md](references/prompt.md): the single prompt a user pastes to run this skill.
- [quality-plan.md](references/quality-plan.md): what to check and in what order, the launch bar, the report template.
- [accessibility-checks.md](references/accessibility-checks.md): what the tools cover, and the manual checks (keyboard, zoom, reading order, contrast, forms, motion).
- [performance-and-seo.md](references/performance-and-seo.md): Core Web Vitals thresholds, lab versus field, page weight, search basics, link previews, third parties.
- [tools-and-automation.md](references/tools-and-automation.md): the two bundled tools (rule tables QA001 to QA028 and BC001 to BC014), optional tools (Lighthouse, Playwright, axe-core) and how to re-run checks in CI.
- [scripts/site-audit.mjs](scripts/site-audit.mjs): the static audit (28 rules, QA001 to QA028). Needs Node.js 22 or newer, no installation.
- [scripts/browser-check.mjs](scripts/browser-check.mjs): the headless Chrome or Edge check (14 rules, BC001 to BC014). Needs Node.js 22 or newer and a Chrome or Edge on the computer. No installation, no downloads.

## Licensing notes

This skill includes no third-party code. It mentions Lighthouse (Apache-2.0), Playwright (Apache-2.0) and axe-core (MPL-2.0) as optional tools the user may run; their licences are recorded in the project's THIRD_PARTY.md and must be re-checked before use. The Core Web Vitals thresholds come from web.dev (read on 11 November 2026) and WCAG 2.2 from the W3C. The browser check launches a Chrome or Edge that is already installed; it does not bundle or download one.
