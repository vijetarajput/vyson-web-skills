# Accessibility checks

Read this in step 4. The tools find some problems. A person has to find the rest. This file lists both, so the report says which was which.

## What the bundled tools cover

| Area | Static audit (`site-audit.mjs`) | Browser test (`browser-check.mjs`) |
|---|---|---|
| Page language | QA005 | |
| Zoom blocked by the viewport tag | QA006 | |
| Page title, headings | QA007, QA008, QA010, QA011 | |
| Image alt text present | QA012 | BC009 (broken images) |
| Form field has a label | QA014 | |
| Button or link has a name | QA015 | |
| Positive tabindex | QA016 | |
| Links that go nowhere | QA017 | |
| Focus outline removed | QA027 | BC007 (focus not visible on a Tab stop) |
| Keyboard trap | | BC008 |
| Tap-target size (WCAG 2.2 SC 2.5.8: never under 24 by 24 CSS pixels, aim for 44 by 44) | | BC005, BC006 |
| Small text | | BC010, BC011 |
| Reduced motion | QA028 | BC013 |

Passing all of these does not make a page accessible. They check that attributes exist, not that they are good: `alt="image"` passes, a label that says "field" passes.

## Manual checks

Do these in a real browser. Each takes a few minutes. Report what you did.

### Keyboard (WCAG 2.1.1, 2.4.3, 2.4.7, 2.4.11)

- Press `Tab` from the top of the page. Every link, button and field is reached once, in the order the page reads.
- Focus is always visible. It is not hidden behind a sticky header or cookie banner (a focused item should not be fully covered).
- `Enter` activates links and buttons, `Space` activates buttons, arrow keys work in menus and tabs that claim to be menus and tabs.
- Menus, dialogs and drawers open and close with the keyboard. `Esc` closes a dialog and focus returns to what opened it.
- There is a skip link on pages with a long header, and it works (`Tab` once, `Enter`, focus moves to the main content).

### Zoom and reflow (WCAG 1.4.4, 1.4.10, 1.4.12)

- Zoom the browser to 200 percent: text stays readable and nothing is cut off.
- At 400 percent zoom (a 320 CSS pixel wide view) the page reflows to one column without sideways scrolling. Data tables and maps may scroll.
- Set a larger default font in the browser settings, if you can: text grows and does not overlap.

### Reading order and names (WCAG 1.3.1, 2.4.6, 2.4.4, 1.1.1)

- Read the headings alone, top to bottom. They should outline the page.
- Link text makes sense alone: "Read the menu", not "Click here" or "More".
- Two links with the same text go to the same place.
- Each image's alt text says what the image is for in this place. Decorative images have `alt=""`. An image of text is rare and has its text as alt.
- Icon buttons have an `aria-label` or visible text, and the name matches what is shown.

### Colour and contrast (WCAG 1.4.3, 1.4.11, 1.4.1)

- Normal text reaches 4.5:1 against its background. Large text (about 24 CSS pixels, or 19 pixels bold) and interface parts (borders of fields, focus rings, icons that carry meaning) reach 3:1.
- Check text on images and gradients where the background varies. Check hover and disabled states you can see.
- Meaning is never carried by colour alone (an error is also worded; a link inside text is underlined or otherwise marked).
- Use a contrast checker the project already has, or a small calculation; do not eyeball it.

### Forms and errors (WCAG 3.3.1, 3.3.2, 3.3.3, 4.1.2)

- Every field has a visible label, not just a placeholder. Required fields are marked in words.
- Submit an empty form and a wrong form. Errors name the field and say how to fix it. Focus moves to the first problem or a summary. Entered values are kept.
- The right `type` and `autocomplete` are set (email, tel, name), so phones show the right keyboard and browsers can help.
- Success is announced in text, not only by a colour change.

### Motion and media (WCAG 2.2.2, 2.3.1)

- Anything that moves for more than five seconds on its own has a pause control, and nothing flashes more than three times a second.
- With `prefers-reduced-motion: reduce` turned on (DevTools, Rendering, emulate), nothing loops or slides by itself.
- Video and audio do not autoplay with sound. Videos have captions where there is speech.

### Names, roles and states (WCAG 4.1.2)

- Custom widgets (tabs, accordions, dialogs) use real buttons and the right `aria-expanded`, `aria-controls` or `<dialog>`/`<details>` behaviour. Prefer native elements; ARIA is for what native elements cannot do.
- Landmarks exist: one `main`, a `header`, a `nav` with a label if there are several.

## A screen reader

The tools do not run a screen reader, and neither should the report pretend they did. If the user can, a short pass with NVDA (Windows, free), VoiceOver (macOS and iOS) or TalkBack (Android) finds problems nothing else does. If nobody ran one, write "screen reader: not performed".

## Optional automated tools

axe-core (MPL-2.0) and Lighthouse (Apache-2.0) check more rules than the bundled tools, including some contrast checks. Run them if the project already has them; otherwise name them in the report as an optional next step (see tools-and-automation). Their results are still partial: say "axe-core found no violations in the rules it runs", not "no accessibility problems".

## What to write in the report

Good: "Static audit and browser check found no accessibility-related errors. Done by hand: Tab order, 200 percent zoom, contrast of the main text and buttons. Not performed: screen reader, keyboard use of the dialog, contrast on the hero image."

Bad: "The site is fully accessible." "WCAG AA compliant."
