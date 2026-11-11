# Prompt used for this example

This is the request this example answers, written to match the page. It was **not** given to a separate agent in a clean test: the page was written by an AI agent (Claude, working in Cursor) in the same session that wrote the skill, so the prompt describes the task rather than recording a test run. To try the skill yourself, install it and give your agent this request.

```text
Build a small page for Fernside Workshops, a made-up community workshop
programme, with three working parts:

1. A searchable list of workshops (search by name, filter by weekday evening or
   weekend) loaded from a local JSON file, with a details dialog for each one.
2. A "Reserve a place" form (name, email, which workshop, number of places, and
   a consent checkbox).
3. Demo controls that pretend the server is slow, empty or failing, so every
   state can be seen.

Use plain HTML, CSS and JavaScript modules. Do not add any library, framework,
tracker or script from another website. Nothing may be sent anywhere: the
sign-up is pretend, and the page must say so.

Use the vyson-frontend-development skill. It should work with the keyboard and
on a phone, show loading, empty and error states, and not break on a double
click or a slow answer. Say clearly that the programme and its classes are made up.
```

## What a good result looks like

These are the checks from the skill's acceptance list that apply to this request.

- Markup first: labels on every control, native validation attributes, `autocomplete` hints, `method="post"` on the form, a real `<dialog>` and `<details>`.
- The list shows loading, empty and error states, and the error has a retry button.
- A slow answer that arrives after a newer request does not overwrite it, and typing does not send a request per keystroke.
- No variable is written into `innerHTML`, there is no `eval`, and no secret or token anywhere.
- The form shows inline errors linked with `aria-describedby`, an error summary that takes focus, a status line, and sends only once when the button is pressed three times.
- Every action is a real button or link with a visible focus ring and at least 44 by 44 CSS pixels (a small checkbox sits inside a 44 pixel high label).
- The dialog closes with `Escape` and keeps focus inside while open.
- `frontend-lint.mjs` reports no `FAIL` lines.
- The report keeps static checks, project tests and browser tests apart, and says what the server would have to enforce.
