# The five prompts

One prompt for each VYSON skill, to be pasted **in this order**, each into a **new agent chat** in the same website project. Together they take an existing or empty project to a finished, responsive, working site. No setup prompts and no approval rounds are needed in between.

| Step | Skill | What you get |
|---|---|---|
| 1 | `vyson-premium-website-design` | A decided visual direction, design tokens, and responsive, polished pages with real copy. |
| 2 | `vyson-frontend-development` | The pages made into a working site: structure, navigation, forms, data, dialogs, every state. |
| 3 | `vyson-3d-interactive-web` | One purposeful 3D or interactive visual with a budget, a fallback and reduced-motion handling. |
| 4 | `vyson-css-motion` | Restrained, accessible CSS motion across the site. |
| 5 | `vyson-website-quality-engineering` | The whole site checked, safe fixes made, and an honest report with a launch decision. |

## How the five fit together

- Each prompt tells the agent to read the project and `VYSON-NOTES.md` first. That file sits at the project root. Each skill writes only its own section, so the next step knows what exists, which hooks are ready and what was not tested.
- Each skill stays in its own lane. Design does not build features, frontend does not restyle, 3D does not animate the page, motion does not touch the 3D scene, and quality fixes only what is safe and reports the rest.
- Each prompt tells the agent to decide small choices itself and to ask only if it cannot continue at all. It must not commit, push, deploy, overwrite your work or submit real forms.

## Before you start

