# HTML, forms and widgets

## Use the right element

| You want | Use | Not |
|---|---|---|
| Go somewhere | `<a href="...">` | `<button>` or `<div onclick>` |
| Do something on this page | `<button type="button">` | `<a href="#">` or `<div onclick>` |
| Send a form | `<button type="submit">` inside a `<form>` | A button with a click handler that reads inputs |
| Show and hide a section | `<details><summary>` | A `div` with a script (unless you need behaviour `details` cannot do) |
| A modal window | `<dialog>` with `showModal()` | A positioned `div` with a hand-made focus trap |
| Pick one of several | `<select>`, radio group | A custom dropdown, unless the project already has a tested one |
| A list of things | `<ul>` or `<ol>` | Lines of `<div>` |
| Tabular data | `<table>` with `<th scope>` | A grid of `<div>` |

Native elements bring keyboard handling, roles, focus and screen reader support for free. A custom widget must rebuild all of that, and usually does it worse.

Every page: one `<main>`, a `<nav>` with a label if there are several, one `<h1>`, headings in order, a skip link, `lang` on `<html>`.

## The form recipe

Start with the form working on its own.

```html
<form action="/signup" method="post">
  <div data-form-summary hidden></div>

  <div class="field">
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" autocomplete="email" required>
  </div>

  <div class="field">
    <label for="places">Places <span class="hint">(1 to 4)</span></label>
    <input id="places" name="places" type="number" inputmode="numeric" min="1" max="4" required>
  </div>

  <button type="submit">Reserve</button>
  <p data-form-status></p>
</form>
```

Rules:

- **Labels.** Every control has a visible `<label for="id">` (or is wrapped in a label). A placeholder is a hint, not a label. Group related radios and checkboxes in a `<fieldset>` with a `<legend>`.
- **Types and hints.** Use the real `type` (`email`, `tel`, `url`, `number`, `date`, `search`), `inputmode` for mobile keyboards, and `autocomplete` for personal data (`name`, `email`, `tel`, `street-address`, `postal-code`, `current-password`, `new-password`). Do not use `type="number"` for identifiers such as phone or card numbers; use `inputmode="numeric"` with a text input.
- **Native validation.** Use `required`, `minlength`, `maxlength`, `min`, `max`, `pattern` (with a `title` that explains the format). These rules are the same ones the helper uses, so the form works with and without JavaScript.
- **Method.** `method="post"` for anything that changes data or holds a password. `method="get"` only for searches and filters. A password in a GET form ends up in the address bar.
- **Messages.** Put an error next to its field and link it with `aria-describedby`. Say what is wrong and how to fix it ("Enter an email address like name@example.com"), never just "Invalid". Do not rely on colour alone: add text.
- **Error summary.** After a failed submit, show a short list of the problems at the top, each a link to its field, and move focus to the summary. Keyboard and screen reader users then hear what went wrong.
- **Optional fields.** Mark the optional ones, not the required ones, when most fields are required, or mark both consistently.
- **Submit.** Do not disable the button while sending (focus is lost). Set `aria-disabled="true"` and ignore further submits. Say "Sending" and then confirm or fail in a `role="status"` line.
- **After success.** Say what happened and what comes next. Clear the form only when it makes sense. On failure, keep what the visitor typed.
- **Server.** The server validates again, because anyone can skip the browser. Never trust `hidden` fields, `maxlength` or client-side prices.
- **Spam and abuse.** A honeypot field, rate limiting and a server check are server-side jobs. A client-only "captcha" does nothing. Do not add a third-party captcha or tracker without asking.

`assets/form-helpers.js` implements the messages, the summary, the focus move, the status line and the double-submit guard for this markup.

## Dialogs

```html
<dialog id="details" aria-labelledby="details-title">
  <h2 id="details-title">Title</h2>
  <p>Content.</p>
  <form method="dialog"><button type="submit">Close</button></form>
</dialog>
```

```js
document.querySelector('#open').addEventListener('click', () => dialog.showModal());
```

`showModal()` gives you a focus trap, `Escape` to close, an inert page behind it, a backdrop and focus returned to the opener. Needs: a heading that names it, a visible close button, and no important content that can only be reached by dragging. Do not open a dialog on page load, and do not use one for a message that does not need a decision.

## Disclosure (`details` and `summary`)

Use for FAQs and "show more". Keep one panel open at a time only if the task needs it (a group with the same `name` attribute on each `details` does that natively in current browsers; check support if it matters). The `summary` is already focusable and works with `Enter` and `Space`. Animation of opening belongs to the CSS motion work, not here.

## Tabs

Use tabs only when sections are alternatives the visitor switches between and the content is short. Otherwise use headings. If you build them, follow the standard pattern: a `role="tablist"` with `role="tab"` buttons (`aria-selected`, `aria-controls`, `tabindex` of 0 on the selected and -1 on the others), `role="tabpanel"` panels (`aria-labelledby`), arrow keys to move between tabs, `Home` and `End` to jump, and the selected panel visible while the others have `hidden`. If the project has a tested tab component, use it.

## Menus and navigation

A site's main navigation is a list of links inside `<nav>`. It is not an ARIA "menu" (that role is for application menus and changes how screen readers behave). For a mobile toggle, use a real `<button>` with `aria-expanded` and `aria-controls`, update `aria-expanded` when it opens, close on `Escape`, and keep the links reachable with `Tab`. Make sure the navigation works with no JavaScript (links visible by default, hidden only when the script is ready).

## Live updates

- Loading, saved and "added to basket" messages: `role="status"` (polite).
- Problems that need attention: `role="alert"` (assertive). Use it sparingly.
- The region must exist in the page before you change its text, or the change may not be announced.
- Do not move focus for messages that do not need action.

## Focus management

- Move focus only when the page changes in a way the visitor did not control: into a dialog, to an error summary, to the new heading after navigation inside a single-page app.
- Never leave focus on a removed element. If you delete what has focus, move focus to the next sensible element.
- Keep the focus ring visible. Style `:focus-visible`, do not remove it.

## Images, icons and buttons

- Icon-only buttons need `aria-label`. Decorative icons get `aria-hidden="true"`.
- Give images `width`, `height` and `alt`.
- A touch target is at least 44 by 44 CSS pixels to aim for, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8). A small checkbox can sit inside a 44 pixel high label.
