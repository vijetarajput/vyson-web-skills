# Prompt: final website quality engineering and fixes

Paste the text below into a new agent chat in your website project, after steps 1 to 4 (design, frontend, 3D, motion). It is step 5 of 5.

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
