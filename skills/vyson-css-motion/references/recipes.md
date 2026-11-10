# Motion recipes

Copy-ready patterns for the most common requests. Each one says what it costs, what happens when the user wants reduced motion, and what small screens get.

All recipes use the tokens from `assets/motion-base.css` (`--vy-duration-*`, `--vy-ease-*`, `--vy-distance`, `--vy-stagger`). If the project has its own tokens, swap the names.

Contents: 1 Page-load entrance, 2 Scroll reveal with JavaScript, 3 Scroll reveal without JavaScript, 4 Button hover and press, 5 Card lift, 6 Link underline, 7 Disclosure panel, 8 Marquee, 9 Page transition, 10 Scroll progress bar.

A note on browser support: newer features (scroll-driven animation, view transitions, `@starting-style`) are not available in every browser or version. Every recipe that uses one is written so that, without it, the page simply shows its normal content with no movement. Tell the user to check the browsers they must support before promising the effect.

---

## 1. Page-load entrance

Use for: a hero headline, sub-text and button arriving one after another.

```html
<h1 class="vy-enter" style="--vy-i: 0">Roasted slowly. Served fast.</h1>
<p  class="vy-enter" style="--vy-i: 1">Small-batch coffee from three farms.</p>
<a  class="vy-enter button" style="--vy-i: 2" href="#shop">Shop beans</a>
```

The CSS is `.vy-enter` in `assets/motion-base.css`: a fade plus a short rise, with a delay of `--vy-i` times `--vy-stagger`.

- **Budget:** transform and opacity only. Three or four elements, each at or under 700ms, so the whole sequence ends before about 1.2 seconds.
- **Reduced motion:** nothing moves, the text is simply there.
- **Mobile:** distance and stagger shrink automatically under 640px wide.
- **Do not:** hide the elements with `opacity: 0` in normal CSS. The hidden state must exist only inside `@keyframes`.

---

## 2. Scroll reveal with JavaScript

Use for: sections, cards and images that fade in as they enter the screen. This works in every modern browser.

```html
<section class="vy-reveal">...</section>
<ul>
  <li class="vy-reveal" style="--vy-i: 0">...</li>
  <li class="vy-reveal" style="--vy-i: 1">...</li>
  <li class="vy-reveal" style="--vy-i: 2">...</li>
</ul>
```

```js
// reveal.js: under 1 KB, no library.
(() => {
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!motionOk || !('IntersectionObserver' in window)) return; // content stays visible

  const items = document.querySelectorAll('.vy-reveal');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // reveal once, then stop watching
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => observer.observe(el));
  document.documentElement.classList.add('vy-js'); // hide-until-seen turns on only now
})();
```

Load it with `<script src="reveal.js" defer></script>`.

- **Budget:** one observer for the whole page. No `scroll` event listeners and no work on every frame. Stagger only items that appear in the same row.
- **Reduced motion:** the script exits early, the `vy-js` class is never added, so nothing is hidden.
- **Mobile:** works as is. Keep rows small so many items do not animate at the same moment.
- **Do not:** put `vy-reveal` on the first screen of the page. Anything visible on load should use recipe 1 or no motion, otherwise the page looks empty for a moment.

---

## 3. Scroll reveal without JavaScript

Use for: the same effect as recipe 2 when the target browsers support scroll-driven animation. Always keep recipe 2 or plain content as the fallback.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .vy-reveal-native {
      animation: vy-rise linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 60%;
    }
  }
}
```

It reuses the `vy-rise` keyframes from the starter file. Browsers without support ignore the whole block, so the element is just visible.

- **Budget:** runs off the main thread in browsers that support it. Still apply it to a handful of elements, not hundreds.
- **Reduced motion:** the block is not applied.
- **Mobile:** if the effect is decorative, restrict it with `@media (min-width: 900px)` unless you have tested it on a real phone.

---

## 4. Button hover and press

```css
.button {
  transition: background-color var(--vy-duration-fast) var(--vy-ease-standard);
}

@media (prefers-reduced-motion: no-preference) {
  .button { transition-property: background-color, transform; }
  .button:active { transform: scale(0.97); }
}

@media (hover: hover) and (pointer: fine) {
  .button:hover { background-color: var(--button-hover, #2a2a2a); }
}
```

- **Budget:** 140ms. A colour change is cheap and is allowed to stay for reduced motion because it moves nothing.
- **Reduced motion:** the press shrink is removed; the colour change stays.
- **Mobile:** the press shrink works on touch. The hover colour is limited to devices that hover, so it cannot get stuck after a tap.
- **Keyboard:** add the same colour change to `:focus-visible`, and keep a visible outline.
- **Tap target:** give the button `min-height: 44px` (and a `min-width` if the label can be very short). Motion feedback on a button that is hard to hit does not help anyone.

---

## 5. Card lift

Use `.vy-lift` from the starter file.

```html
<li class="vy-reveal">
  <article class="card vy-lift">...</article>
</li>
```

Put `vy-reveal` and `vy-lift` on **different elements**, as above. On one element they fight over `transition`, and the hover lift would inherit the reveal's stagger delay.

- **Budget:** 4px of travel, 240ms, transform only. Do not animate `box-shadow`. For a soft shadow, put the shadow on a pseudo-element and fade its `opacity`:

```css
.card { position: relative; }
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 14px 30px rgb(0 0 0 / 0.18);
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) {
  .card::after { transition: opacity var(--vy-duration-base) var(--vy-ease-standard); }
  .card:hover::after { opacity: 1; }
}
```

- **Reduced motion and mobile:** no hover lift at all.

---

## 6. Link underline that draws in

```css
.link {
  position: relative;
  text-decoration: none;
}
.link::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -2px;
  height: 2px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
}

