# React, Next.js, Vue and plain JavaScript

The frontend contract in `SKILL.md` does not change with the stack. Only the spelling changes. Use the project's framework. Never add or switch one to follow this file.

Contents: the same job in each stack, the bundled adapters, the mistakes each framework invites, build-time settings, what the checker covers.

## The same job in each stack

| Job | Plain HTML and JS | React | Next.js (App Router) | Vue 3 and Nuxt |
|---|---|---|---|---|
| Show text from data | `textContent` | `{value}` | `{value}` | `{{ value }}` |
| Raw HTML (avoid) | `innerHTML` | `dangerouslySetInnerHTML` | same as React | `v-html` |
| Label a control | `<label for>` | `<label htmlFor>` with an id from `useId()` | same as React | `<label for>` with a unique id |
| Handle a click | `addEventListener` on a `<button>` | `onClick` on a `<button>` | same, in a client component | `@click` on a `<button>` |
| Handle a form | `<form action method>` plus a `submit` listener | `<form>` with `onSubmit`, native attributes kept | A form with a server action or route, validated on the server | `<form>` with `@submit.prevent`, native attributes kept |
| Load data in the browser | `loadInto()` in `fetch-state.js` | `useFetchState()` in `use-fetch-state.react.js` | same, in a file that starts with `'use client'` | `useFetchState()` in `use-fetch-state.vue.js` |
| Load data on the server | Not applicable | Not applicable | `await fetch` in a server component | Nuxt data fetching |
| Clean up | Abort the request | Return a cleanup from `useEffect` | same as React | `onScopeDispose` or `onUnmounted` |

Whatever the stack, every asynchronous region still has loading, empty, error (with retry) and success states.

## The bundled adapters

- `assets/use-fetch-state.react.js`: a React hook. Returns `status`, `data`, `error`, `message` and `reload`. Cancels on change and on unmount, and treats a new address as loading straight away.
- `assets/use-fetch-state.vue.js`: the same for Vue 3.3 or newer. The address can be a string, a ref or a getter.

Both import `fetchJson` and `describeError` from `fetch-state.js`, so copy all three files. Show `message` to the visitor, never `error.message`. Render each status in its own region: `role="status"` for loading, `role="alert"` for the error with a "Try again" button that calls `reload`.

Test status: logic checks in Node with React 19.3.1 plus its test renderer, and Vue 3.5.45 (`node tools/framework-checks/run.mjs` in the VYSON repository). They are not browser tests, and Vue and React were not tried in a real page, in Nuxt or in Next.js.

## Mistakes each framework invites

| Stack | Mistake | Instead |
|---|---|---|
| React | `useEffect` that fetches with no cleanup, so a slow old answer wins | Abort in the cleanup, as the hook does |
| React | `div onClick` | `<button type="button">` |
| React | `key={index}` on a list that can reorder or filter | A stable id from the data |
| React | Setting state from a request after unmount | Cancel in the cleanup |
| Next.js | Reading `window` or `localStorage` while rendering, which breaks server rendering and hydration | Read it in an effect, after the first render |
| Next.js | `'use client'` at the top of every file | Only on files that use state, effects or browser APIs |
| Next.js | Trusting that a server action is private | Check who is calling and validate every input on the server |
| Vue | `v-html` with data | `{{ value }}`, or sanitise with a reviewed library and say so |
| Vue | `v-for` without `:key` | `:key` with a stable id |
| Vue | A watcher or listener never stopped | Use `onScopeDispose` or `onUnmounted` |
| All | A secret in a "public" environment variable | Keep it on the server |

## Build-time settings are public

Anything a framework copies into the browser bundle can be read by every visitor. The prefixes that do this by default are `NEXT_PUBLIC_` in Next.js, `VITE_` in Vite, and `runtimeConfig.public` in Nuxt. Put only values meant for browsers there (a map key restricted by address, an analytics ID the user asked for). API secrets belong in server-only variables. Check the framework's current documentation if you are unsure.

## What the checker covers

`frontend-lint.mjs` reads `.jsx`, `.tsx`, `.js` and `.ts` files for the script rules, and `.vue` files for the script blocks and `v-html`. It does not read JSX or Vue templates for missing labels, button names or tap targets; review those by hand and in the browser. It never runs the framework.

## Do not duplicate other packs

For deep rules that belong to one library, use that library's own documentation or a dedicated skill pack, and follow the project's patterns. This skill does not try to replace them. Examples: React and Next.js rendering performance, a component library's own API, Tailwind class conventions.
