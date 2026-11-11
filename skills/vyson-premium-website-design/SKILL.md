---
name: vyson-premium-website-design
description: Designs and builds distinctive, premium-looking websites with an AI coding agent. Chooses a visual direction first, then sets layout and hierarchy, typography, spacing, colour, imagery, responsive behaviour and finishing details, using a design-token starter file, a static design checker and a quality checklist. Use when a user asks to design or redesign a landing page or marketing site, make a site look premium, professional, high-end or less generic, fix a template-looking or amateur design, or choose fonts, colours, spacing and layout. Not for animation (use vyson-css-motion), 3D scenes, or logic-only frontend work.
license: MIT
metadata:
  vyson-pillar: "design"
  vyson-version: "0.1.0"
  vyson-status: "draft"
---

# VYSON Premium Website Design

Helps an AI coding agent produce a website that looks designed rather than generated. The method is simple: decide the look on purpose, build it from a small system of tokens, finish the details, and check the result honestly. The output is a real, working site, not a mood board.

Detail lives in six reference files and two bundled tools. Read them when the steps below tell you to, not before.

## When to use

- "Design a landing page for ...", "build me a premium website", "make this look high-end / professional".
- "My site looks generic / like a template / amateur." "Redesign the homepage."
- Choosing fonts, colours, spacing, a layout or a visual style for a marketing, portfolio, studio, product, restaurant, event or similar site.
- Improving the visual quality of an existing static or framework site without changing what it does.

## When not to use

- **Motion.** Entrance animations, scroll reveals, hover animation, page transitions: use the `vyson-css-motion` skill if it is installed. This skill sets up the page so motion has room to work (reserved space, clear states), and adds no animation of its own. If the request has both, do the design first, then motion.
- 3D scenes, WebGL and product viewers.
- Application logic, data, accounts, payments, back-end work, or a complex web application interface. This skill is about the visual and structural quality of sites that present something.
- Pure copywriting, SEO strategy, or content planning with no page to build.
- Copying another site. Never reproduce a named site's layout, copy or assets. Describe what the user likes in your own words and design something new.

## The design contract

Every site you produce must meet all four. They are explained in the reference files.

- **A decided direction.** There is a short direction note (audience, feeling, one signature move, type, colour, layout stance, imagery) and the page follows it. See [visual-direction.md](references/visual-direction.md).
- **A system, not one-off values.** Colours, fonts, spacing, radius and widths come from tokens ([assets/design-tokens.css](assets/design-tokens.css)). One scale for type and one for spacing.
- **Real content and honest assets.** No lorem ipsum, no invented clients or statistics, no hotlinked images or fonts, and a recorded licence for every font file, image and icon.
- **Accessible by default.** Text contrast of at least 4.5:1, visible focus, one `h1`, labelled forms, working zoom, and touch targets of 44 by 44 CSS pixels (never under 24 by 24) on touch screens.

The numbers in this skill are VYSON design defaults, not measured results. Do not claim that the result converts better, loads faster or scores higher anywhere unless you measured it.

## Before you start

Work out answers from the project first. Ask the user only for what you cannot find out, and ask at most three questions.

1. **Find the project type.** Plain HTML, or a framework? Where is the main CSS? Are there design tokens, a brand guide, a logo, fonts or image folders?
2. **Find the brand.** Existing colours, fonts, logo and tone. Keep them. Do not "improve" a brand you were not asked to change.
3. **Find the content.** What real text, projects, products and images exist? Mark what is missing. Never invent facts about a real business. For a demo, label the brand as made up.
4. **Find the job of the page.** The one action a visitor should take.
5. **Find the browsers that matter.** If unknown, assume current Chrome, Edge, Firefox and Safari, and treat every newer CSS feature as an optional extra with a plain fallback.

If the user wants no extra files, give the direction note in your reply instead of creating `DESIGN.md`.

## Steps

### 1. Write the direction note

Open [visual-direction.md](references/visual-direction.md). Fill in the table: audience, job of the page, three feelings and three non-feelings, a direction type, **one signature move**, type, colour, layout stance, imagery and available content. Use two or three concrete sentences, not adjectives like "modern" and "clean".

If the request is open-ended, show the note to the user and wait for a yes before building. If the user already gave a clear brief, build and show the note afterwards.

### 2. Set up the tokens

