# Reduced motion

Some people get dizzy, nauseous or distracted by movement on screen. Operating systems let them say so, and browsers pass that choice to websites as the CSS media feature `prefers-reduced-motion`. A VYSON site respects it everywhere.

Contents: the approach, what to remove, what to keep, patterns for CSS, JavaScript and media, how to test, and the standards behind it.

## The approach: reduce, do not just delete

"Reduced" does not mean "everything is dead". The people who ask for it are mainly bothered by **movement across the screen**: sliding, zooming, spinning, parallax, things drifting by themselves. Gentle changes that do not travel are usually fine.

Decide for every animation, one by one:

| Kind of motion | When `reduce` is on |
|---|---|
| Slide, rise, drop, fly-in | Remove. Show the final state at once, or use a plain fade. |
| Zoom, scale-up entrances, spinning | Remove. |
| Parallax and scroll-linked movement | Remove. |
| Endless loops (marquee, floating, pulsing) | Stop. Show a static version. |
| Auto-playing background video or animated GIF | Do not autoplay. Show a still image, or a play button. |
| Smooth scrolling to anchors | Turn off (`scroll-behavior: auto`). |
| Fade in and out (opacity) | May stay, short (about 150 to 300ms). No travel. |
| Colour changes on hover or focus | Keep. They move nothing. |
| Focus rings, selection states | Keep, instantly. |
| Progress indicators that show real progress | Keep, but avoid decorative bouncing. |

When in doubt, remove it. Content must never depend on motion to be understood.

## Pattern 1 (preferred for new work): motion is opt-in

Write the movement only inside the "no preference" query. The base CSS has no animation at all, so reduced motion is the default state and nothing has to be undone.

```css
.hero-title { /* normal, visible, in place */ }

@media (prefers-reduced-motion: no-preference) {
  .hero-title {
    animation: vy-rise var(--vy-duration-enter) var(--vy-ease-out) both;
  }
}
```

Why this is better than "add motion, then turn it off for reduce":

- Old browsers and failed stylesheets show the content normally.
- You cannot forget to switch something off.
- You can keep a gentle fade on purpose, in a separate rule.

## Pattern 2 (for old sites): the safety net

When the site already has many animations that you cannot rewrite right now, add this block at the end of the main stylesheet. It is already in `assets/motion-base.css`.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Limits of this net: it also removes helpful fades and colour changes, and it cannot stop JavaScript animation, video or canvas. Treat it as a first aid, then migrate to pattern 1 over time.

## Hidden-until-revealed content

The most common reduced-motion bug is content that stays invisible because the reveal never runs. Follow this rule:

> The visible, final state is the default. Hiding happens only when you are sure the reveal will happen.

That is why the reveal script in `recipes.md` adds the `vy-js` class only after it has checked the user preference and found `IntersectionObserver`.

## JavaScript

Check the preference before starting any script-driven motion, and react if it changes while the page is open:

```js
const query = window.matchMedia('(prefers-reduced-motion: reduce)');

function applyMotionPreference() {
  document.documentElement.classList.toggle('reduce-motion', query.matches);
  // Pause or skip any script-driven animation here.
}

applyMotionPreference();
query.addEventListener('change', applyMotionPreference);
```

Also:

- `element.scrollIntoView({ behavior: 'smooth' })` must use `behavior: 'auto'` when `query.matches` is true.
- Do not start autoplaying media from script when the preference is `reduce`.

## Video, GIF and Lottie

- Add `autoplay` to a `<video>` only when motion is allowed. Without it, provide `poster` and visible controls.
- Replace animated GIFs with a static image when `reduce` is on, using `<picture>` with a `media="(prefers-reduced-motion: reduce)"` source for the still version.
- Decorative looping video needs a visible pause control if it runs longer than 5 seconds.

## How to test

Do at least the first two before saying the work is finished.

1. **Browser emulation.** In Chrome or Edge developer tools, open the Rendering panel and set "Emulate CSS media feature prefers-reduced-motion" to "reduce". Reload and scroll through the whole page.
2. **Operating system setting.** On Windows 11: Settings, Accessibility, Visual effects, turn off "Animation effects". On macOS: System Settings, Accessibility, Display, turn on "Reduce motion".
3. **Nothing hidden.** With `reduce` on, every heading, image, card and button must be visible and in its final place without scrolling tricks.
4. **Keyboard.** Tab through the page. Focus styles must still be visible with `reduce` on.
5. **Run the checker.** `node scripts/motion-lint.mjs <folder>` reports missing handling (rule ML003) and endless loops that are not switched off (ML004). ML003 only checks that the files contain some reduced-motion rule at all. It does not prove that every animation is covered, and it cannot see JavaScript animation, so steps 1 and 3 still matter.

If you cannot open a browser (for example when working in a terminal only), say so in your report and list which of these steps were not performed.

## Standards behind this

- WCAG 2.2.2 Pause, Stop, Hide (level A): moving content that starts automatically and lasts more than 5 seconds needs a way to pause, stop or hide it.
- WCAG 2.3.1 Three Flashes or Below Threshold (level A): never flash more than three times in one second.
- WCAG 2.3.3 Animation from Interactions (level AAA): let people disable motion that is triggered by their own actions. Respecting `prefers-reduced-motion` is the usual way to do this.

These are summaries in our own words. When a client needs a formal accessibility claim, a human specialist must check the real standard text and test with real users.
