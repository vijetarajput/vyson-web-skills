# Quality plan

Read this in step 1 (plan) and step 6 (report).

## The three kinds of check

Keep these apart in your plan and your report. They answer different questions.

| Kind | Tool | What it can tell you | What it cannot |
|---|---|---|---|
| **Static audit** | `site-audit.mjs` | The files are consistent: links and files exist, tags and attributes are present, ids are unique, heavy files are named. | How the page looks, how fast it is, whether it works or is usable. |
| **Browser test** | `browser-check.mjs` | In one real headless browser: whether the page scrolls sideways, how big the controls are, whether Tab moves on and shows focus, whether the console is clean, whether motion stops. | Phones, other browsers, assistive technology, slow networks, real visitors. |
| **Manual check** | You, in a browser | The things that need judgement: reading order, contrast in context, wording of errors, keyboard flow, zoom. | Nothing, if you do it; but say what you did. |

An optional fourth kind is a field measurement (real visitors). It exists only after launch and needs a tool the user runs. Do not invent it.

## What to look at, in order

1. **Does it load?** Home page and each page type open with no console error and no failed request.
2. **Links and files.** No broken links, no missing images, scripts or styles. Anchors point at ids that exist.
3. **Basics every page needs.** Language, viewport, a unique title, a description, one `h1`, headings in order, a favicon.
4. **Images and media.** Alt text that says what the image shows (empty for decoration), width and height, sensible file sizes.
5. **Forms and controls.** Every field has a visible label. Buttons and icon links have names. Errors are readable.
6. **Small screens.** No sideways scrolling at 320 and 390. Tap targets aim for 44 by 44 CSS pixels and are never under 24 by 24. Body text is not tiny.
7. **Keyboard.** Tab reaches everything in a sensible order. Focus is always visible. Nothing traps focus. A skip link exists on pages with a long header.
8. **Motion.** Anything that loops or moves on its own stops under `prefers-reduced-motion: reduce`, and long auto-playing motion can be paused.
9. **Weight and third parties.** Page weight, blocking scripts, requests to other websites (each is a privacy and uptime question).
10. **Search and sharing.** Titles, descriptions, `noindex` left over from staging, link previews.
11. **Content.** No placeholder text, no "TODO", correct contact details and dates. A person reads it once.

## The launch bar

Default bar, which the user can change:

- Static audit: **0 errors**. Warnings fixed or explained.
- Browser check: **0 errors** at every width. Warnings fixed or explained.
- Manual checks: done, or listed as not performed.
- No claim in the report goes beyond what was run.

An **error** means a visitor is likely to be blocked or misled (a broken link, no label, sideways scrolling, invisible focus). A **warning** means a risk or a weaker practice (a large image, a missing description). Neither list is a full audit.

If the user accepts an error, write down who accepted it and why. The report is allowed to say "ready with these known problems". It is not allowed to say "ready" with an unlisted error.

## Fixing

- Fix causes, not symptoms. A missing `lang` is one line in the template; sideways scrolling comes from one element wider than the screen.
- Do not change copy, brand or design direction to satisfy a tool without asking. Propose the change instead.
- Do not add a library to fix a warning. Most fixes are one attribute or one CSS rule.
- When the finding belongs to another discipline (animation, 3D scene, form logic, visual design), make the smallest safe change and note that a specialist skill, if installed, can go further.
- Re-run both tools after fixing. A fix can create a new finding.

## Report template

Keep it short and plain. Put the decision first.

```text
Launch check: <site or folder>, <date>

Decision: Ready / Ready with known problems / Not ready
Why: <one or two sentences>

Static audit (site-audit.mjs)
  Before: <last RESULT line>      After: <last RESULT line>
  Fixed: <list>        Left: <list and reason>

Browser test (browser-check.mjs, <browser and version>, <operating system>, widths <list>)
  Before: <last RESULT line>      After: <last RESULT line>
  Fixed: <list>        Left: <list and reason>

Manual checks
  Done: <keyboard, zoom 200%, reading order, contrast, forms, ...>
  Not performed: <list>

Not tested at all
  <real phone, Firefox, Safari, screen reader, slow network, field data, other pages ...>

Changes made
  <file: what changed> (one line each)
```

Rules for the report:

- Quote the tools' own result lines. Do not round or reword them.
- Say "lab, one run" next to every layout-shift or loading number.
- Never write "accessible", "WCAG compliant", "fast" or "mobile-friendly" as a result. Write what was checked.
- If something was not run, write "not performed" and the reason. An honest gap is better than an empty section.

## A launch checklist for the user

If the user asks for a checklist they can keep, give a short one and offer to save it as `LAUNCH_CHECKLIST.md` in the project. Use the eleven headings above, one line each, with a box to tick. Do not paste a checklist you did not run into a report as if it had been done.
