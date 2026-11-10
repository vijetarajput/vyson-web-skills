# Blind review (scored): AI evaluator, not a human

> **This is a subjective AI judgement, not a measurement.** It is one review by one fresh AI session. Repeating it could give different scores. A difference of one point is within the noise we would expect.

## How it was run
- A fresh `generalPurpose` sub-agent session, model `claude-sonnet-5-5-high` (the same model setting as the two build runs; Cursor does not let us confirm the model that actually ran).
- It was shown the two sites as `A` and `B` (random assignment, see [`blind-mapping.md`](blind-mapping.md); the mapping was kept outside the review folder), the 8 screenshots (full-size originals; only 4 reduced JPEG copies are kept in this public repository) and the rubric in [`RUBRIC.md`](RUBRIC.md).
- It did **not** see any measurements, the task prompt's skill block, or the skill.
- An earlier attempt had no rubric because of my mistake; it is kept, unscored, in [`blind-review-attempt0-unscored.md`](blind-review-attempt0-unscored.md). It was not used to pick a better result: the scored review above is the first one that followed the rubric.

## Known weaknesses of the blinding
- Site B uses a `vy-` class prefix and a file named `motion.css`. A reader who knows this project could guess it came from the skill. The evaluator mentioned the `vy-` prefix in its notes but did not say it guessed the origin.
- The evaluator could not run the pages, so motion is judged from code and from screenshots.

## Scores (1 to 5, 5 is best)

Unsealed after scoring: **A = WITHOUT the skill, B = WITH the skill.**

| Criterion | A (without) | B (with) |
|---|---|---|
| Visual quality | 4 | 4 |
| Animation design | 4 | 4 |
| Responsive design | 4 | 3 |
| Accessibility | 4 | 4 |
| Reduced-motion support | 4 | 5 |
| Code quality | 4 | 5 |
| **Total** | **24** | **25** |

The evaluator's own conclusion: "The sites are close (24 vs 25) ... I wouldn't call a winner."

## Evaluator's reasons (condensed; all are judgement unless it says otherwise)

**Visual quality.** A: refined thin serif headline, bold arch-and-square hero, but generic stripe card art; the sand square sits very close to the lead sentence at 1280px. B: heavier headline, more specific card illustrations (house, arch, hall, bars, sun and sea), cleaner section rhythm, quieter and a little emptier hero.

**Animation design.** A: covers the whole brief and is livelier (infinite floating hero shapes, rotating logo, hamburger-to-X) but some motion has no clear purpose (infinite float, lift on non-clickable steps, FAQ hover moves text with `padding-left`). B: restrained and planned (four purposeful moments, shorter distances on phones, hover only on hover-capable devices); less "wow", nothing ambient.

**Responsive design.** A: real mobile menu, full-width button, hover lifts removed on touch. B: good fluid grids and `clamp()` type, but **no mobile menu**; the nav probably wraps on a 390px phone and its links have small tap areas (inferred from CSS, not measured by the evaluator).

**Accessibility.** Both: skip link, visible focus ring, `aria-expanded` and `aria-controls` on the FAQ, closed answers unreachable by Tab. A: `role="region"` on every FAQ answer is noise; all six cards link to `#contact`; without JavaScript the FAQ answers and mobile menu stay hidden. B: closed answers use `inert`; all answers are open without JavaScript; cards are plain `article` elements; nav tap targets are small.

**Reduced-motion support.** A: a global block that sets near-zero durations and shows revealed content; hover transforms still jump instantly. B: all travel is inside `prefers-reduced-motion: no-preference`; the reveal class is never added when motion is off; only a short colour change remains.

**Code quality.** A: readable and commented, small blemishes (`!important` overrides, two competing card transition sets). B: motion split into its own file, tokens, consistent prefixes, no `!important`, explicit fallbacks; one stale comment ("one panel at a time" while the script allows several open).

**Things the evaluator could not judge:** real timing and jank, the mobile header in both sites (screenshots too small), hero collision at widths between the screenshots, real contrast ratios, screen-reader output, other browsers, widths of 768px and 1024px.

**Biggest problem (evaluator's view).** A: the FAQ and the mobile menu depend on JavaScript. B: no mobile menu strategy, so a crowded phone header.

## Cross-checks I made against the evaluator's code claims
These are checks of the CSS text, not browser runs.
- A hides `.faq-a-inner` with `visibility: hidden` until JavaScript adds `.open` (A `styles.css` lines 167 to 171). So without JavaScript the four FAQ answers are unreadable. **Confirmed from the CSS.** Note that the measuring harness's "scripts disabled" check did **not** catch this, because that check deliberately ignores collapsed content. That is a gap in the harness.
- B collapses panels only under `.js-panels`, which JavaScript adds (B `styles.css` line 403). Without JavaScript all answers show. **Confirmed from the CSS.**
- A: `.js .reveal.in { transform: none }` (line 191, specificity of three classes) beats `.card:hover { transform: ... }` (line 125, one class plus a pseudo-class). By CSS rules the card hover-lift most likely never applies after a card has revealed. **Predicted from the CSS rules; not confirmed in a browser.**
