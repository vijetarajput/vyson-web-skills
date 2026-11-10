# Verification: static checks and real browser tests

There are two different kinds of checking, and a report must never mix them up.

| Kind | What it is | Examples | What passing means |
|---|---|---|---|
| **Static check** | A program reads the text of the files. No page is opened. | `motion-lint.mjs`, searching the CSS for `transition: all` | "The text follows these rules." It does **not** mean the page looks right, runs smoothly or works. |
| **Browser test** | A real browser opens the page and you (or a script) look at what happens. | Emulating reduced motion, pressing `Tab`, resizing to a phone width | "Here is what actually happened, in this browser, on this screen." |

Contents: what the static checker covers, what only a browser can show, manual browser steps, the tap-target rule and how to measure it, the accordion test, how to report.

## What `motion-lint.mjs` checks (static)

Run it on the folder that holds the CSS, HTML and scripts:

```powershell
node skills/vyson-css-motion/scripts/motion-lint.mjs path/to/site
```

It reads `.css` files, `<style>` blocks, `.js` and `.mjs` files and inline `<script>` blocks. Every run prints that it is a static check.

| Code | Looks for | Severity |
|---|---|---|
| ML001 | `transition: all`, or a transition that names no property | error |
| ML002 | Animating layout properties (width, height, margin, top, ...) | error |
| ML003 | Motion with no `prefers-reduced-motion` rule anywhere in the files checked | error |
| ML004 | Endless animation with no reduced-motion switch-off | warning |
| ML005 | More than 3 `will-change` declarations | warning |
| ML006 | A transition longer than 1000ms | warning |
| ML007 | `scroll-behavior: smooth` without a reduced-motion guard | warning |
| ML008 | `animation-timeline` outside `@supports` | warning |
| ML009 | Animating `box-shadow`, `filter`, `backdrop-filter`, `background-position` | warning |
| ML010 | A `scroll` event listener in a script | warning |
| ML011 | `transform`, `translate`, `scale` or `rotate` on `:hover` outside `@media (hover: hover)` | warning |
| ML012 | A button, link or toggle with an explicit width or height under 24px | warning |
| ML013 | An `aria-expanded` control that is not a button, has no `aria-controls`, points at a missing id, or has no `type` | warning |
| ML014 | Content hidden by default (`opacity: 0`, `visibility: hidden`, `grid-template-rows: 0fr`, `height: 0`) with no script-gate class such as `.js-panels` or `.vy-js` | warning |

Treat every warning as something to fix or to explain in the report.

### What the static checker cannot see

- How the page looks, or how smooth the motion is. It does not measure frame rate.
- Which of two competing CSS rules wins. (Example: a hover lift can be silently cancelled by a stronger rule. Only the browser knows.)
- Whether a script really closes the other panels, moves focus, or keeps working.
- Sizes that come from padding, line height or content. ML012 only sees sizes written out as a plain `px`, `rem` or `em` value, so a small button with no explicit size passes. Measure it in the browser (below).
- Whether content is readable with scripts blocked. ML014 is a hint that something is hidden by default; it cannot prove the content is unreachable.
- Inline `style=""` attributes, CSS created by JavaScript, and animation done in JavaScript.

## Manual browser steps

Do these in Chrome or Edge on the real page. If you cannot open a browser (for example an agent working only in a terminal, or a browser tool that refuses `file://` addresses), write "browser test: not performed" and list the steps below that were skipped. Never imply they were done.

Open the page by double-clicking `index.html` or, in PowerShell:

```powershell
Start-Process .\index.html
```

