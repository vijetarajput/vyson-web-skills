---
name: vyson-css-motion
description: Adds fast, accessible, CSS-only motion to a website, such as page-load entrances, scroll reveals, hover and press feedback, accordions, marquees and page transitions, with a performance budget, reduced-motion handling and a mobile fallback. Use when a user asks to animate a site, add micro-interactions or scroll effects, make a page feel premium or alive, fix janky or inaccessible animation, or add motion without a JavaScript animation library. Not for 3D scenes or timeline libraries such as GSAP.
license: MIT
metadata:
  vyson-pillar: "motion"
  vyson-version: "0.1.0"
  vyson-status: "pilot"
---

# VYSON CSS Motion

Adds motion that makes a site feel polished without making it slower or harder to use. Everything is plain CSS plus, at most, one tiny script. The result must stay smooth on a mid-range phone and must respect people who ask their device for less motion.

Detail lives in four reference files and two bundled tools. Read them when the steps below tell you to, not before.

## When to use

- "Animate my site", "add scroll effects", "make it feel premium", "add hover effects".
- Fixing animation that stutters, jumps, hides content, or ignores accessibility settings.
- Adding motion to a plain HTML/CSS site, or to a framework project that uses normal CSS.
- A request for motion where the user does not want to add an animation library.

## When not to use

- Scroll-timelines, pinned sections, SVG morphing or complex sequences that need a timeline library. Say so, and tell the user a library such as GSAP or Motion may be a better fit. Check the license first (see `THIRD_PARTY.md` in the VYSON repository if present). Do not add it without the user's say-so; build the CSS-only version meanwhile.
- 3D scenes, WebGL and canvas animation.
- Pure copy or layout changes with no motion request.
- Native mobile apps.

## How this skill runs

Default: **understand, plan internally, implement, verify, present.** When the user asks for motion, add it to the project in one pass. Do not stop at a list of ideas, and do not ask the user to approve the moments or the style: decide, build, and list the moments in the report.

- **Your lane.** CSS motion for the existing page: entrances, reveals, hover and press feedback, panels, page transitions. Keep the design and every working feature as they are. Do not touch a 3D or canvas scene (that is `vyson-3d-interactive-web`); the hand-off names the elements to leave alone.
- **Read first.** The main CSS, existing motion (see below), the page markup, and `VYSON-NOTES.md` if it exists: the "Design" section gives the tone, the "Frontend" section the class names and states, the "3D" section the elements not to touch.
- **Ask only when blocked**, meaning there is no page to add motion to. One short question. Otherwise choose a default (calm) and list it in the report.
- **Ask first only for** committing, pushing, deploying, deleting or replacing important user files, and adding an animation library. If a need is beyond plain CSS, build the CSS-only version and say what a library could add.

Defaults, stack placement, the hand-off format and a worked example: [workflow.md](references/workflow.md). The one-paste prompt for this skill: [prompt.md](references/prompt.md).

## Before you start

Work out answers from the project first and read its files. Ask nothing unless you are blocked (see above).

1. **Find the project type.** Plain HTML, or a framework? Where is the main CSS? Is there a design-token file?
2. **Find existing motion.** Search the CSS for `transition`, `animation`, `@keyframes`, `scroll-behavior` and `prefers-reduced-motion`. Search scripts for `addEventListener('scroll'` and for animation libraries. Do not duplicate or fight what exists.
3. **Find the tone.** A calm law firm and a playful snack brand need different speed and distance. Take it from the design direction or the copy. If it is not clear, use calm and subtle and say so.
4. **Find the browsers that matter.** If unknown, assume current versions of Chrome, Edge, Firefox and Safari, and keep every newer CSS feature as an optional extra.

## The motion contract

Every piece of motion you add must satisfy all three. The rules are short here and explained in the reference files.

- **Performance budget.** Animate `transform` and `opacity` only (one small exception for disclosure panels). Durations between 140ms and 700ms. At most about 10 elements moving at once and at most one endless loop. No scroll-event listeners. Full table: [performance-budget.md](references/performance-budget.md). These numbers are VYSON design limits, not measured results.
- **Reduced motion.** All movement is written inside `@media (prefers-reduced-motion: no-preference)`, so content is visible and in place by default. Details and the keep/remove table: [reduced-motion.md](references/reduced-motion.md).
- **Mobile fallback.** Hover effects only inside `@media (hover: hover) and (pointer: fine)`. Shorter travel on small screens (the starter file does this). Decorative scroll-linked effects are off on phones unless tested on a real device. Controls people press are at least 44 by 44 CSS pixels on touch screens, and never under 24 by 24 (details: [verification.md](references/verification.md)).

