# Typography and spacing

Type does most of the work of a premium look. The numbers here are VYSON design defaults, not measured results; adjust them to the direction note.

Contents: choosing fonts and licences, the type scale, line length and leading, headings, details that show care, spacing rules.

## Fonts and licences

1. **Start with system font stacks.** They need no download, no licence check and no privacy decision, and they load instantly. The starter file defines a serif stack for display text and a system sans stack for body text. System fonts differ between Windows, macOS, Android and iOS, so the same page looks slightly different on each. Say so in the report.
2. **Add a web font only when the direction needs one**, and only when you can verify its licence from an official source. Self-host the font file in the project. Do not load fonts from another website, because that adds a third party, can leak visitor data and can fail.
3. Record each font file in the project's credits: name, version, licence and the official source. Do not assume "free to download" means "free to redistribute".
4. Use at most **two families** (a display face and a text face), or one family with a clear range of weights. A third face only for code or data.
5. Load only the weights you use (usually 400 and 600 or 700), as `woff2` files, with `font-display: swap`.
6. Give every stack a fallback that has similar proportions, so the page does not jump when the font arrives.

## The type scale

Pick a scale and use only its sizes. The starter file has seven steps from small text to display size. Rules:

- **Body text 16px (1rem) or larger.** The starter uses about 17px. Small print and labels may go down to 14px, never below 12px (DL012).
- **Use a ratio, not guesses.** Between neighbouring steps, a ratio of about 1.2 to 1.333 gives a calm result, and 1.5 or more gives a dramatic one.
- **Make the headline large enough to be a decision.** Between a body size of 17px and a display size of 80px there is enough contrast for hierarchy. A 28px headline over 17px text is timid.
- **Use fluid sizes with `clamp()`.** Mix `rem` and `vw` (for example `clamp(2.25rem, 1.6rem + 3.2vw, 4rem)`). A size made only of `vw` does not grow when the visitor zooms, which fails people who need larger text.
- **Set sizes in `rem`**, not `px`, so a visitor's browser text setting is respected.

## Line length and leading

| Text | Line length | Line height |
|---|---|---|
| Body paragraphs | 45 to 75 characters (`max-width: 65ch`) | 1.5 to 1.7 |
| Large intro paragraph | 40 to 60 characters | 1.4 to 1.5 |
| Headings | Break lines for meaning; use `text-wrap: balance` | 1.05 to 1.2 |
| Display headline | As the layout needs | 0.95 to 1.1 |
| Small labels | Short | 1.3 to 1.4 |

- Lines that are too long tire the reader, and lines that are too short break the rhythm.
- Tight leading is for large type only. Never set body text below 1.4.
- Reading text should stay left-aligned. Avoid justified text on the web; it creates uneven gaps.

## Headings

- Headings are for structure. The level (`h2`, `h3`) follows the outline, and the size comes from CSS.
- Use one family for headings across the site. Vary weight, size and case, not family.
- Keep headings short and specific. "Three rooms, one afternoon of light" says more than "Our Services".
- Avoid all-caps for anything longer than a short label. When you use caps, add letter spacing of about 0.08em to 0.14em.
- Do not use bold and italic and caps on the same line.

## Details that show care

- Use `font-variant-numeric: tabular-nums` for prices, dates and numbers that line up in columns.
- Use real typographic characters: curly quotes, en dashes in ranges, a true minus, and a non-breaking space between a number and its unit.
- Control widows and orphans in headlines with `text-wrap: balance` (a newer CSS feature; browsers without it wrap normally).
- Keep link styles obvious in running text: colour plus underline, with enough contrast.
- Set `hyphens: auto` only if the page has a correct `lang` and narrow columns; otherwise leave it off.
- Do not letter-space lowercase body text.

## Spacing

- One scale, in `rem`: the starter file has steps from 0.25rem to 6rem. Use only those values for `margin`, `padding` and `gap`.
- Space between sections is bigger than space between elements in a section, which is bigger than space inside a component. If every gap is the same, the page has no grouping.
- Make related things touch the same edge. Align a heading, its text and its button on one left edge.
- Control vertical rhythm in text by one rule: `margin-block-start` on following siblings (the `.vd-stack` helper does this) instead of margins on both sides.
- Keep the same horizontal padding for the container at every width (`--vd-gutter`).
- Do not use negative margins to fix a layout problem. Fix the cause.

## Quick fixes for common problems

| Problem | Likely cause | Fix |
|---|---|---|
| Looks "default" | One size, one weight, system sans everywhere | Add a display face or weight, increase heading size, add size contrast |
| Looks cramped | Same small gap everywhere | Increase section space, add space between groups, reduce elements |
| Hard to read | Long lines, low contrast, small text | `max-width: 65ch`, check contrast, raise body size |
| Headline wraps badly | One long word on a line | `text-wrap: balance`, a manual `<br>` only when the meaning needs it, smaller size on phones |
| Looks uneven | Too many sizes | Reduce to the scale |
