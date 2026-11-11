# Prompt: purposeful 3D interactive experience

Paste the text below into a new agent chat in your website project, after steps 1 and 2 (design and frontend). It is step 3 of 5.

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
