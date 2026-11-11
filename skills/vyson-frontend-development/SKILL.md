---
name: vyson-frontend-development
description: Builds the working, interactive parts of a website reliably and accessibly with an AI coding agent. Starts from semantic HTML that works without JavaScript, then adds forms with proper validation, data loading with loading, empty and error states, dialogs and other widgets, safe DOM updates, and basic security hygiene, using two small helper modules and a static checker. Use when a user asks to build or fix site behaviour such as a contact or signup form, validation, search or filter, fetching data from an API, a modal, tabs or menu, a bug in page JavaScript, or when choosing between plain JavaScript, React, Next.js, Vue or Vite for a site. Has guidance for plain JavaScript, React, Next.js and Vue. Not for visual design (use vyson-premium-website-design), CSS animation (use vyson-css-motion), 3D scenes, or full audits of a finished site.
license: MIT
metadata:
  vyson-pillar: "frontend"
  vyson-version: "0.1.0"
  vyson-status: "draft"
---

# VYSON Frontend Development

Helps an AI coding agent build the behaviour of a website so that it works for every visitor and fails politely. The method: start with HTML that already works, add JavaScript as an upgrade, show every state (loading, empty, error, success), keep data out of `innerHTML`, and check the result honestly.

Detail lives in five reference files, four helper modules and one static checker. Read them when the steps tell you to.

## When to use

- "Add a contact / signup / booking form with validation."
- "Fetch data from this API and show it." "Add search, filters or pagination."
- "Build a modal, tabs, a dropdown menu, a mobile nav, a disclosure."
- "My form submits twice / the list flashes / the page breaks when the server is slow."
- "Should this be plain JavaScript, React, Next.js or Vite?" (for a site, not a large application)

## When not to use

- **Visual design.** Layout, type, colour and imagery: use `vyson-premium-website-design` if it is installed. This skill makes things work; it does not decide how they look beyond clear states.
- **Animation.** Entrance effects, transitions and scroll reveals: use `vyson-css-motion` if it is installed. This skill can use `<details>` or `<dialog>` for behaviour, but it adds no animation.
- **3D and canvas.** Use `vyson-3d-interactive-web` if it is installed.
- **Auditing a finished site** for accessibility, speed, links and SEO: use `vyson-website-quality-engineering` if it is installed. This skill carries its own small checker for code-level problems only.
- Back-end work (databases, authentication servers, payments). This skill covers what runs in the browser and how it talks to a server. When a task needs a server, say what the server must do and do not pretend the browser can do it.
- Large web applications with routing, state libraries and a team's architecture rules. Follow the project's existing patterns and keep your changes inside them.

## The frontend contract

A feature is finished only when all five are true.

- **It works without JavaScript where it can.** Real `<a>`, `<form>`, `<button>`, labels and native validation attributes first. JavaScript upgrades them. If a feature truly needs JavaScript, say so, and show a clear message when it is off.
- **Every asynchronous thing has four states.** Loading, success, empty and error, each visible and each reachable by keyboard and screen reader. Errors say what happened in plain words and offer a retry. No blank areas and no spinners that never end.
- **Visitors cannot inject code.** No variable ever goes into `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`. No `eval`. No secret in client code.
- **It is keyboard and screen-reader usable.** Real controls, labels, visible focus, focus moves where the user expects (into a dialog, to an error summary), messages announced with `role="status"` or `role="alert"`, and touch targets of 44 by 44 CSS pixels (never under 24 by 24).
- **It is robust.** Double clicks, slow networks, a failed request, an empty answer, the back button and a page refresh all behave.

The numbers in this skill are VYSON defaults, not measured results. Do not claim that something is "secure", "fully accessible" or "production-ready". Say what was and was not checked.

## How this skill runs

Default: **understand, plan internally, implement, verify, present.** When the user asks for a working site or feature, build it in the project in one pass. Do not stop at recommendations, and do not ask the user to approve architecture or small choices: decide, build, and explain the decisions in the report.