Copy [assets/design-tokens.css](assets/design-tokens.css) into the project, or merge its parts into the existing stylesheet. Then change the **colours, fonts and radius** to match the direction note before writing any component. If the project already has tokens, map to them and do not create a second set. Fonts: start with system stacks. See [typography-and-spacing.md](references/typography-and-spacing.md) before adding a font file. For the colour system and contrast rules, see [color-and-imagery.md](references/color-and-imagery.md).

### 3. Plan the page

Write the sections as a list, with the job of each in one line, and pick a layout pattern for each. Remove any section without a job. Check that neighbouring sections do not use the same pattern and that one section is clearly dominant. Open [layout-and-hierarchy.md](references/layout-and-hierarchy.md) for the patterns, the hero checklist and the hierarchy test.

### 4. Build mobile first

- Write semantic HTML first: landmarks, one `h1`, real buttons and links, a skip link.
- Style the narrow screen first, then add columns where the content has room. Breakpoints follow the content.
- Use the tokens for every colour, size, space and width. Use the `.vd-container`, `.vd-section` and `.vd-stack` helpers where they fit.
- Write real copy in the brand's voice. If the content does not exist, write plausible, specific placeholder copy and list it in the report as text the user must replace. Never use filler.
- Use the project's real selectors and keep the diff small when working in an existing project. Do not restyle parts the user did not ask about.

Detail for responsive layout, navigation, forms and implementation quality: [responsive-and-details.md](references/responsive-and-details.md).

### 5. Imagery and graphics

Follow the imagery decision in the direction note. Prefer real images, then your own drawings or SVG, then type. Do not hotlink. Do not use stock-photo filler. Store files in the project, add `alt`, `width` and `height`, lazy-load images below the first screen, and record each file's licence and source. Details and the text-on-image rules: [color-and-imagery.md](references/color-and-imagery.md).

### 6. Details pass

Go through the finishing list in [responsive-and-details.md](references/responsive-and-details.md): states for every interactive element, focus, selection colour, favicon, title and description, footer, empty states. Every interactive element needs default, hover (hover devices only), focus and active styles. Add no animation here; leave motion to `vyson-css-motion`.

### 7. Review the design

Look at the page at 1440 and at 390 wide, and compare it with the direction note. Do the squint test, count the signs of a generic template, and go through the design review checklist in [quality-checks.md](references/quality-checks.md). Fix what is wrong, and cut something before adding something. If you cannot see the page (no browser, no screenshot), say "design review: not performed on a rendered page".

### 8. Run the checks

Run the bundled static checker on the folder with the site's HTML and CSS:

```powershell
node skills/vyson-premium-website-design/scripts/design-lint.mjs path/to/site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-premium-website-design/scripts/design-lint.mjs`). Fix every `FAIL` line. Read every `WARN` line and either fix it or explain in the report why it stays.

**This is a static check.** It only reads text and never opens a browser. It cannot judge the design, measure layout, or see text on images. Passing it is not a design review and not a browser test.

Then do the browser steps in [quality-checks.md](references/quality-checks.md), if a browser is available: phone width, 320 width, wide screen, 200 percent zoom, keyboard, a contrast spot check. If you cannot open a browser, say "browser test: not performed" and list the steps you skipped. Keep the static checks, the design review and the browser tests as three separate lists in the report.

### 9. Report

Finish with a short report in plain language, in the structure given at the end of [quality-checks.md](references/quality-checks.md): the direction, what changed and which text is placeholder, the static check result (paste the last `RESULT` line), the design review result, the browser tests run and not run, and the licences and credits. Never state speed scores, rankings, conversion claims or "fully accessible" for anything you did not measure.

## Common mistakes

| Mistake | Why it hurts | Instead |
|---|---|---|
| Starting with CSS before a direction exists | Defaults decide the look | Write the direction note first |
| Everything centred, every section the same | No hierarchy or rhythm | Vary patterns, align to shared edges |
| Timid headlines, body-sized everything | No hierarchy | Make level 1 clearly larger than level 2 |
| Three equal icon cards by reflex | The generic template look | Use an index list, steps or a statement |
| Accent colour on every element | The accent loses its meaning | One accent for action and focus |
| Gradient or glow added to fix a plain page | Decoration without purpose | Fix type, space and content first |
| Light grey text on white | Fails contrast and looks weak | Run the contrast check, darken the text |
| Stock photos and invented logos or numbers | Reads as fake | Use real material, drawings or type |
| Hotlinked fonts and images | Privacy, licence and reliability problems | Store licensed files in the project |
| Removing the focus outline | Keyboard users get lost | Style `:focus-visible` instead |
| Tiny tap targets | Hard to use on phones | 44 by 44 CSS pixels on touch screens |
| Fixing mobile at the end | Desktop layout squeezed into a phone | Build mobile first |
| Claiming "optimised", "fast" or "accessible" | Nothing was measured | Say what was and was not checked |

