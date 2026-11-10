# Performance budget

These are **VYSON design limits**: rules of thumb chosen to keep motion cheap. They are not measured results and they do not guarantee a speed score. Always say so in reports, and measure on the real page when it matters.

Contents: why these limits, the budget table, how to check each one, `will-change`, and when to break a rule.

## Why these limits

A browser draws a page in stages: work out sizes and positions (layout), paint pixels (paint), then combine layers on the graphics chip (compositing). Animating `transform` and `opacity` can usually skip the first two stages, so it stays smooth even when the page is busy. Animating width, height, margins, top or left forces layout again and again, which is where jank usually starts.

## The budget

| # | Limit | Why |
|---|---|---|
| 1 | Animate only `transform` and `opacity` for anything that repeats, runs on scroll, or affects many elements. | Compositing is the cheap path. |
| 2 | Never animate layout properties: width, height, min/max sizes, top, left, right, bottom, inset, margin, padding, font-size, line-height, letter-spacing, gap. | Forces layout on every frame. |
| 3 | One allowed layout exception: a user-triggered disclosure panel using `grid-template-rows`, 300ms or less (recipe 7). **Only one panel may be expanded at a time:** opening a panel closes the one that was open. | The alternatives are worse, and a single open panel keeps the amount of layout work small. |
| 4 | Avoid animating `box-shadow`, `filter`, `backdrop-filter`, `background-position`. Fade a second layer with `opacity` instead. | These repaint every frame. |
| 5 | Durations: press and hover feedback 100 to 200ms; small interface changes 150 to 300ms; section reveals 400 to 600ms; one hero element at most 700ms. Nothing one-off above 1000ms. | Short motion feels responsive. |
| 6 | Stagger step 40 to 90ms, at most 8 items per group, whole sequence done in about 1.2 seconds. | Long chains feel slow and make people wait. |
| 7 | About 10 elements or fewer animating at the same moment on one screen. | Limits paint and compositing work. |
| 8 | At most one infinite animation on a page, and it must stop or be pausable (see `reduced-motion.md`). | Loops cost power forever. |
| 9 | `will-change` on at most 3 elements at a time, only for things that animate repeatedly. Never in a global rule such as `* { will-change: transform }`. | Each hint reserves graphics memory. |
| 10 | No scroll-event listeners for animation. Use `IntersectionObserver` or CSS `animation-timeline`. | Scroll listeners run on the main thread. |
| 11 | Motion CSS about 3 KB or less before compression (comments not counted), reveal script about 1 KB or less, for a typical landing page. No animation library for effects that CSS can do. | Less to download and run. |
| 12 | Motion must not push layout around after load: reserve space (fixed sizes or `aspect-ratio`) for anything that animates in. | Prevents layout shift. |

The numeric limits in rows 5 to 11 are starting points chosen by us. If a limit blocks a real design need, you may break it, but state which one and why in the report.

## How to check

The checker covers part of the list. The rest is by inspection.

| Limit | How |
|---|---|
| 1, 2, 4 | `node scripts/motion-lint.mjs <folder>`: rules ML002 and ML009 report layout and paint-heavy properties in transitions and keyframes. |
| 5 | Same command, rule ML006 (transitions longer than 1000ms). Other durations: read the token file. |
| 8 | Rule ML004 (endless loop with no reduced-motion switch-off). Counting loops on the page is done by reading the CSS. |
| 9 | Rule ML005 (more than 3 `will-change` declarations). |
| 10 | `node scripts/motion-lint.mjs <folder>`: rule ML010 reports `scroll` event listeners in `.js` files and inline `<script>` blocks. |
| 3, 6, 7, 12 | Read the CSS and script. For limit 3, open two panels in the browser and confirm the first one closed (see `verification.md`). |
| 11 | Check file sizes. PowerShell: `(Get-Item styles.css).Length` shows bytes. |
| All | In Chrome or Edge developer tools, record the Performance panel while scrolling and hovering. Look for repeated purple "Recalculate Style" and "Layout" blocks on every frame. The Rendering panel's "Paint flashing" option shows which areas repaint (green flashes) while animation runs. |

The checker is a **static** rule-of-thumb tool: it only reads text. It does not measure frame rate and it cannot see JavaScript-driven animation or inline `style=""` attributes. Passing it is not a browser test. `verification.md` lists the static checks and the real browser checks side by side. If you did not run a browser check, write "browser performance check: not performed".

## `will-change`

`will-change: transform` tells the browser to prepare a separate layer. That helps for an element that animates often (for example a sticky header that slides), but each hint uses memory.

- Prefer to set it just before an animation starts and remove it after, or leave it off. Most simple reveals and hovers work well without it.
- Do not put it on many cards "just in case".

## Layout shift and loading

- Give images and media explicit sizes or `aspect-ratio` so that nothing jumps when it fades in.
- An entrance animation must not be the thing that delays the main content. The most important text should be readable within the first second.
- Do not delay interactivity: buttons and links must work during their entrance animation.

## When to break a rule

The budget serves the user. It is fine to go beyond a limit when:

- the page is a single, deliberate showcase and the client has asked for it,
- you have measured the result on a mid-range phone and it is smooth,
- reduced-motion and mobile behavior are still handled.

Write down which limit was broken, what was measured and on what device. Never write measurements that were not made.