- **Your lane.** You turn the designed pages into a working site: file and component structure for the project's framework, navigation, forms, data, dialogs, tabs and menus, with every state. You keep the visual design (use its tokens and classes; do not restyle). No 3D and no animation: those are `vyson-3d-interactive-web` and `vyson-css-motion`. Leave clean hooks for them (stable class names, an empty container with a fallback for a scene) and write the hand-off in `VYSON-NOTES.md`.
- **Read first.** `package.json`, the entry files, existing components and pages, the CSS tokens, and the "Design" section of `VYSON-NOTES.md` if it exists.
- **No real backend?** Use a local data file or a clearly labelled stub, and list what a real server must do. Never post to an invented address or submit a real form.
- **Ask only when blocked**, meaning there is nothing to build in or a required value only the user has (a real API address they asked you to use, with no way to find it). One short question. Otherwise choose a default and list it in the report.
- **Ask first only for** committing, pushing, deploying, deleting or replacing important user files, real submissions or real data, changing credentials, and adding a paid, closed-licence or tracking dependency.

Defaults, stack placement, the hand-off format and a worked example: [workflow.md](references/workflow.md). The one-paste prompt for this skill: [prompt.md](references/prompt.md).

## Before you start

Work out answers from the project and read its files. Ask nothing unless you are blocked (see above).

1. **Find the stack.** Plain HTML, Vite, Next.js, React, Vue or Nuxt, something else? Package manager, Node version, test and lint commands, TypeScript or not. Follow what is there.
2. **Find the data.** Is there an API? Its address, the shape of its answers, its errors, whether it needs a key or cookie. If there is no real API, use a local file or a clearly labelled stub and say so.
3. **Find the rules.** Required fields, limits, what happens on success, where data goes. Never invent a server endpoint and present it as real.
4. **Find the privacy facts.** What personal data is collected, where it goes, and whether a notice is needed. Do not add analytics, trackers or third-party scripts the user did not ask for.
5. **Find the browsers that matter.** If unknown, assume current Chrome, Edge, Firefox and Safari, and treat newer features as optional with a fallback.

## Steps

### 1. Choose the stack and structure

Use the project's stack. For a new small site, use plain HTML, CSS and ES modules, and add a framework only when the interface needs it (see [project-and-stack.md](references/project-and-stack.md)). Keep the diff small: do not restructure files the user did not ask about. Prefer no new dependency. If one is truly needed, check its licence on its official listing, pin the version, add it and list it in the report; ask first only if it is paid, closed-licence or tracks visitors.

### 2. Write the markup first

Build the HTML that works with no script: landmarks, headings, real links, `<form>` with `action` and `method`, `<label>` for every control, native validation attributes, `<button type="button">` for actions. See [html-forms-and-widgets.md](references/html-forms-and-widgets.md). Prefer native elements (`<dialog>`, `<details>`, `<select>`) to custom widgets.

### 3. List the states

For each feature write down: idle, loading, success, empty, error, and (for forms) invalid and submitting. For each state decide what the visitor sees and hears. See [state-data-and-errors.md](references/state-data-and-errors.md).

### 4. Add behaviour

Copy [assets/fetch-state.js](assets/fetch-state.js) for data loading (status checks, timeout, cancellation, stale-answer protection, loading, empty and error states) and [assets/form-helpers.js](assets/form-helpers.js) for forms (inline errors, error summary, double-submit guard, status line). In a React or Vue project use the hook or composable instead ([frameworks.md](references/frameworks.md): `assets/use-fetch-state.react.js` or `assets/use-fetch-state.vue.js`, which also need `fetch-state.js`). Change them to fit the project's style, and keep their safety properties. Build DOM with `createElement` and `textContent`. Attach listeners with `addEventListener`, never inline `onclick` attributes.

### 5. Forms