## Steps

### 1. Plan the motion moments

Choose **3 to 5 moments** for the whole page. More is not better. For each, write one line: where, what, why. Every moment needs a purpose:

| Purpose | Example |
|---|---|
| Orient | A page entrance that shows where to look first. |
| Give feedback | A button that responds to press. |
| Explain a change | A panel that opens instead of jumping. |
| Add personality (use sparingly) | A card lift, an underline that draws in. |

If a moment has no purpose, drop it. Do not show the list for approval; build it and put it in the report.

### 2. Add the tokens

Copy [assets/motion-base.css](assets/motion-base.css) into the project (or merge its parts into the existing stylesheet and token file). It contains duration and easing tokens, entrance, reveal, press and lift classes, and the reduced-motion safety net. Link it before the page's own CSS. If the project already has tokens, reuse them and do not create a second set.

### 3. Pick the right trigger for each moment

| Moment | Trigger | Recipe |
|---|---|---|
| First screen appears | CSS animation on load | 1 |
| Sections appear while scrolling | `IntersectionObserver` plus a class | 2 |
| Same, in browsers that support it | `animation-timeline: view()` inside `@supports` | 3 |
| Button or link feedback | `:hover`, `:active`, `:focus-visible` | 4, 6 |
| Card hover | `:hover` on devices that hover | 5 |
| Panel opens or closes (only one open at a time) | A class toggled by a click | 7 |
| Moving strip of logos or text | Only if the client insists | 8 |
| Moving between pages | `@view-transition` | 9 |
| Reading progress | `animation-timeline: scroll()` inside `@supports` | 10 |

All recipes, with HTML, CSS, JavaScript and their own budget notes: [recipes.md](references/recipes.md). Adapt them to the project's class names and markup. Do not paste blindly.

### 4. Build

- Write the CSS for the moment, with movement inside the `no-preference` query.
- Keep the first screen visible without any script. Only content below the fold may use hide-until-seen reveals, and only through the script in recipe 2, which turns hiding on after it has checked support and the user's preference.
- Set `animation-fill-mode: both` (or use `both` in the shorthand) for entrances, and put only the hidden state in `@keyframes` (a `from` block), so the natural state is the end state.
- Name properties in transitions. Never write `transition: all`.
- Use the project's real selectors and keep the diff small. Do not restyle things the user did not ask about.

### 5. Reduced-motion pass

Open [reduced-motion.md](references/reduced-motion.md) and go through the table for every moment you added. Then check:

- With `prefers-reduced-motion: reduce`, nothing slides, zooms, spins or loops, and nothing is hidden.
- Gentle fades and colour changes may remain if they are short.
- Any `scroll-behavior: smooth` is inside the `no-preference` query.
- Autoplaying media is not started when the preference is `reduce`.

### 6. Mobile pass

- Hover-only effects are inside `(hover: hover) and (pointer: fine)`. Touch users get press feedback instead.
- Check that the travel distance and stagger are smaller under 640px.
- Reserve space for animated content so the page does not jump.
- **Tap targets.** Every button, navigation link, toggle and accordion question needs a touch area of at least 44 by 44 CSS pixels on touch screens (`@media (pointer: coarse), (max-width: 640px)`), and never under 24 by 24, except links inside a sentence. Add padding or `min-height`, not a larger font. The starter file has a `.vy-tap` helper; `verification.md` has the exact rule and a console snippet that measures it.
- If you cannot test on a phone, say "mobile device test: not performed".

### 7. Verify

Run the bundled checker on the folder that holds the site's CSS and HTML:

```powershell
node skills/vyson-css-motion/scripts/motion-lint.mjs path/to/site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-css-motion/scripts/motion-lint.mjs`). Fix every `FAIL` line. Read every `WARN` line and either fix it or explain in the report why it stays.

