# Launch check: Pinewick Bakery demo site, 11 November 2026

This is the report the skill asks for, filled in for the two folders in this example. The numbers are copied from the tool output files next to it. It is a sample of the format; the site is made up.

**Decision: ready for this demo, with the limits below.** Both tools report 0 errors and 0 warnings on `site-after/`. That means the problems these two tools can find are fixed. It does not mean the site is accessible, fast or finished.

## Static audit (`site-audit.mjs`, 3 pages)

| | Result line |
|---|---|
| Before (`site-before/`, 2 pages) | `RESULT: FAILED. 10 errors, 24 warnings.` |
| After (`site-after/`, 3 pages) | `RESULT: PASSED. 0 errors, 0 warnings.` |

The 10 errors were: no `lang` on two pages (QA005), a viewport tag that blocks zooming (QA006), an `http` stylesheet (QA022), two broken links (QA001: `about.html` does not exist, and `Menu.html` is spelled with a capital letter that the real file name does not have), an image with no `alt` (QA012), a form field with no label (QA014), a duplicate id (QA004) and a missing image file (QA002).

The warnings included: duplicate titles, missing descriptions and link previews, no favicon, a blocking script, two `h1` headings and skipped heading levels, a `href="#"` link, an unnamed icon button, images without width and height, placeholder text, a `noindex` left on the menu page, a positive `tabindex`, a removed focus outline and animation with no reduced-motion rule.

## Browser test (`browser-check.mjs`, Chrome 157 headless, Windows 10, home page, widths 320, 390, 768, 1280, 1440)

| | Result line |
|---|---|
| Before | `RESULT: FAILED. 12 errors, 13 warnings.` (a finding repeated at several widths counts once per width) |
| After | `RESULT: PASSED. 0 errors, 0 warnings.` |

Found in the browser, and not by the static audit: the page scrolled sideways at 320 and 390 wide (728 px, caused by a fixed-width table); six links and buttons were under 24 by 24 CSS pixels at touch widths; keyboard focus was invisible on every Tab stop; one animation kept looping with reduced motion on; the font request failed.

## What was changed

| File | Change |
|---|---|
| all pages | Added `lang="en"`, a fixed viewport tag, unique titles, descriptions and link-preview tags, a favicon, a skip link, and `header`, `nav`, `main` and `footer` landmarks. |
| `index.html` | One `h1`, headings in order, alt text and sizes on images, the table became a list, the form field got a label, ids made unique, the script got `defer`, the empty link and unnamed button were replaced. |
| `menu.html` | Removed `noindex` and the positive `tabindex`, fixed the heading order, removed the missing image, gave the in-page link a real target. |
| `about.html` | Added, so that the link to it works. |
| `styles.css` | 16 px text, 44 px tall links and fields, a visible focus outline, no sideways overflow, and a reduced-motion rule. |
| `app.js` | The form says "This is a demo, so nothing was sent." instead of doing nothing. |

Wording on the pages was kept, apart from the placeholder text, which was removed.

## Manual checks

Not performed. The example was checked by tools only. Keyboard order, 200 percent zoom, reading order and colour contrast should be checked by hand before a real launch (see `references/accessibility-checks.md` in the skill).

## Not tested at all

A real phone, Firefox, Safari, a screen reader, a slow network, field data, the `menu.html` and `about.html` pages in the browser test (the browser check opened `index.html`), colour contrast, and compression and cache headers (there is no server).
