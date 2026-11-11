# Prompt: complete frontend development

Paste the text below into a new agent chat in your website project, after step 1 (design). It is step 2 of 5.

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
