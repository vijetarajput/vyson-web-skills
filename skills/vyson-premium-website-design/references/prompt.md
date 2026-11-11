# Prompt: premium design direction and design implementation

Paste the text below into a new agent chat in your website project. It is step 1 of 5. Fill in the "About the site" line, or delete it if the project already shows what the site is.

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