1. Install the skills: see [Installation in the README](../README.md#installation).
2. Open your website project (empty or existing) in your agent.
3. In the step 1 prompt, fill in the "About the site" line, or delete it if the project already shows what the site is.

## What is and is not verified

- The structure of every prompt and skill is checked by this repository's automated tests (they check the text, not what an agent does with it).
- **Not verified:** that an agent following all five prompts produces a good website. No such end-to-end run has been recorded yet. Treat the first run as a test and read each report.
- If your agent does not list a skill, the prompt tells it to open the skill's `SKILL.md` from the project's skills folder and say that it was not loaded automatically.

The same text lives inside each skill (`references/prompt.md`) so that it is installed with the skill. A test checks that the two copies are identical.

---

## Prompt 1: Premium design direction and design implementation

Skill: `vyson-premium-website-design`. Source: [`skills/vyson-premium-website-design/references/prompt.md`](../skills/vyson-premium-website-design/references/prompt.md).

```text
Use the vyson-premium-website-design skill on this project. This is step 1 of 5 for this site. Do the whole job now instead of planning it.

About the site (optional, delete this line if the project already shows it): [what the business or project is, who visits, and the one thing a visitor should do]

What to do:
1. Read the project first: its framework, pages, CSS, brand files, copy and images. Keep what works and anything already branded.
2. Decide a distinctive visual direction yourself (audience, feeling, one signature move, type, colour, layout stance). Write it in the "Design" section of VYSON-NOTES.md at the project root.
3. Build it for real: design tokens, typography, a colour system, a clear section hierarchy with specific real copy, and a responsive layout that works from 320px wide to a wide desktop. Use the project's own framework. If the project is empty, build a plain HTML and CSS site.
4. Give every link and button default, hover, focus and active styles. Do not build functionality, 3D scenes or animation. Later steps do those.
5. Check your work with the skill's design-lint script, and open the page at phone and desktop widths if you can.

Do not stop to ask me to approve the direction or any small choice. Ask a question only if you cannot continue at all. Decide, build, and explain your decisions in the report.

Result I expect: a finished-looking, responsive, non-generic site that I can open in the browser, with tokens, a direction note and the hand-off section written.

Keep: the existing brand, working code, content and files. Edit in place and delete nothing important. Do not commit, push or deploy, and do not add paid or tracking services. No new dependencies, no hotlinked fonts or images, no invented clients or statistics.

Finish with a short report: the direction and why, the files you changed, the placeholder text I must replace, the static check result, what you tested in a browser, and what you could not test.

If you cannot see the skill in your skill list, open its SKILL.md in the project's skills folder (.cursor/skills, .claude/skills or .agents/skills), follow it, and tell me it was not loaded automatically.
```

---

## Prompt 2: Complete frontend development

Skill: `vyson-frontend-development`. Source: [`skills/vyson-frontend-development/references/prompt.md`](../skills/vyson-frontend-development/references/prompt.md).

```text
Use the vyson-frontend-development skill on this project. This is step 2 of 5 for this site. Do the whole job now instead of planning it.

First read the project and the "Design" section of VYSON-NOTES.md if it exists. Keep the existing design, tokens, copy and framework. Do not restyle it.

What to do:
1. Turn the designed pages into a complete working site with the project's own framework (plain HTML with ES modules if the project is plain HTML). Add the missing pages, the shared header and footer, working navigation and a mobile menu.
2. Organise the code into small reusable pieces that fit the framework: components, routes, hooks or composables, or one module per job in plain JavaScript.
3. Build every interaction the site needs as a real working feature: contact or signup form with validation, any list, filter or search, dialogs, tabs or accordions. Every data feature shows loading, empty, error (with retry) and success states.
4. If there is no real backend, use a local data file or a clearly labelled stub. Say so in the page and the report. Never send data anywhere or submit a real form.
5. Leave clear hooks for the next steps: a container with a fallback where a 3D or interactive scene can go, and stable class names for elements that will get motion. Do not add 3D or animation now.
6. Run the skill's frontend-lint script, the project's own tests and build if they exist, and open the site in a browser if you can: keyboard path, each state, and phone width.

Do not stop to ask me to approve the structure or any small choice. Ask a question only if you cannot continue at all. Decide, build, and explain your decisions in the report.

Result I expect: a complete responsive site that runs with the project's dev command, where every link, form and control works and every state is visible, with the "Frontend" section of VYSON-NOTES.md written.

Keep: the design, the existing files and working code. Edit in place and delete nothing important. Do not commit, push or deploy. No analytics or trackers, no secrets in client code, no new dependency unless the job truly needs it (then tell me its licence and version).

Finish with a short report: stack and structure, features and their states, the static check result, the tests and build you ran, the browser steps you did and could not do, and what a real server must still check.

If you cannot see the skill in your skill list, open its SKILL.md in the project's skills folder (.cursor/skills, .claude/skills or .agents/skills), follow it, and tell me it was not loaded automatically.
```

---

## Prompt 3: Purposeful 3D interactive experience

Skill: `vyson-3d-interactive-web`. Source: [`skills/vyson-3d-interactive-web/references/prompt.md`](../skills/vyson-3d-interactive-web/references/prompt.md).

```text
Use the vyson-3d-interactive-web skill on this project. This is step 3 of 5 for this site. Do the whole job now instead of planning it.

First read the project, the page that should host the experience, and the "Design" and "Frontend" sections of VYSON-NOTES.md if they exist. Keep the design, copy and working features.

What to do:
1. Decide yourself where one purposeful 3D or interactive visual belongs on this site (the hero, a product or feature section, or the container the notes name) and what job it does for the visitor, in one line.
2. Choose the lightest approach that does the job: CSS, a 2D canvas, plain WebGL, or Three.js only if the project already has a package manager and really needs it. Build shapes in code. Do not use a model or texture whose licence you cannot confirm. Keep every file local, with no CDN.
3. Build it into the page: a still image or drawing as the fallback, an accessible name and a text description, real buttons for turn, pause and reset, a capped pixel ratio, drawing only while visible, and cleanup when it is removed.
4. Make it kind to visitors: no automatic movement under prefers-reduced-motion, a lighter or still version on phones and when data saving is on, vertical swipes that still scroll the page, and a clear fallback when WebGL is missing or fails.
5. Run the skill's 3d-lint script. Open the page in a browser if you can and test the fallback, reduced motion and phone width.

Do not stop to ask me to approve the idea, the library or the placement. Ask a question only if you cannot continue at all. If 3D is a weak fit, build the lightest interactive visual that does a real job and tell me why. Decide, build, and explain in the report.

Result I expect: one working, responsive 3D or interactive experience that looks like part of the site, with a performance budget stated, a working fallback, and the "3D" section of VYSON-NOTES.md written.

Keep: the design, copy, features and existing files. Edit in place and delete nothing important. Do not commit, push or deploy. Do not load anything from a remote address. Do not add a paid or closed-licence library or asset.

Finish with a short report: the job and approach, the budget, which fallback levels exist and which you tested, the static check result, the browser and device tests you did and could not do, and any licences.

If you cannot see the skill in your skill list, open its SKILL.md in the project's skills folder (.cursor/skills, .claude/skills or .agents/skills), follow it, and tell me it was not loaded automatically.
```

---

## Prompt 4: CSS motion and animation

Skill: `vyson-css-motion`. Source: [`skills/vyson-css-motion/references/prompt.md`](../skills/vyson-css-motion/references/prompt.md).

```text
Use the vyson-css-motion skill on this project. This is step 4 of 5 for this site. Do the whole job now instead of planning it.

First read the project's CSS and markup, look for any existing motion, and read VYSON-NOTES.md if it exists. Keep the design, copy, working features and the 3D scene as they are.

What to do:
1. Decide yourself on three to five motion moments for the whole site, each with a purpose: an entrance for the first screen, a reveal for sections below it, press and hover feedback, smooth opening and closing of menus or accordions, and at most one extra. Pick the tone from the design direction (calm if it is not clear).
2. Implement them with CSS, plus one tiny script only where a reveal or accordion needs it. Animate transform and opacity only, keep durations short, and use no animation library. Use the project's real class names and its framework's way of loading CSS and scripts.
3. Respect people who want less movement: all movement inside prefers-reduced-motion no-preference, content visible and in place when it is off, and the first screen visible without JavaScript.
4. Make it work on phones: hover effects only on devices that hover, shorter travel on small screens, and tap targets of at least 44 by 44 CSS pixels (never under 24 by 24). Only one FAQ or accordion panel may stay open.
5. Do not touch the 3D scene, its canvas or its controls.
6. Run the skill's motion-lint script, and open the page in a browser if you can: reduced motion, scripts blocked, phone width and keyboard.

Do not stop to ask me to approve the moments or the style. Ask a question only if you cannot continue at all. Decide, build, and explain in the report.

Result I expect: polished, purposeful, restrained motion that makes the site feel finished, with nothing hidden or broken when motion is off, and the "Motion" section of VYSON-NOTES.md written.

Keep: the design, copy, features and existing files. Edit in place and delete nothing important. Do not commit, push or deploy. Do not add an animation library.

Finish with a short report: the moments and why, the files changed, the static check result, the browser tests you did and could not do, and any newer CSS feature that some browsers may not support.

If you cannot see the skill in your skill list, open its SKILL.md in the project's skills folder (.cursor/skills, .claude/skills or .agents/skills), follow it, and tell me it was not loaded automatically.
```

---

## Prompt 5: Final website quality engineering and fixes

Skill: `vyson-website-quality-engineering`. Source: [`skills/vyson-website-quality-engineering/references/prompt.md`](../skills/vyson-website-quality-engineering/references/prompt.md).

```text
Use the vyson-website-quality-engineering skill on this project. This is step 5 of 5 for this site. Do the whole job now instead of planning it.

First read the project, find how it is built, and read VYSON-NOTES.md if it exists. It lists what the earlier steps built and did not test.

What to do:
1. Build the site with the project's build command, if it has one, and check the output folder. Do not change build or security configuration to get one.
2. Run the skill's static audit on that folder, and its real headless-browser check at phone and desktop widths. Also run the other installed VYSON checkers (design, frontend, 3D and motion lint) and say "not run" for any that are not installed.
3. Check by hand what the tools cannot: keyboard use, 200 percent zoom, heading and link order, contrast, every navigation link, the menu, each form with valid and invalid input (a demo form must not send real data), dialogs and accordions, the 3D fallback with WebGL blocked, and reduced motion.
4. Fix every safe problem in place: language, viewport, titles, alt text, labels, broken links, focus styles, tap-target sizes, sideways scrolling, reduced-motion gaps, clear bugs and oversized images. Do not change copy, the design direction or the features, and do not add dependencies. Report those problems with a suggested fix.
5. Run the checks again and compare before and after.

Do not stop to ask me to approve each fix. Ask a question only if you cannot continue at all. Decide, fix, verify, and explain in the report.

Result I expect: a site that passes its own checks, with every safe fix made, and a short honest report that starts with a launch decision (ready, ready with known problems, or not ready). Write the same result in the "Quality" section of VYSON-NOTES.md.

Keep: the design, copy, features and existing files. Edit in place and delete nothing important. Do not commit, push, deploy or publish. Do not submit real forms.

Finish with a report that keeps three lists apart: static audit, browser test and hand checks. Show before and after results, what you fixed, what is still open and why, and what you did not test (for example a real phone, other browsers, a screen reader and real-user speed). Do not claim the site is accessible, fast or compliant unless it was measured.

If you cannot see the skill in your skill list, open its SKILL.md in the project's skills folder (.cursor/skills, .claude/skills or .agents/skills), follow it, and tell me it was not loaded automatically.
```