Follow the form recipe in [html-forms-and-widgets.md](references/html-forms-and-widgets.md): visible labels, `autocomplete` hints, the right `type` and `inputmode`, inline messages linked with `aria-describedby`, an error summary that takes focus, a status line, a guard against double submit, and validation that the server repeats. Browser validation is a convenience, not security.

### 6. Failure and edge cases

Work through the list in [state-data-and-errors.md](references/state-data-and-errors.md): slow, offline, 4xx and 5xx, empty, a double click, a second request replacing the first, back and refresh, and a very long or odd input. Test each you can.

### 7. Security and privacy pass

Go through [quality-and-security.md](references/quality-and-security.md): untrusted data, secrets, storage, third-party scripts, links, cookies and what only a server can do. Do not store tokens in `localStorage`.

### 8. Run the checks

Run the bundled static checker on the folder with the site's HTML and JavaScript:

```powershell
node skills/vyson-frontend-development/scripts/frontend-lint.mjs path/to/site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-frontend-development/scripts/frontend-lint.mjs`). Fix every `FAIL` line. Read every `WARN` line and fix it or explain why it stays. A reviewed false alarm can be silenced with `// vyson-ok: FD002 reason` on the line or the line above.

**This is a static check.** It reads text. It never runs your code, opens a browser or reviews security, and passing it is not a test of behaviour.

Then run the project's own tests, linter and build if they exist, and do the browser steps in [quality-and-security.md](references/quality-and-security.md): the keyboard path through every feature, each state (use the browser's offline and slow-network settings), 320 and 390 width, and no console errors. Module scripts do not load from a page opened by double-clicking it, so serve the folder with the project's dev server. If you cannot run a browser, say "browser test: not performed" and list the steps you skipped. Keep static checks, automated tests and browser tests in separate lists.

### 9. Report

Finish with a short report in plain language: what was built and which stack, the states that exist for each feature, the static result (paste the last `RESULT` line), the project tests and build you ran, the browser steps done and not done, the dependencies added with licences, and anything the visitor's browser cannot enforce (what the server must check). Never claim "secure" or "bug-free".

## Common mistakes

| Mistake | Why it hurts | Instead |
|---|---|---|
| `div` or `span` with an `onclick` | Not focusable, no role, no keyboard | `<button type="button">` or `<a href>` |
| Placeholder as the label | It vanishes while typing and is not announced reliably | A visible `<label for>` |
| `element.innerHTML = userText` | Cross-site scripting | `textContent`, or `createElement` |
| `fetch()` with no `response.ok` check | A 404 or 500 is treated as success | Check the status and show an error state |
| Spinner with no error path | The visitor waits forever | Timeout, error message, retry |
| Disabling the submit button while sending | Keyboard focus is lost | `aria-disabled` plus a guard |
| Validating only in the browser | Anyone can skip it | The server validates again |
| Secrets or tokens in client code or `localStorage` | Any visitor or script can read them | Keep them on the server, use HttpOnly cookies |
| Trusting a slow answer that arrives late | An old search overwrites a new one | Cancel the old request, ignore stale answers |
| A framework added for one form | More code, more risk, slower page | Plain HTML and a small module |
| "It works on my machine" | Only the happy path was tried | Test the states and the keyboard path |

## Output