@media (prefers-reduced-motion: no-preference) {
  .link::after { transition: transform var(--vy-duration-base) var(--vy-ease-out); }
}

.link:focus-visible::after { transform: scaleX(1); }

@media (hover: hover) and (pointer: fine) {
  .link:hover::after { transform: scaleX(1); }
}
```

- **Budget:** transform only (the line is scaled, its width is never animated).
- **Reduced motion:** the underline still appears on hover and focus, just instantly. That keeps the link clear without movement.
- **Mobile:** tap gives focus-style feedback only; no hover rule.
- **Tap target:** a navigation link is often only one line of text tall (about 25px). On touch screens, add vertical padding so the touch area is at least 44px tall, and move the underline with it so it still sits just under the text:

```css
@media (pointer: coarse), (max-width: 640px) {
  .link { display: inline-block; padding-block: 0.75rem; }
  .link::after { bottom: calc(0.75rem - 2px); }   /* padding minus the 2px gap, so the line stays under the text */
}
```

Links inside a sentence are exempt from the size rule (the line height of the text sets their size); a navigation or footer link list is not.

---

## 7. Disclosure panel (FAQ, accordion)

The one deliberate exception to "never animate layout". The old `max-height` trick needs a guess and feels uneven, so this recipe animates the row size of a grid.

**The rule: only one panel may be expanded at a time.** Opening a panel closes the one that was open. Clicking the open panel closes it, so zero open panels is also allowed. The page never shows two expanded panels.

```html
<div class="faq">
  <div class="panel">
    <h3><button type="button" class="panel-button" aria-expanded="true" aria-controls="faq-1">Do you ship abroad?</button></h3>
    <div class="panel-body" id="faq-1">
      <div class="panel-inner"><p>Yes, to most countries.</p></div>
    </div>
  </div>
  <div class="panel">
    <h3><button type="button" class="panel-button" aria-expanded="true" aria-controls="faq-2">Can I return an order?</button></h3>
    <div class="panel-body" id="faq-2">
      <div class="panel-inner"><p>Within 30 days, if unused.</p></div>
    </div>
  </div>
</div>
```

Notes on the markup: each question is a real `<button>` inside a heading (use the heading level that fits the page), so it can be reached with `Tab` and used with `Enter` and `Space` without any extra script. `aria-controls` names the answer's `id`. In the HTML every panel is written as open (`aria-expanded="true"`), because that is the truth when the script does not run. The script sets the real state.

```css
/* Default: every answer is open and readable, even if the script never runs. */
.panel-body {
  display: grid;
  grid-template-rows: 1fr;
}
.panel-inner { overflow: hidden; }   /* put padding on a child, not here */

/* A comfortable touch area for the question button (see verification.md, tap targets). */
.panel-button { width: 100%; min-height: 44px; text-align: left; }

/* The script adds .js-panels, and only then do closed panels collapse. */
.js-panels .panel[data-open="false"] .panel-body { grid-template-rows: 0fr; }

/* The transition is switched on separately, one frame later (see the script),
   so panels that start closed do not visibly animate shut when the page loads. */
