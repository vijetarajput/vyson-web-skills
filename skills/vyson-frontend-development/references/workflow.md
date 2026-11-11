# Workflow, defaults and hand-off

How to run this skill in one pass, build a complete working site from a designed one, and leave hooks for the next VYSON skills.

Contents: the five phases, decisions you make alone, when you are really blocked, safeguards, structure per stack, the hand-off section, a worked example.

## The five phases

| Phase | What you do |
|---|---|
| Understand | Read `package.json`, the entry files, pages, components, CSS tokens and `VYSON-NOTES.md` (its "Design" section says which tokens, sections and hooks exist). Find the dev, build, test and lint commands. |
| Plan internally | List the pages, the shared pieces (header, footer, buttons), and every feature with its states: idle, loading, success, empty, error, and for forms invalid and submitting. |
| Implement | Markup first, then the shared structure, then behaviour feature by feature using the helper modules. |
| Verify | `frontend-lint.mjs`, the project's own tests and build, then the browser steps from the quality reference. Fix, then re-run. |
| Present | The report from step 9 of `SKILL.md`, plus the hand-off section. |

## Decisions you make alone

Never ask the user about these. Choose, say so in the report, and move on.

| Decision | Default rule |
|---|---|
| Stack | The project's stack. A plain HTML project stays plain HTML with ES modules. Never convert a working project to another stack. |
| Structure | One small module per job. In a component framework, one component per repeated piece (header, footer, card, form, dialog) and one file per page or route. |
| Navigation | Real links between real pages. A mobile menu built on a real button with `aria-expanded`, working without JavaScript where possible (a link list that is visible when scripts fail). |
| Forms | Native validation attributes first, the helper module for inline errors and the status line, double-submit guard. With no real endpoint, submit to a local stub that returns a labelled fake success, and say so in the report and next to the form in the page ("Demo: nothing is sent"). |
| Data | A local JSON file under `data/` with the fields the page reads, loaded through `fetch-state.js` (or the hook or composable). Four states for every list. |
| Widgets | `<dialog>`, `<details>` and real buttons before custom widgets. Tabs with the standard roles and arrow keys only when tabs are truly needed. |
| Dependencies | None. If one is truly needed, use an open licence, pin it and list it. |
| Shared look | Use the design tokens and existing classes. A missing state style (error, loading) is added using the same tokens, not a new look. |

## When you are really blocked

You are blocked only when nothing can be built (no project folder and no description) or when a value only the user has is required and cannot be stubbed (a real API address they asked you to call). Ask one short question. Otherwise stub, build and report what the real server must do.

## Safeguards (these still apply)

- Do not commit, push, deploy or publish.
- Do not delete or replace files that hold the user's work. Edit in place.
- Do not submit a real form, send real data, call an API you were not given, or add analytics or trackers.
- Never put a secret, key or token in client code.
- Do not restyle the design, and do not add animation or 3D. Leave the hooks.

## Structure per stack

| Stack | Where things go |
|---|---|
| Plain HTML | `index.html` and one `.html` file per page; `scripts/` with one ES module per job (`menu.js`, `contact-form.js`, `fetch-state.js`, `form-helpers.js`); `data/` for local JSON. Keep header and footer markup identical on every page. |
| React with Vite | `src/components/` for repeated pieces, `src/pages/` or `src/sections/` for pages, `src/hooks/` for `use-fetch-state.react.js`, `data/` or `public/data/` for local JSON. |
| Next.js | App Router: `app/<route>/page.js`, shared pieces in `components/`. Anything that uses state, effects or browser APIs is a client component (`'use client'` at the top). Keep static pages as server components. Only variables that start with `NEXT_PUBLIC_` reach the browser, so never put a secret there. |
| Vue with Vite | `src/components/`, `src/views/`, `src/composables/` for `use-fetch-state.vue.js`. Never `v-html` with a variable. |
| Nuxt | `pages/`, `components/`, `composables/`. `runtimeConfig.public` is visible to every visitor. |

For hooks the later steps need, keep these stable and write them in the hand-off: a container for a scene with a fallback inside it, class names for the elements meant to move, and ids for the elements the 3D scene must not cover.

## The hand-off section

Everything the later steps need goes into one file at the project root, `VYSON-NOTES.md`. Create it if it is missing. Edit only your own section. Never delete another skill's section.

```markdown
## Frontend (vyson-frontend-development)
- Stack: <framework or plain>. Run: <dev command>. Build: <build command>. Output folder: <path>.
- Pages and routes: <list>. Shared components: <list>.
- Features and their states: <form, list, menu, dialog: which of loading/empty/error/success exist>
- Data: <local file or stub path>. What a real server must do: <list>.
- Hooks for later steps: <scene container id, elements meant to move>
- Dependencies added: <name, licence, version, or none>
- Not tested: <list>
```

If the user wants no extra files, put the same text in the report.

## Worked example

This is an invented walk-through of the method, not a record of a real run.

Request: "Make the Fieldwork ceramics site work." Step 1 left a plain HTML page and a Design section in `VYSON-NOTES.md`.

- Understand: plain HTML, `styles/tokens.css`, one page, a "Visit the studio" section with a plain contact form, a "Featured pieces" list with fixed cards.
- Plan: add pages `shop.html` and `visit.html`, a mobile menu, a working contact form with a stub, and make the shop list load from `data/pieces.json`.
- Implement: `scripts/menu.js`, `scripts/contact-form.js` using `form-helpers.js`, `scripts/shop.js` using `fetch-state.js`, `data/pieces.json` with fields `name`, `price`, `note`. Every list shows loading, empty and error states with a retry button. The form shows "Demo: nothing is sent".
- Verify: `frontend-lint.mjs` reports no FAIL lines; served over a local server; keyboard path, offline and slow-network states and 320 and 390 widths checked in a browser; no console errors.
- Present: pages, features and states, the static result, the browser steps run and not run, and what a real server would have to check. Hand-off section written.