1. **Reduced motion.** Press `F12`, then `Ctrl+Shift+P`, type "Render", open the Rendering panel, set "Emulate CSS media feature prefers-reduced-motion" to "reduce". Reload and scroll the whole page. Nothing may slide, zoom or loop, and nothing may be missing. (Detail: `reduced-motion.md`.)
2. **Scripts blocked.** In the same `Ctrl+Shift+P` box, run "Disable JavaScript", reload. Every heading, card, answer and link must still be readable. If a menu or a panel needs JavaScript to open, the content inside it is lost; fix that.
3. **Phone width.** Press `Ctrl+Shift+M` for the device toolbar, choose a 390px wide phone, reload. Scroll the whole page. There must be no sideways scrolling.
4. **Tap targets.** Run the console snippet below at phone width.
5. **Keyboard.** Click on the page background, then press `Tab` repeatedly. Every control must show a visible focus ring, in a sensible order.
6. **Accordion.** Follow "The accordion test" below.
7. **Performance (optional).** Record the Performance panel while scrolling and hovering. Look for repeated purple "Recalculate Style" and "Layout" blocks. Do not state numbers you did not read from the panel.

## Tap targets

**The criterion we use.**

- **Aim:** every button, navigation link, toggle and menu item that people press has a touch area of at least **44 by 44 CSS pixels** on touch screens.
- **Floor:** never under **24 by 24 CSS pixels**. This is the minimum in WCAG 2.2 success criterion 2.5.8, "Target Size (Minimum)", level AA. That criterion has exceptions (enough spacing around a small target, an equivalent larger control, links inside a sentence, controls the browser draws, and cases where the size is essential). The 44px figure matches the stricter WCAG 2.5.5 "Target Size (Enhanced)", level AAA, and common mobile design guidance. We treat 44px as our design target, not as a legal claim.
- **Not covered:** links inside a sentence. Their size comes from the text.

The size of the touch area is the clickable box (content plus padding), not the text.

**How to fix.** Add padding or `min-height` / `min-width`, not a bigger font:

```css
@media (pointer: coarse), (max-width: 640px) {
  .nav a, .button { min-height: 44px; min-width: 44px; }
}
```

**How to measure.** In the phone-width view, open the Console (`Ctrl+Shift+J`), paste this and press `Enter`. It lists every visible control smaller than 44px in either direction:

```js
console.table(
  [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="button"]')]
    .map((el) => ({ el, box: el.getBoundingClientRect(), style: getComputedStyle(el) }))
    .filter(({ box, style }) => box.width > 0 && box.height > 0 && style.visibility !== 'hidden')
    .map(({ el, box }) => ({ element: el.outerHTML.slice(0, 50), width: Math.round(box.width), height: Math.round(box.height) }))
    .filter((t) => t.width < 44 || t.height < 44)
);
```

A row with a height under 24 is a failure unless an exception applies. A row between 24 and 44 is a "should fix". Links inside sentences will show up too; ignore those. This snippet is a **browser test** of the real, rendered sizes.

## The accordion test (FAQ and disclosure panels)

Do this once in a real browser:

1. Load the page. At most one answer is open.
2. Click the second question. Its answer opens and **the first closes**. Count the open answers: exactly one.
3. Click the open question again. It closes. Zero open is allowed.
4. Press `Tab` until a question has focus, then press `Enter`, then `Space`. Each press toggles that answer. Focus stays on the question.
5. Press `ArrowDown`, `ArrowUp`, `Home`, `End`. Focus moves between questions and nothing opens by itself.
6. With a panel closed, press `Tab` from its question. Focus must go to the **next question**, not into the hidden answer.
7. Emulate reduced motion and repeat step 2. The answer should switch instantly.
8. Block scripts and reload. Every answer is open and readable.

Each step is a browser test. Writing the recipe's script correctly is not enough: report which steps you ran.

## How to report

Split the report into two lists:

- **Static checks run:** the checker's last `RESULT` line, plus anything else you searched for in the files.
- **Browser tests run:** each numbered step above that you actually did, with what you saw. Name the browser. Say "not performed" for the rest, including a real phone, Firefox, Safari and a screen reader.

Never write frame rates, scores, load times or "tested" for something that was only read.