## Output

- New or edited HTML and CSS, the token file, and any images or SVG the page needs (with credits).
- A short direction note (a file or part of the reply).
- A report as described in step 9.
- No new dependencies and no external fonts or images. No animation of its own.

## Acceptance checks

The work is finished only when all of these are true:

- [ ] A direction note exists, with one signature move used at least three times.
- [ ] The first thing a visitor notices is the headline or key visual, and there is one primary action per view.
- [ ] Colours, fonts, spacing and radius come from tokens, with one type scale and one spacing scale.
- [ ] At most two font families (three stacks counting code), and a recorded licence for every font file, image and icon, or none used.
- [ ] Body text is at least 16px, with lines of about 45 to 75 characters.
- [ ] All text pairs reach 4.5:1 contrast (3:1 for large text), and no state relies on colour alone.
- [ ] Every interactive element has default, hover (hover devices only), focus and active styles, and focus is visible.
- [ ] The page works at 390 and 1440 wide, at 200 percent zoom, with no sideways scrolling at 320, or the report says it was not tested.
- [ ] One `h1`, no skipped heading levels, landmarks, a skip link, labelled form fields.
- [ ] Touch targets of 44 by 44 CSS pixels, never under 24 by 24, or the report says it was not measured.
- [ ] No placeholder filler, dead `#` links, hotlinked files, or invented clients, quotes or statistics.
- [ ] No animation added by this skill. Any motion request was handed to `vyson-css-motion` or noted as not done.
- [ ] `design-lint.mjs` (a static check) reports no `FAIL` lines.
- [ ] The report keeps static checks, design review and browser tests in three separate lists, and states what was not tested.

## Accessibility

- Contrast: 4.5:1 for normal text, 3:1 for large text and for the borders and icons that identify a control. Do not rely on colour alone.
- Keyboard: every control works with `Tab`, `Enter` and `Space`, the focus order matches the visual order, and the focus ring is visible.
- Structure: landmarks, one `h1`, ordered headings, real lists and tables, a language on the page.
- Zoom and text size: the layout works at 200 percent zoom and with a larger browser font size. Do not block zoom.
- Images: `alt` text that says what the image shows in context, and empty `alt` for decoration.
- Touch: 44 by 44 CSS pixels to aim for, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8, with exceptions such as links inside a sentence).

## References

Load these only when needed. They are one level deep and do not link to each other.

- [visual-direction.md](references/visual-direction.md): the direction note, six direction types, signature moves, signs of a generic template.
- [layout-and-hierarchy.md](references/layout-and-hierarchy.md): the hierarchy test, page structure, section patterns, grid, whitespace, hero and calls to action.
- [typography-and-spacing.md](references/typography-and-spacing.md): fonts and licences, the type scale, line length, headings, spacing rules.
- [color-and-imagery.md](references/color-and-imagery.md): colour roles, contrast, the accent, dark mode, imagery choices, image files and licences.
- [responsive-and-details.md](references/responsive-and-details.md): responsive method, navigation, touch, states, forms, finishing details, HTML and CSS quality.
- [quality-checks.md](references/quality-checks.md): the checker rules, the design review checklist, manual browser steps, the report format.
- [assets/design-tokens.css](assets/design-tokens.css): the starter tokens and layout helpers.
- [scripts/design-lint.mjs](scripts/design-lint.mjs): the static checker (18 rules, DL001 to DL018). Needs Node.js 22 or newer, no installation.

## Licensing notes

This skill recommends no library, font or image, and includes no third-party code. One short adapted section, the removal test in `references/quality-checks.md`, comes from an MIT-licensed skill repository; its notice is in `NOTICE.md` in this folder. It tells you to start from system font stacks and to verify and record the licence of anything else. The starter CSS uses standard web features; newer ones (`text-wrap`, `clamp()`) are optional extras. Fonts, icons and images added to a project keep their own licences.
