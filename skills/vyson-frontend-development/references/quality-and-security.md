# Checks, security and performance basics

Three kinds of checking exist, and the report keeps them apart:

1. **Static check.** `scripts/frontend-lint.mjs` reads text. It never runs your code.
2. **Project tests.** The project's own test runner, linter and build, if any.
3. **Browser test.** A real browser, used by hand, with each state and the keyboard.

Passing the first is not passing the others. Say which you ran.

## What the static checker covers

| Rule | What it reports | Severity |
|---|---|---|
| FD001 | Form control without a label | error |
| FD002 | HTML is built from a variable | error |
| FD003 | eval, new Function or a javascript: link | error |
| FD004 | A secret appears to be written into client code | error |
| FD005 | fetch without a status check | warning |
| FD006 | fetch without error handling | warning |
| FD007 | Click handler on an element a keyboard cannot reach | warning |
| FD008 | Inline event handler attribute | warning |
| FD009 | Button or link with no accessible name | warning |
| FD010 | A script in the head blocks the page | warning |
| FD011 | A script is loaded from another website | warning |
| FD012 | A personal-data field has no autocomplete hint | warning |
| FD013 | Debugging code left in | warning |
| FD014 | A token or password is stored in localStorage or sessionStorage | warning |
| FD015 | A password form does not use POST | error |

It matches text patterns, so it can miss a problem and can flag code that is fine (for example an escaped value in a template). Review each finding. When one is a reviewed false alarm, add `// vyson-ok: FD002 <reason>` on the same line or the line above. A reason is expected and will be read in review.

It cannot see: whether a request really checks the status, whether focus moves correctly, whether a message is announced, whether a server validates, whether a dependency is vulnerable, or anything in framework templates it does not read.

## Security and privacy basics (browser side)

These are habits, not a security review. Say "no security review was done" in the report.

- **Untrusted data.** Everything that comes from a visitor, a URL, storage or an API is untrusted. Show it with `textContent`. If you must render HTML from a source, sanitize it with a maintained library (check its licence) and say so in the report. Escaping by hand is easy to get wrong.
- **No code from strings.** No `eval`, `new Function`, `setTimeout("code")`, or `javascript:` addresses.
- **Secrets.** Client code is public. Keys, tokens and passwords belong on a server. If a third party gives you a browser key, restrict it (by site address) in that service and know what it allows.
- **Storage.** Do not keep tokens or personal data in `localStorage` or `sessionStorage`, because any script on the page can read them. Sessions use an HttpOnly cookie set by the server (with `Secure` and a `SameSite` setting). Setting cookie flags is a server job.
- **Links.** Build addresses with `URL` and `URLSearchParams`. Check that an address you take from data starts with `https:` (or `http:`) before using it as a link or an image source. Add `rel="noopener noreferrer"` to links that open a new tab if you need to support old browsers, and to links to sites you do not control.
- **Third-party scripts.** Each one runs with full power over your page and your visitors. Prefer none. If one is needed, pin a version, host a local copy when the licence allows, or add `integrity` and `crossorigin`. Ask the user before adding analytics, chat widgets, tag managers or fonts from other websites, and mention what they send.
- **Forms and CSRF.** A form that changes data needs a server that checks where the request came from (a token or `SameSite` cookies). The browser code alone cannot provide that. Say what the server must do.
- **Content Security Policy.** A strict policy is set by the server in a header and blocks inline scripts and many injection attacks. Code with no inline handlers and no inline scripts works with one. Setting it is outside this skill, but you can make it possible.
- **Dependencies.** Fewer is safer. If the project uses npm, run its audit command (`npm audit`) and report the result, without claiming it finds everything. Do not run it unless the project already has a lock file, and do not upgrade packages without asking.
- **Privacy.** Collect only what the form needs, say why, and say where it goes. Do not add trackers, session recording or fingerprinting. Do not log personal data to the console.

## Performance basics

Say "not measured" unless you measured it.

- Load scripts with `defer` or `type="module"`, and keep them small. Do not ship a framework for a form.
- Do not block rendering with a script in the head.
- Give images `width` and `height`, and lazy-load those below the first screen.
- Do not do heavy work in event handlers. Debounce typing, and avoid layout reads inside loops.
- Avoid layout shift: reserve space for content that loads later (a `min-height` on the results region).
- Remove listeners and timers you no longer need.

## Testing

- **Pure logic** (formatting, validation rules, filters): test with the project's runner. If there is none, Node's built-in `node --test` runs files with `import { test } from 'node:test'`, with no dependency. Write the function so it does not touch the page.
- **Behaviour in the page:** a browser test by hand (below), or the project's existing end-to-end tool. Do not add Playwright or Cypress to a project that has none without asking.
- A test you did not run is a test you did not do. Say so.

## The browser steps

Run these in a real browser, with the page served (modules and `fetch` do not work from `file://`). Label them **browser test** in the report.

1. **Keyboard.** Using only `Tab`, `Shift+Tab`, `Enter`, `Space` and `Escape`, do everything the page offers. Focus is visible and in a sensible order. A dialog traps focus, closes on `Escape` and returns focus to its opener.
2. **Each state.** Make each state happen: loading (DevTools, Network, slow network), empty, error (offline, or block the request), invalid form, valid form, failing submit. Read each message as a visitor would.
3. **Double actions.** Click or press `Enter` twice on submit. Only one request is sent (Network tab).
4. **Stale answers.** Change a filter twice quickly under slow network. The last choice wins.
5. **Console.** No errors and no unhandled promise rejections during all of the above.
6. **Small screens.** 320 and 390 CSS pixels wide: no sideways scrolling, controls at least 44 by 44 CSS pixels (never under 24 by 24).
7. **Zoom.** 200 percent browser zoom still works.
8. **Without JavaScript.** Reload with JavaScript disabled. Content, links and forms still make sense, or a clear message appears.

If a step was not performed, write "not performed" and name it. Do not call a feature "fully accessible" or "secure".

## How to report

Keep three lists:

- **Static check:** the last `RESULT` line, and any findings left with the reason.
- **Project tests and build:** the commands you ran and their results, or "none exist".
- **Browser test:** the steps you did, the steps you did not, and the browser and device used.

Then add: dependencies added (name, version, licence), what the server must enforce, and what was not checked.
