# Prompt: CSS motion and animation

Paste the text below into a new agent chat in your website project, after steps 1 to 3 (design, frontend, 3D). It is step 4 of 5.

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