**This is a static check.** It only reads text and never opens a browser. It does not measure frame rate, cannot see which CSS rule wins, and cannot see what a script really does. Passing it is not a browser test.

Then do the **browser tests** from [verification.md](references/verification.md), if a browser is available: reduced motion, scripts blocked, phone width, tap-target measurement, keyboard, and (when the page has an accordion) the accordion test. If you cannot open a browser, say "browser test: not performed" and list the steps you skipped. Keep the two lists apart in your report.

### 8. Report

Finish with a short report in plain language:

1. The moments you added (one line each) and the files you changed.
2. Which budget limits apply and whether any was broken, and why.
3. **Static checks run:** the result of the checker (paste the last `RESULT` line).
4. **Browser tests run:** which numbered steps of `verification.md` you did, in which browser, and what you saw. List what you did **not** test (a real phone, Firefox, Safari and a screen reader are usually in this list).
5. Browser-support notes for any newer CSS feature you used.

Never state frame rates, scores or load times that you did not measure.

## Output

- Edited or new CSS (and, only if recipe 2 or 7 is used, one small script file).
- A short motion summary for the user, as described in step 8, and the "Motion" section of `VYSON-NOTES.md` (the hand-off).
- No new dependencies. No animation library.

## Acceptance checks

The work is finished only when all of these are true:

- [ ] The motion is implemented in the project (not only suggested), no approval was requested for choices the skill could make, and the design and features still work.
- [ ] There are 5 or fewer motion moments, each with a stated purpose.
- [ ] Only `transform` and `opacity` are animated, apart from the documented disclosure-panel exception.
- [ ] No `transition: all`, and no animation of layout properties.
- [ ] All movement sits inside `prefers-reduced-motion: no-preference`, or a `reduce` block removes it.
- [ ] With reduced motion on, no content is hidden or shifted, and focus styles are still visible.
- [ ] Hover effects are limited to devices that hover, and small screens get shorter travel.
- [ ] Moving content that runs longer than 5 seconds has a pause control, or there is no such content.
- [ ] At most one endless loop on the page.
- [ ] The first screen is visible without JavaScript.
- [ ] No scroll-event listener drives animation.
- [ ] If there is an accordion or FAQ: only one panel can be expanded at a time, it works with `Tab`, `Enter` and `Space`, and its answers are readable when scripts are blocked.
- [ ] Buttons, navigation links and toggles are at least 44 by 44 CSS pixels on touch screens (never under 24 by 24), or the report says it was not measured.
- [ ] `motion-lint.mjs` (a static check) reports no `FAIL` lines.
- [ ] The report keeps static checks and browser tests in two separate lists, and states what was and was not tested.

## Accessibility

- Focus: every hover effect has a matching `:focus-visible` style. Never remove outlines without a replacement.
- Motion: respect `prefers-reduced-motion`; do not flash more than three times in a second.
- Content: nothing may be understandable only through motion. Hidden-until-revealed content must still be in the reading order and visible when scripts or motion are unavailable.
- Moving content longer than 5 seconds needs a visible pause control.

## References

Load these only when needed. They are one level deep and do not link to each other.

- [workflow.md](references/workflow.md): defaults to decide alone, when you are blocked, safeguards, wiring per stack, the hand-off section, a worked example.
- [prompt.md](references/prompt.md): the single prompt a user pastes to run this skill.
- [recipes.md](references/recipes.md): ten copy-ready patterns with HTML, CSS and script.
- [performance-budget.md](references/performance-budget.md): the budget table and how to check each limit.
- [reduced-motion.md](references/reduced-motion.md): what to remove, what to keep, patterns, testing.
- [verification.md](references/verification.md): static checks versus browser tests, the tap-target rule, the accordion test, how to report.
- [assets/motion-base.css](assets/motion-base.css): the starter tokens and classes.
- [scripts/motion-lint.mjs](scripts/motion-lint.mjs): the static checker (14 rules, ML001 to ML014). Needs Node.js 22 or newer, no installation.

## Licensing notes

This skill recommends no library and includes no third-party code. The CSS techniques use standard web features. GSAP and Motion are mentioned only as alternatives for needs this skill does not cover; both are listed in `THIRD_PARTY.md` in the VYSON repository, GSAP with its non-open-source license noted.