@media (prefers-reduced-motion: no-preference) {
  .panels-animate .panel-body { transition: grid-template-rows var(--vy-duration-base) var(--vy-ease-standard); }
}
```

Keep a visible `:focus-visible` outline on `.panel-button`.

```js
// panel.js: accordion where only one panel is expanded at a time. No library.
(() => {
  const panels = [...document.querySelectorAll('.panel')];
  if (!panels.length) return;
  const buttons = panels.map((panel) => panel.querySelector('.panel-button'));

  const setOpen = (panel, open) => {
    panel.dataset.open = String(open);
    panel.querySelector('.panel-button').setAttribute('aria-expanded', String(open));
    panel.querySelector('.panel-inner').inert = !open;   // closed content cannot be tabbed into
  };

  // Opening one closes all the others. Clicking the open one closes it.
  const toggle = (panel) => {
    const willOpen = panel.dataset.open !== 'true';
    panels.forEach((p) => setOpen(p, p === panel && willOpen));
  };

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => toggle(panels[i]));

    // Optional extras: arrow keys, Home and End move between the questions.
    // Enter and Space already work because each question is a real <button>.
    button.addEventListener('keydown', (event) => {
      const target = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      buttons[(target + buttons.length) % buttons.length].focus();
    });
  });

  panels.forEach((panel, i) => setOpen(panel, i === 0));   // start with the first one open (use false for none)
  document.documentElement.classList.add('js-panels');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('panels-animate')));
})();
```

- **Budget:** 240ms, user-triggered, only one panel expanded at a time. Do not use this for long lists that expand together, or for anything that runs on scroll.
- **Keyboard (all of these must work):** `Tab` reaches every question in page order. `Enter` and `Space` open and close the focused one. `ArrowDown`, `ArrowUp`, `Home` and `End` move focus between questions (they do not open anything). Focus stays on the button after it is used. A closed answer cannot be tabbed into (`inert`).
- **Screen readers:** `aria-expanded` tells the user whether the answer is open, and `aria-controls` links the button to its answer. A test with a real screen reader has **not** been done for this recipe.
- **Reduced motion:** the panel opens instantly. The `panels-animate` class is only styled inside the `no-preference` query.
- **Without JavaScript:** every answer stays open and readable, because collapsing only happens under `.js-panels`.
- **`inert`:** current browsers support it. A browser that does not will still show and hide the panel correctly, but links inside a closed panel could be reached by `Tab`.
- **If the project already uses `<details>`, keep it.** It is accessible without JavaScript, and a plain instant open is fine. Newer browsers can also make a group of `<details>` open one at a time through the `name` attribute (check support before relying on it).

---

## 8. Marquee (scrolling logo or text strip)

Think twice. Moving content that starts by itself and lasts longer than 5 seconds needs a pause control for accessibility, and it is the easiest way to add a permanent animation. If the client wants one, do it like this:

```html
<div class="marquee" aria-label="Press mentions">
  <ul class="marquee-track">
    <li>Daily Grind</li><li>Brew Weekly</li><li>The Roast Report</li>
    <li aria-hidden="true">Daily Grind</li><li aria-hidden="true">Brew Weekly</li><li aria-hidden="true">The Roast Report</li>
  </ul>
  <button type="button" class="marquee-toggle" aria-pressed="false">Pause</button>
</div>
```

```css
.marquee { overflow: hidden; }
.marquee-track { display: flex; gap: 3rem; width: max-content; padding: 0; margin: 0; list-style: none; }

@media (prefers-reduced-motion: no-preference) {
  .marquee-track { animation: vy-marquee 30s linear infinite; }
  .marquee[data-paused="true"] .marquee-track,
  .marquee:hover .marquee-track { animation-play-state: paused; }
}

@keyframes vy-marquee {
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .marquee { overflow-x: auto; }   /* the strip becomes a normal scrollable row */
  .marquee-toggle { display: none; }
}
```

```js
document.querySelectorAll('.marquee-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const marquee = button.closest('.marquee');
    const paused = marquee.dataset.paused !== 'true';
    marquee.dataset.paused = String(paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Play' : 'Pause';
  });
});
```

- **Budget:** one infinite animation on the whole page counts as the maximum. Transform only.
- **Reduced motion:** a static, scrollable row with no pause button needed.
- **Mobile:** works; make the strip shorter and the gap smaller. Consider a plain static row instead.
- **Why duplicated items:** moving the track by 50% shows the second copy exactly where the first started. The copy is `aria-hidden` so screen readers read each name once.

---

## 9. Page transition (multi-page sites)

For sites with normal links between pages, the browser can cross-fade pages for you. This is a pure enhancement.

```css
@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
  }

  ::view-transition-old(root) {
    animation: vy-fade-out var(--vy-duration-base) var(--vy-ease-in) both;
  }
  ::view-transition-new(root) {
    animation: vy-fade-in var(--vy-duration-base) var(--vy-ease-out) both;
  }

  @keyframes vy-fade-out { to { opacity: 0; } }
  @keyframes vy-fade-in { from { opacity: 0; } }
}
```

- **Budget:** only a fade, 240ms each way. Do not animate large shared elements across pages unless the user asks and you have tested it.
- **Reduced motion:** the pages swap with no transition.
- **Support:** browsers without it ignore the rule and navigate normally. Do not rely on it for anything the user must see.
- **Single-page apps:** this recipe covers normal page links only. For client-side routers, follow the framework's own documentation and apply the same duration and fade-only limits.

---

## 10. Scroll progress bar

Use for: long articles. A thin bar that fills as the reader scrolls.

```html
<div class="progress" aria-hidden="true"></div>
```

```css
.progress {
  position: fixed;
  inset: 0 0 auto 0;
  height: 3px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: scroll()) {
    .progress {
      animation: vy-grow linear both;
      animation-timeline: scroll(root block);
    }
    @keyframes vy-grow { to { transform: scaleX(1); } }
  }
}
```

- **Budget:** one element, transform only, no scroll listener.
- **Reduced motion and no support:** the bar stays at zero width, so it is invisible. The page is unaffected.
- **Mobile:** fine.
