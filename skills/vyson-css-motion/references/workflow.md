# Workflow, defaults and hand-off

How to run this skill in one pass, add polished and accessible motion to an existing site, and leave nothing that fights the design, the features or the 3D scene.

Contents: the five phases, decisions you make alone, when you are really blocked, safeguards, wiring per stack, the hand-off section, a worked example.

## The five phases

| Phase | What you do |
|---|---|
| Understand | Read the main CSS, the markup, any existing motion (search for `transition`, `animation`, `@keyframes`, `prefers-reduced-motion`, scroll listeners, animation libraries) and `VYSON-NOTES.md`. |
| Plan internally | Choose 3 to 5 moments, each with a purpose (orient, give feedback, explain a change, add a little personality). Choose the tone from the design direction. |
| Implement | Tokens first, then the CSS for each moment inside the `no-preference` query, then the one small script if a reveal or accordion needs it. |
| Verify | `motion-lint.mjs`, then the browser tests from the verification reference if a browser is available: reduced motion, scripts blocked, phone width, tap targets, keyboard. Fix, then re-run. |
| Present | The report from step 8 of `SKILL.md`, plus the hand-off section. |

## Decisions you make alone

Never ask the user about these. Choose, say so in the report, and move on.

| Decision | Default rule |
|---|---|
| Tone | From the "Design" section: Quiet luxury and Editorial are slow and small (400 to 600ms, short travel). Technical and precise is quick and exact. Warm and crafted is soft. Bold and graphic and Playful modern may use a firmer ease and a small lift, still inside the budget. No direction given: calm. |
| Moments | One page-load entrance for the hero, one scroll reveal pattern for the sections below the first screen, press and hover feedback for buttons and links, one open and close for any accordion or menu, and at most one extra (a card lift or a page transition). |
| Triggers | The table in `SKILL.md` step 3. Prefer the script-free recipes where support is likely and the plain script recipe where it is not. |
| Selectors | The project's real class names from the hand-off. Add the `vy-` classes only where nothing fits. |
| Existing motion | Keep what already works and follows the rules. Fix what breaks them (a layout-property transition, a missing reduced-motion block). Do not stack a second effect on the same element. |
| Library | None. If the need is beyond CSS, build the CSS version and say what a library could add. |

## When you are really blocked

You are blocked only when there is no page to add motion to. Ask one short question. Otherwise build and report.

## Safeguards (these still apply)

- Do not commit, push, deploy or publish.
- Do not delete or replace files that hold the user's work. Edit in place; keep the diff small.
- Do not add an animation library.
- Do not animate or restyle the 3D scene, its canvas or its controls, or anything the hand-off lists as off limits.
- Do not hide content in normal CSS. The hidden state exists only inside the motion queries.

## Wiring per stack

The CSS works in every stack. Only the small script differs.

| Stack | CSS | Reveal or accordion script |
|---|---|---|
| Plain HTML | `motion-base.css` linked before the page CSS | A module in `scripts/` that runs once |
| React with Vite | Import the CSS once in `src/main.jsx` | A small hook that runs the observer in `useEffect`, disconnects it in the cleanup, and re-runs when the list of items changes |
| Next.js | Import the CSS in the root layout | A client component (`'use client'`) with the same hook. Server-rendered HTML keeps everything visible until the script runs |
| Vue with Vite | Import in `src/main.js` | Start the observer in `onMounted` and disconnect it in `onBeforeUnmount` |
| Nuxt | List the file under `css` in `nuxt.config` | A client-only plugin or component |

Recipe 9 (`@view-transition`) is for ordinary page-to-page navigation. In a single-page app the router handles navigation, so skip it unless the framework documents support. Check the installed version's documentation.

## The hand-off section

Everything the later steps need goes into one file at the project root, `VYSON-NOTES.md`. Create it if it is missing. Edit only your own section. Never delete another skill's section.

```markdown
## Motion (vyson-css-motion)
- Tone: <calm | lively | other> and why.
- Moments: <one line each: where, what, why>.
- Files: <CSS and script paths>. Classes: <list>.
- Reduced motion: <what is removed, what stays>.
- Left alone on purpose: <3D container, elements named in the hand-off>.
- Not tested: <list, usually real phone, Firefox, Safari, screen reader>
```

If the user wants no extra files, put the same text in the report.

## Worked example

This is an invented walk-through of the method, not a record of a real run.

Request: "Add motion to the Fieldwork ceramics site." Steps 1 to 3 left a plain HTML site, tokens, a working menu and form, and a 3D vessel in `#vessel-stage`.

- Understand: no existing motion. The direction is Warm and crafted, so the tone is soft.
- Plan: (1) hero text rises in; (2) sections below the first screen fade in once as they enter; (3) buttons and cards respond to hover and press, hover only on devices that hover; (4) the FAQ panels open and close, one at a time; (5) the menu opens with a short fade. Nothing touches `#vessel-stage`.
- Implement: `styles/motion.css` from the starter file, `scripts/reveal.js` from recipe 2, an accordion script from recipe 7. All movement sits inside `prefers-reduced-motion: no-preference`.
- Verify: `motion-lint.mjs` reports no FAIL lines; with reduced motion on, every heading, card and answer is visible and nothing moves; with scripts blocked, the first screen and the FAQ answers are readable; tap targets measured on a narrow window.
- Present: the five moments, the budget, the static result, the browser steps run and not run, and the hand-off section.
