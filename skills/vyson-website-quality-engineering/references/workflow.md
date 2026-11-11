# Workflow, defaults and hand-off

How to run this skill in one pass: build, check the whole site, fix what is safe, re-run, and report honestly. This is the last of the five VYSON steps, so it also checks that the earlier steps work together.

Contents: the five phases, decisions you make alone, when you are really blocked, safeguards, build output per stack, the whole-site pass, the hand-off section, a worked example.

## The five phases

| Phase | What you do |
|---|---|
| Understand | Read `package.json`, find the build command and the output folder, read `VYSON-NOTES.md` (what each earlier step built and did not test). |
| Plan internally | Pages to check, widths (320, 390, 768, 1280, 1440), order: build, static audit, browser check, hand checks, fixes, re-run. |
| Implement | Run the checks, then fix the safe findings in place, grouped by cause. |
| Verify | Run both tools again and compare before and after. |
| Present | The launch report from the quality-plan reference, plus the hand-off section. |

## Decisions you make alone

Never ask the user about these. Choose, say so in the report, and move on.

| Decision | Default rule |
|---|---|
| What to check | The production build output. Run the project's build command first. For plain HTML, the site folder itself. |
| Mode | Check-and-fix, unless the user said check-only. |
| Pages | The whole folder statically. The home page and one page of each kind in the browser. |
| Launch decision | "Ready", "Ready with known problems" (listed) or "Not ready". Never "Ready" with an unlisted error. |
| What to fix | The safe list in `SKILL.md`. Everything else is reported with a suggested fix and, where it belongs to another discipline, handed to that VYSON skill. |
| Optional tools | Use Lighthouse, axe-core or Playwright only if the project already has them. Otherwise name them as a next step. |

## When you are really blocked

You are blocked only when there is nothing to check: no site, and no way to build one. Ask one short question. If there is no browser on the computer, that is not a blocker: do the static checks and hand checks, and write "browser test: not performed".

## Safeguards (these still apply)

- Do not commit, push, deploy or publish.
- Do not delete or replace files that hold the user's work. Fix in place with small changes and list every change.
- Do not submit a real form or send real data while testing. Use the demo stub or stop at the submit button.
- Do not change copy, the design direction, features, build configuration or security settings to satisfy a tool.
- Do not point the browser check at a site you do not own.

## Build output per stack

Point the audit at the folder you would upload, not the source folder.

| Stack | Build and output |
|---|---|
| Plain HTML | The site folder itself. |
| Vite (React or Vue) | `npm run build`, output `dist/` (check `package.json` and the Vite config for a different name). |
| Nuxt | `npx nuxt generate`, output `.output/public` in Nuxt 3. |
| Next.js | Only a project set to static export (`output: 'export'`) writes a folder, usually `out/`. Do not change `next.config` to get one. If it is not a static export, run the production server with the project's `build` and `start` scripts, and give the browser check the address (`http://127.0.0.1:3000`). The static audit then cannot run on a folder: write "static audit: not performed" and say why. |

Check the framework's current documentation for the installed version's output folder.

## The whole-site pass

Run these in addition to the two bundled tools. The sibling checkers are static checks; list them with the static audit. Replace `<skills>` with the folder that holds the installed VYSON skills (for example `.cursor/skills`), and `<site>` with the folder to check (the source folder for a framework project, the site folder for plain HTML).

```powershell
node <skills>/vyson-premium-website-design/scripts/design-lint.mjs <site>
node <skills>/vyson-frontend-development/scripts/frontend-lint.mjs <site>
node <skills>/vyson-3d-interactive-web/scripts/3d-lint.mjs <site>
node <skills>/vyson-css-motion/scripts/motion-lint.mjs <site>
```

Skip a line, and say "not run", if that skill is not installed. A `FAIL` in a sibling checker that is not a safe fix goes in the report and to that skill.

Then check that the five steps fit together. Each line is a hand check; mark it done, or not performed:

| Question | How to check |
|---|---|
| Does the design hold on every page? | One set of tokens is used; no page has a different look. |
| Does every function work? | Each navigation link, the menu, each form with valid and invalid input (demo stub only), dialogs, tabs, accordions. |
| Does the 3D or interactive visual have its fallback? | Block WebGL and confirm the still image and message appear; the page still reads without it. |
| Does motion respect the preference? | Emulate reduced motion: nothing moves by itself, nothing is hidden. Block scripts: the first screen and the answers are readable. |
| Does it work on a narrow screen? | 320 and 390 wide: no sideways scrolling, tap targets of at least 44 by 44 where possible (never under 24 by 24). |
| Are there console errors? | Load each page type and read the console. |
| Is anything heavy? | Largest images and scripts from the audit; the 3D budget from the hand-off. |

## The hand-off section

Write your result into one file at the project root, `VYSON-NOTES.md`. Create it if it is missing. Edit only your own section. Never delete another skill's section.

```markdown
## Quality (vyson-website-quality-engineering)
- Launch decision: <ready | ready with known problems | not ready>
- Static results (before and after): <tool, last RESULT line>
- Browser results (before and after): <tool, browser, widths>
- Fixed: <list>. Open: <list with reasons>. Handed to another skill: <list>.
- Not tested: <real phone, other browsers, screen reader, field data, others>
```

If the user wants no extra files, put the same text in the report.

## Worked example

This is an invented walk-through of the method, not a record of a real run.

Request: "Final quality pass on the Fieldwork ceramics site." Steps 1 to 4 left a plain HTML site with three pages.

- Understand: plain HTML, no build step. `VYSON-NOTES.md` lists the 3D container and the five motion moments.
- Plan: audit the folder; browser-check the home page and the shop page at the five widths.
- Implement: the static audit reports a missing `lang` on one page, two images without `alt`, and a footer link that points to a missing file. The browser check reports a menu button 36 pixels high at 390 wide. All five are safe fixes and are made in place.
- Verify: both tools re-run and report no errors. The four sibling checkers run with no FAIL lines. Hand checks: keyboard path, WebGL blocked, reduced motion and scripts blocked.
- Present: "Ready with known problems": no real phone was used, only Chrome was tested, and the contrast of one photo caption needs a person's judgement. Hand-off section written.
