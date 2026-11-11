# Tools and automation

Read this in steps 2 and 3, and when the user wants the checks to be repeatable.

## The two bundled tools

Both are single Node.js files (Node.js 22 or newer) that use only what is built into Node. They download nothing, send nothing and need no installation. Use the paths from where the skill is installed (for example `.agents/skills/vyson-website-quality-engineering/scripts/`).

| | `site-audit.mjs` | `browser-check.mjs` |
|---|---|---|
| Kind | Static audit | Browser test |
| Reads | `.html` and `.css` files and file sizes in a folder | A page, opened in a real headless Chrome or Edge |
| Needs | Node.js | Node.js and a Chrome or Edge already on the computer |
| Network | None | None, except `127.0.0.1` for its own file server. A page on another website opens only with `--allow-remote` |
| Command | `node site-audit.mjs <folder>` | `node browser-check.mjs <folder>` |
| Common options | `--strict` (warnings count as errors), `--json` | `--page`, `--widths`, `--screenshots <folder>`, `--browser <path>`, `--strict`, `--json` |
| Exit code | 0 no errors, 1 errors, 2 wrong use | 0 no errors, 1 errors, 2 wrong use, 3 the test could not be run (for example, no browser found) |

Run `--help` on either for the full list.

### How `browser-check.mjs` works

It starts the installed browser with a temporary profile, opens the page over the browser's own debugging protocol, and removes the profile when it finishes. For each width it sets the screen size (touch emulation at 768 or below), loads the page and measures. At the widest desktop width it presses Tab up to 50 times and records where focus goes. It then repeats the page with reduced motion on and looks for animations that still run. Pages that use module scripts or `fetch()` need the folder mode (the default), because they do not load from a double-clicked file.

It checks one page per run. For a site with several pages, run it once per page type with `--page`.

### What both tools cannot do

- They do not see the design. A page can pass and still look wrong.
- They cannot judge wording, alt text quality, reading order or colour contrast in context.
- `site-audit.mjs` does not follow links to other websites. A link to another site can still be dead.
- `browser-check.mjs` is one run. Layout shift and LCP are lab numbers, not field data.
- Neither runs a screen reader, Firefox, Safari or a real phone.

## Rules of `site-audit.mjs`

| Rule | What it reports | Severity |
|---|---|---|
| QA001 | Broken link to a page or file on this site | error |
| QA002 | A file the page needs is missing | error |
| QA003 | Link to a section that does not exist | warning |
| QA004 | The same id is used twice on a page | error |
| QA005 | The page has no language | error |
| QA006 | No viewport tag, or the viewport blocks zooming | error |
| QA007 | The page has no title | warning |
| QA008 | Several pages share the same title | warning |
| QA009 | The page has no meta description | warning |
| QA010 | The page does not have exactly one h1 | warning |
| QA011 | A heading level is skipped | warning |
| QA012 | Image without an alt attribute | error |
| QA013 | Image without width and height | warning |
| QA014 | Form field without a label | error |
| QA015 | Button or link with no accessible name | warning |
| QA016 | Positive tabindex | warning |
| QA017 | A link goes nowhere | warning |
| QA018 | The page asks search engines not to index it | warning |
| QA019 | No favicon | warning |
| QA020 | No Open Graph title or description | warning |
| QA021 | Placeholder text | warning |
| QA022 | A resource is loaded over insecure http | error |
| QA023 | A resource is loaded from another website | warning |
| QA024 | A script in the head blocks the page | warning |
| QA025 | A file is large | warning |
| QA026 | A page and its local files add up to a lot | warning |
| QA027 | Focus outline removed with no replacement | warning |
| QA028 | Animation but no reduced-motion rule | warning |

## Rules of `browser-check.mjs`

| Rule | What it reports | Severity |
|---|---|---|
| BC001 | The page did not load | error |
| BC002 | JavaScript errors in the console | error |
| BC003 | A request failed | error |
| BC004 | The page scrolls sideways at this width | error |
| BC005 | A control is under 24 by 24 CSS pixels on a touch width | error |
| BC006 | A control is under 44 by 44 CSS pixels on a touch width | warning |
| BC007 | Keyboard focus is not visible on a Tab stop | error |
| BC008 | Keyboard focus got stuck | error |
| BC009 | A broken image | error |
| BC010 | Text under 12px | warning |
| BC011 | Body text under 16px on a phone-sized screen | warning |
| BC012 | The layout shifted while loading | warning |
| BC013 | Animation keeps running with reduced motion | warning |
| BC014 | The page talks to other websites | warning |

The checks are text patterns and measurements from one run, so they can miss problems and flag code that is fine. A missing favicon request is reported by QA019 (static), not by BC003.

## Optional tools

Use these only if the project has them or the user agrees to add them. Adding a dependency changes the user's project, so ask first, and record the licence.

| Tool | Licence (from THIRD_PARTY.md) | Good for | Limit |
|---|---|---|---|
| Lighthouse | Apache-2.0 | Lab performance and a set of accessibility and SEO checks, in Chrome DevTools or the command line | One page, one run, a score is not proof |
| axe-core | MPL-2.0 | More automated accessibility rules than the bundled tools, including some contrast checks | Finds only the problems a program can see |
| Playwright | Apache-2.0 | Repeatable browser tests on Chromium, Firefox and WebKit; screenshots; clicking through a flow | Needs installing browsers (a large download); someone must write the tests |

Check each tool's current licence and version yourself before use; the table is a record, not a guarantee.

## Making the checks repeatable

If the user wants to re-run the checks before every release, there are two light options. Offer them; do not add them silently.

1. **Two commands in the README.** The project's release steps list the two commands from this file with the project's real folder.
2. **Two `package.json` scripts**, for example `"audit": "node tools/site-audit.mjs dist"` and `"check:browser": "node tools/browser-check.mjs dist"`, after copying the two files into the project. Keep "audit" (static) and "browser" in the names so nobody mistakes one for the other.

For continuous integration (a check on every push), the static audit runs anywhere Node runs. The browser check needs a Chrome or Edge on the runner (check that yours has one) or `--browser <path>`. If the browser is missing, the tool prints "NOT PERFORMED" and exits with 3. Do not treat that as a pass.

Keep the tools in the repository so the version is known. Do not run them from a copy fetched at run time.

## Safe use of the tools

- `browser-check.mjs` serves only the folder you give it, on `127.0.0.1`, for the length of the run.
- It uploads nothing. The only files it writes are the screenshots you ask for.
- A page on another website is opened only with `--allow-remote`. Do not point it at sites you do not own or have permission to test.
