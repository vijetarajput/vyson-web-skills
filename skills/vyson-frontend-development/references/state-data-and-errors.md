# State, data and errors

## The states of asynchronous UI

Every list, search, form or panel that waits for something has these states. Decide each one before writing the code.

| State | What the visitor needs | How |
|---|---|---|
| Idle | A clear starting point | The form or search box, with instructions if needed |
| Loading | To know something is happening, and what | A short text ("Loading workshops") in a `role="status"` region, `aria-busy="true"` on the container |
| Success | The result, in a way they can use | Real HTML built with `createElement` and `textContent` |
| Empty | To know it worked but there is nothing | A sentence that says why and what to do ("No workshops match. Try another day or clear the search.") |
| Error | What happened, in plain words, and a way forward | A `role="alert"` message and a retry button. Never raw error text or a stack trace |
| Offline | To know it is their connection | The error message for a failed network request, and retry when back online |
| Submitting (forms) | To know the form was received | A busy status, a guard against a second submit |
| Partial | The parts that did load | Show them, and mark what failed |

A spinner is not a state. Without a timeout and an error path, it is a trap.

`assets/fetch-state.js` implements loading, empty and error with retry for one region.

## Fetching data

- Check the status. `fetch` only rejects on a network failure. A 404 or 500 resolves normally, so check `response.ok` and turn a bad status into an error.
- Add a timeout and let callers cancel with an `AbortController`. A request that cannot be cancelled is a bug waiting in a search box.
- Parse JSON inside the same error handling. A bad answer is also an error.
- Treat the answer as untrusted: check the fields you rely on exist and have the right type before using them.
- Keep addresses and parameters in one place. Build query strings with `URLSearchParams`, which encodes values for you.
- Do not put secrets in the request or the URL. The browser cannot hide them.
- Do not poll in a tight loop. If you must, pause while the tab is hidden and back off after errors.

## Stale answers

When the visitor types quickly or changes a filter twice, a slow first answer can arrive after the second and overwrite it. Prevent it: cancel the old request (`AbortController`) and ignore any answer that is not from the newest request (a request counter). `loadInto` and `createLatest` in the helper do both. Debounce typing (about 250 milliseconds) so you do not send a request per keystroke.

## Retrying

- Offer a manual retry button on every error. It is the only retry that is always safe.
- Retry automatically only for requests that are safe to repeat (`GET`), a small number of times, with a growing delay.
- Never retry a `POST` that creates something unless the server supports an idempotency key, or you may create it twice.

## Forms and writes

- Guard against double submit: ignore a second submit while the first is running (`createSubmitGuard`).
- Keep what the visitor typed after a failure. Do not clear the form until the server says yes.
- Optimistic updates (showing success before the server confirms) only for low-stakes actions, and with a clear undo or rollback on failure.
- After success, update the page to match the server, not what you hoped it did.

## Where state lives

| Kind of state | Where | Why |
|---|---|---|
| What the visitor typed or chose in a filter | The element itself, and the address (`?q=...`) if the result should be shareable or survive a refresh | The browser already stores it. The address makes it linkable |
| Data from the server | A variable next to the code that shows it. Reload when needed | Avoid copies that go out of date |
| Preferences (theme, dismissed banner) | `localStorage`, behind a guard | Convenience only. Never essential, never secret |
| Sessions and tokens | An HttpOnly cookie set by the server | Scripts cannot read it, so a script injection cannot steal it |
| Shared state across many components | A framework's own state tools, only if the project already has them | Do not add a state library to a form |

Wrap `localStorage` and `sessionStorage` in try/catch: they can throw (private modes, blocked storage, full quota). Do not store personal data there, and do not store anything you cannot lose.

## Edge cases to try

Go through this list for each feature and test what you can.

1. The server is slow (try the browser's slow-network setting).
2. The server returns an error (404, 500). The network is offline.
3. The answer is empty, or has a missing field, or is huge.
4. The visitor double-clicks, presses `Enter` twice, or changes a filter during loading.
5. A slow request finishes after a newer one.
6. The visitor uses the back button or refreshes. Does the address reflect the state they expect?
7. The visitor uses only the keyboard. Where is the focus after each step?
8. The visitor uses a screen reader or a very small screen (320 CSS pixels wide).
9. Input is very long, contains quotes, `<script>`, emoji or right-to-left text. It must show as plain text.
10. Dates, numbers and currencies: format with `Intl.DateTimeFormat` and `Intl.NumberFormat`, and state the time zone when it matters. Do not hand-format.

## Writing the code

- Small, named functions. A function that fetches, a function that renders, a function that wires.
- Build elements with `createElement`, `textContent`, `append` and `replaceChildren`. Not `innerHTML`.
- One place that handles errors, so every feature shows errors the same way.
- Do not swallow errors with an empty `catch`. Show a message, or log it with a reason.
- Remove listeners you add to `window` or `document` when the component goes away.
- Comments say why, not what.
