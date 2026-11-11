# Responsive design, finishing details and implementation quality

A premium site is the same site on a phone, a laptop and a large monitor, with every detail finished. This file covers the layout rules for different screens, the small details that separate polished from rough, and how to write the HTML and CSS so the result lasts.

Contents: responsive method, breakpoints, navigation, touch, states, forms, finishing details, HTML and CSS quality, performance basics.

## Responsive method

1. **Design the phone layout first.** A 390px wide screen forces decisions about priority. Then widen.
2. **Use a single column as the base**, then add columns where the content has room. Use CSS Grid with `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` for card-like lists, and explicit columns for editorial layouts.
3. **Breakpoints follow the content.** Add a breakpoint where the layout looks wrong, not at a device width. Most sites need two or three, for example around 40rem, 60rem and 80rem.
4. **Use `min-width` media queries** (mobile first) and `rem` units, so a larger browser font size also triggers the wider layout later.
5. **Scale by tokens, not by overrides.** Fluid type, spacing and gutters (`clamp()`) mean fewer breakpoint rules.
6. **Reorder with care.** Visual order and source order should match. Do not use `order` or grid placement to change the reading order, because keyboard and screen reader users follow the source.
7. **No sideways scrolling.** Check at 320px wide. Find the element that causes overflow instead of hiding it with `overflow-x: hidden` on the body.

Widths worth testing: 320, 390, 768, 1024, 1440 and one very wide screen (1920 or more). Test also with the browser text size set to a larger value, and with the page zoomed to 200 percent.

## Navigation

- 3 to 5 links, one action. A long menu is a sign the structure is unclear.
- On narrow screens let the links wrap into two rows, or collapse them into a button with a menu only when there are too many to fit. A hidden menu costs a click and needs a script and careful accessibility work.
- Keep the logo link, the links and the action at least 44 by 44 CSS pixels on touch screens. See "Touch" below.
- Mark the current page with `aria-current="page"` and a visible style.
- If the header is sticky, make sure it does not cover anchor targets (`scroll-margin-top`) or take more than about a sixth of a phone screen.
- Add a "Skip to content" link as the first focusable element.

## Touch

- Buttons, navigation links and form controls: aim for **44 by 44 CSS pixels** on touch screens, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8, with exceptions such as links inside a sentence). This is the same rule as the `vyson-css-motion` skill.
- Add padding or `min-height` to get there, not a larger font.
- Leave at least 8px between targets that are close together.
- Hover effects belong in `@media (hover: hover) and (pointer: fine)`. Never hide important information behind a hover.
- Use `inputmode`, `autocomplete` and the right `type` on form fields so phones show the right keyboard.

## States

Every interactive element has all of these, and they are different from each other:

| State | Requirement |
|---|---|
| Default | Obviously interactive. A link in text is underlined. A button looks like a button. |
| Hover (devices that hover) | A clear but calm change of colour or underline |
| Focus (keyboard) | A visible 3px outline with an offset. Never remove it without a replacement (DL011). |
| Active (pressed) | A slightly darker colour or a small offset |
| Disabled | Lower contrast, `cursor: not-allowed`, and an explanation near the control if the reason is not obvious |
| Error | Colour **and** text. Linked to the field with `aria-describedby`. |
| Empty and loading | A short message, not a blank area |

This skill does not add animation for state changes. For animated feedback, use the `vyson-css-motion` skill.

## Forms

- A visible `<label>` for every field. Placeholders are hints, not labels.
- One column on phones. Group related fields.
- Make the field at least 44px tall, use a font size of at least 16px so iOS Safari does not zoom, and use a high-contrast border.
- Say what is required and what format is expected before the user types.
- Show errors next to the field, in text, and move focus to the first error on submit.
- Confirm success in text. Do not rely on colour or on an icon alone.
- A demo page without a server must not pretend to send data. Use a `mailto:` link or say that the form is a demo.

## Finishing details

These small things separate a finished site from a draft. Use the ones that fit; not every site needs all of them.

- **Favicon and `theme-color`**, and a social share image if the site will be shared. Name files plainly and put them in the project.
- **`<title>` and `<meta name="description">`** written for the page, not left as defaults.
- **`::selection` colours** from the palette.
- **Custom 404 and empty states** with the same voice as the rest of the site.
- **Consistent icon style**, or no icons. Do not mix outline and filled icons.
- **Hairlines and borders** at one thickness. Use 1px lines in `--vd-line`.
- **Print stylesheet** for pages that people print (contact details, price lists). Hide navigation, show link addresses.
- **Alignment of numbers** with `tabular-nums` in tables and lists.
- **Copy**: real, specific, in one voice. Check for filler text, dead links and made-up claims.
- **Footer**: complete and tidy. Contact, legal, copyright year, and nothing unfinished.
- **Cursor and selection**: do not restyle the scrollbar or the cursor in ways that surprise people.

## HTML quality

- Use landmarks: `header`, `nav`, `main`, `section` with a heading, `footer`.
- One `h1`, no skipped levels (DL008, DL009).
- Use `button` for actions and `a` for navigation. No `div` with a click handler.
- Give `html` a `lang` (DL001) and the head a viewport (DL002), a title (DL006) and a description (DL007).
- Images follow `color-and-imagery.md`: alt text, size attributes, local files.
- Decorative SVG gets `aria-hidden="true"` and `focusable="false"`.
- Lists are real lists (`ul`, `ol`), and data is a real `table` with headers.

## CSS quality

- **Tokens first.** Colours, fonts, space, radius and container width come from custom properties. A hard-coded value in a component is a smell.
- **A small, flat structure.** Reset, tokens, layout helpers, components, page rules, in that order. Class names describe the thing (`.project-row`), not the look (`.big-blue-text`).
- **Logical properties** (`margin-inline`, `padding-block`, `inline-size`) make right-to-left and vertical writing easier. Use them where they are as clear as the physical ones.
- **No `!important`** except to override a third-party rule you cannot change.
- **No fixed heights** on text containers. Let content decide.
- **No `100vw` for width** (DL018) and no layout built from absolute positions and magic numbers.
- **Newer CSS features** (container queries, `:has()`, `text-wrap`, `oklch()`) are an optional layer on top of a working baseline. State which you used and what older browsers see. Do not make the page depend on them without checking support.
- Remove unused CSS, comments that describe the wrong thing and leftover experiments.
- Keep the diff small when you work inside an existing project. Do not restyle parts the user did not ask about.

## Performance basics

This skill sets simple habits. It does not measure speed, and you must not state a speed score that you did not measure.

- Few requests: one stylesheet, no unused libraries, no web font unless the direction needs it.
- Images sized correctly, with `loading="lazy"` below the first screen.
- No render-blocking scripts for a static page. Use `defer` or `type="module"` for the scripts you need.
- Reserve space for images and embeds (width and height, `aspect-ratio`).
- Do not use a framework for a page that is mostly text, unless the project already does.
- Keep third-party scripts out unless the user asked for them and understands the privacy effect.

Measure with the browser's tools, or say "performance not measured".
