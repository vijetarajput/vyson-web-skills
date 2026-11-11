# Workflow, defaults and hand-off

How to run this skill in one pass, put a purposeful 3D or interactive experience into an existing site, and keep the rest of the site working.

Contents: the five phases, decisions you make alone, when you are really blocked, safeguards, mounting per stack, the hand-off section, a worked example.

## The five phases

| Phase | What you do |
|---|---|
| Understand | Read `package.json`, the page or component that will host the scene, the CSS tokens and `VYSON-NOTES.md` (the "Design" and "Frontend" sections name the scene container and its fallback). |
| Plan internally | Write the scene's job in one line. Choose the lightest approach, the placement and the budget. Decide the fallback rungs. |
| Implement | Page shell and fallback first, then the stage helper, then the scene, then controls and accessibility. |
| Verify | `3d-lint.mjs`, then a browser run if one is available: each fallback rung, reduced motion, phone width. Fix, then re-run. |
| Present | The report from step 9 of `SKILL.md`, plus the hand-off section. |

## Decisions you make alone

Never ask the user about these. Choose, say so in the report, and move on.

| Decision | Default rule |
|---|---|
| Where it goes | Into the container the hand-off names. If none exists, the hero or the first "work", "product" or "feature" section. One scene per page. |
| The job | Product or object: let the visitor turn it and see each part. Brand or studio: a calm, light visual in the hero that echoes the signature move. Data or locations: a small globe or chart. Nothing fits: a simple interactive visual (2D canvas particles that follow the pointer, or a CSS 3D tilt card) that does a real job such as drawing the eye to the main action. |
| Approach | Lightest first: CSS, then 2D canvas, then plain WebGL, then Three.js. Three.js only when the project already has a package manager and the scene needs models or lighting. |
| Model | Geometry built in code (a lathe, a torus, a few boxes). Use a model file only if the user supplied it or its licence permits reuse, and record it in `CREDITS.md`. Never use a model of unknown origin. |
| Colours | Read the tokens from the page's CSS (`getComputedStyle`) so the scene matches the design. Do not hard-code a second palette. |
| Budget | The default table in the performance reference, stated in the report. |
| Quality ladder | `high`, `low`, `poster`, no WebGL, as in the performance reference. The `poster` rung is the still image already in the page. |
| Controls | Real buttons for turn, pause and reset, shown only when the scene is ready. |

## When you are really blocked

You are blocked only when there is nothing to build in (no project, no page). Ask one short question. In every other case choose, build and report.

## Safeguards (these still apply)

- Do not commit, push, deploy or publish.
- Do not delete or replace files that hold the user's work. Edit in place.
- Do not load scripts, models, textures or fonts from a remote address. Keep every file local.
- Do not add a paid or closed-licence library or asset.
- Do not change the site's copy, layout or working features beyond the scene container and its controls.

## Mounting per stack

| Stack | How |
|---|---|
| Plain HTML | A module script in `scripts/` that starts only when the canvas is near the viewport. Stage helper copied beside it. |
| React with Vite | A component that creates the scene in `useEffect` and returns a cleanup that stops the loop and frees GPU objects. |
| Next.js | A client component (`'use client'`) that creates the scene in `useEffect`. The server-rendered HTML still holds the fallback image and text, so the page works before the scene starts. |
| Vue with Vite | Create the scene in `onMounted` and free it in `onBeforeUnmount`. |
| Nuxt | Wrap the component in `<ClientOnly>` so nothing runs on the server. Keep the fallback inside it. |

The Three.js reference has the longer patterns. Check the installed framework's documentation for current names.

## The hand-off section

Everything the later steps need goes into one file at the project root, `VYSON-NOTES.md`. Create it if it is missing. Edit only your own section. Never delete another skill's section.

```markdown
## 3D (vyson-3d-interactive-web)
- Job of the scene: <one line>. Approach: <CSS | 2D canvas | plain WebGL | Three.js, version>.
- Files: <paths>. Container: <selector>. Fallback: <image or SVG path>.
- Budget and ladder: <numbers stated, rungs that exist>.
- Reduced motion: <what stops, what controls remain>.
- Elements the motion step must not touch: <selectors>.
- Assets and licences: <list or none>.
- Not tested: <list, always including which devices were not used>
```

If the user wants no extra files, put the same text in the report.

## Worked example

This is an invented walk-through of the method, not a record of a real run.

Request: "Add a 3D piece to the Fieldwork ceramics site." Steps 1 and 2 left a plain HTML site with a `#vessel-stage` container and a drawing of a vessel inside it.

- Understand: plain HTML, no package manager, tokens in `styles/tokens.css`.
- Plan: the job is "lets a buyer turn a vessel and see its profile". Approach: plain WebGL with a lathe-shaped vessel built in code, no library, no model file. Budget and ladder from the reference.
- Implement: `scripts/canvas-stage.js` copied in, `scripts/vessel.js` builds the shape and reads the accent colour from the CSS tokens, drag to rotate with `touch-action: pan-y`, buttons for turn, pause and reset, the drawing kept as the fallback.
- Verify: `3d-lint.mjs` reports no FAIL lines; WebGL blocked shows the drawing and a short message; reduced motion starts the vessel still; the report says no real phone was used.
- Present: the job, the approach and why no library, the budget, the rungs tested, the hand-off section, which names `#vessel-stage` as off limits for motion.