- Working HTML, CSS and JavaScript (or the project's equivalent), the helper modules copied into the project, and any local data or stub files, clearly labelled.
- A report as in step 9, and the "Frontend" section of `VYSON-NOTES.md` (the hand-off).
- No remote scripts, no tracking, no telemetry. No dependency added without telling the user.

## Acceptance checks

The work is finished only when all of these are true:

- [ ] The working site is built in the project (not only described), the existing design was kept, and no approval was requested for choices the skill could make.
- [ ] The page works with the native HTML first: forms have `action`, `method`, labels and native validation attributes.
- [ ] Every control has a visible label and a name, and nothing relies on a placeholder as a label.
- [ ] Every asynchronous feature shows loading, empty, error (with retry) and success states.
- [ ] Network calls check the status code, time out, and ignore stale answers.
- [ ] No variable is written into `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`, and there is no `eval`.
- [ ] No secret, key or token is in client code, and tokens are not in `localStorage`.
- [ ] Forms show inline errors linked to their fields, an error summary that takes focus, a status message, and guard against double submit.
- [ ] Every action is a real button or link, reachable with `Tab`, with visible focus and a touch target of at least 44 by 44 CSS pixels (never under 24 by 24).
- [ ] Dialogs trap focus while open, close with `Escape`, and return focus to what opened them (native `<dialog>` does this).
- [ ] No console errors or unhandled promise rejections in the states you tested.
- [ ] `frontend-lint.mjs` (a static check) reports no `FAIL` lines.
- [ ] The report keeps static checks, project tests and browser tests apart, and states what was not tested and what the server must enforce.

## Accessibility

- Names and labels: every control has a visible label. Icon buttons have an `aria-label`.
- Keyboard: every control works with `Tab`, `Enter` and `Space`. Focus order follows the visual order. Focus goes into a dialog when it opens, to the error summary when a form fails, and back to the trigger when a dialog closes.
- Announcements: loading and success messages use `role="status"`; errors that need attention use `role="alert"`. Do not announce every keystroke.
- Errors: say what is wrong and how to fix it, next to the field, linked with `aria-describedby`, and never by colour alone.
- Touch: 44 by 44 CSS pixels to aim for, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8, with exceptions such as links inside a sentence).

## References

Load these only when needed. They are one level deep and do not link to each other. Read `frameworks.md` when the project uses React, Next.js or Vue.

- [workflow.md](references/workflow.md): defaults to decide alone, when you are blocked, safeguards, structure per stack, the hand-off section, a worked example.
- [prompt.md](references/prompt.md): the single prompt a user pastes to run this skill.
- [project-and-stack.md](references/project-and-stack.md): reading a project, choosing a stack, structure, dependencies, local servers, progressive enhancement.
- [html-forms-and-widgets.md](references/html-forms-and-widgets.md): semantic HTML, the form recipe, native dialog and details, tabs and menus.
- [state-data-and-errors.md](references/state-data-and-errors.md): the states of async UI, fetching, stale answers, retries, storage, URL state, edge cases.
- [quality-and-security.md](references/quality-and-security.md): the checker rules, security and privacy basics, performance basics, testing and the browser steps.
- [frameworks.md](references/frameworks.md): the same job in plain JavaScript, React, Next.js and Vue, the two adapters, mistakes per framework, public build-time settings.
- [assets/fetch-state.js](assets/fetch-state.js): `fetchJson`, `describeError`, `createLatest`, `loadInto` (no dependencies).
- [assets/use-fetch-state.react.js](assets/use-fetch-state.react.js) and [assets/use-fetch-state.vue.js](assets/use-fetch-state.vue.js): a React hook and a Vue 3 composable on top of `fetch-state.js`.
- [assets/form-helpers.js](assets/form-helpers.js): `enhanceForm`, `messageFor`, `createSubmitGuard` (no dependencies).
- [scripts/frontend-lint.mjs](scripts/frontend-lint.mjs): the static checker (15 rules, FD001 to FD015). Needs Node.js 22 or newer, no installation.

## Licensing notes

This skill includes no third-party code. It mentions React, Next.js, Vue, Vite and Tailwind CSS as options a project may already use (React, Next.js and Tailwind CSS are MIT licensed, read on 10 November 2026, and Vite and Vue are MIT licensed, read on 11 November 2026; check any other library's licence from its official source before recommending it). Add a library only with the user's agreement, at a pinned version, and record its licence. The helper modules and the checker are MIT licensed, like the rest of this repository.
