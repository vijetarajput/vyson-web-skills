# Project, stack and structure

## Read the project first

Before writing code, spend a few minutes answering these from the files, not from guesses:

| Question | Where to look |
|---|---|
| Is there a package manager and which one? | `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` |
| Which framework, if any? | `package.json` dependencies, `next.config.*`, `vite.config.*`, `src/` layout |
| How do I run, build and test it? | `package.json` `scripts`, a `README`, CI files |
| Is TypeScript used? | `tsconfig.json`, `.ts` and `.tsx` files |
| Where do styles, scripts and static files go? | The existing folders. Put new files beside similar ones |
| Are there conventions? | Linter and formatter config, an `AGENTS.md` or contributing guide |
| Is there an API, and what does it return? | API client files, `.env.example`, docs, existing `fetch` calls |

Follow what exists. A new file should look like its neighbours.

## Choosing the stack

For a site (marketing, portfolio, a few interactive parts), the cheapest thing that works is best. Use this table when the project does not already decide it.

| Situation | Suggested stack | Why |
|---|---|---|
| One page or a handful of pages, a form or two, a filter | Plain HTML, CSS and ES modules | No build step, nothing to update, fastest to load |
| Several pages that share a layout, content from files | A static-site approach the user already knows, or plain HTML with a small build step | Shared header and footer without a heavy runtime |
| Many interactive components with shared state | A component framework (React is common) with a bundler such as Vite | State and reuse justify the cost |
| Pages that need server rendering, routing and data fetching on the server | A full-stack framework such as Next.js | It does that job, but it is a large dependency to learn and update |
| Styling a component project quickly | Tailwind CSS if the team already uses it | Do not introduce it to a project that has its own CSS approach |

Rules:

- Do not add a framework to build one form.
- Do not mix two frameworks in one page.
- If the user asked for plain HTML, give plain HTML.
- Never rewrite a working project into a different stack unless asked.
- Name every new dependency, its licence and its version in the report, and ask before adding it. Pin the version and prefer packages with an MIT, Apache-2.0, BSD or ISC licence. Check the licence from the package's official page.

## Structure for a small site

```text
index.html
styles.css
app.js                 (wiring: finds elements, attaches listeners)
fetch-state.js         (helper copied from the skill)
form-helpers.js        (helper copied from the skill)
data/                  (local JSON used while there is no real API)
```

- One small module per job. `app.js` wires, helpers do the work.
- Load scripts with `<script type="module" src="app.js">`. Modules are deferred by default, so the page can render while they load.
- Keep markup, styles and behaviour apart: no inline `style` attributes or `onclick` attributes.
- Use `const` and `let`, `===`, and small named functions. Avoid globals; use modules.

## Local server

Browsers refuse to load JavaScript modules, JSON files and `fetch` calls from a page opened by double-clicking it (a `file://` address). Use the project's dev server (for example the `dev` script). For a plain site with no tooling, run any static file server that listens on your own computer only. Say in the report which server you used.

## Progressive enhancement

The page is built in three layers, and each layer must work without the next.

1. **HTML:** content, links, forms and native controls. Works with no CSS or JavaScript.
2. **CSS:** layout and look. A failed stylesheet leaves a readable page.
3. **JavaScript:** upgrades. Intercept a form submit to avoid a reload, load data without a full page, show a dialog.

Practical consequences:

- A search form has `action` and `method="get"` and a real submit button. JavaScript can intercept it, but it still works without.
- A navigation link goes to a real address. JavaScript may enhance it, not replace it with a button.
- Content that matters is in the HTML, not injected by a script.
- If something truly needs JavaScript, put a `<noscript>` message in place of it.

## Configuration and secrets

- Configuration that differs per environment (an API address) lives in environment variables read at build time, or in one config file. Do not scatter literal addresses through the code.
- Anything shipped to the browser is public. Never put an API secret, private key or password in client code, even in an "environment" file that the bundler inlines. Public keys that are meant for browsers (a map or analytics ID) are fine, but say what they allow.
- Commit an `.env.example` listing the names, never the real values.

## Keeping changes reviewable

- Change only what the task needs. Do not reformat unrelated files.
- Do not delete or rename files you did not create without asking.
- Explain decisions in plain language in the report, and list the files you changed.
