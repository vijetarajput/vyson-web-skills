# Quality checks: design review, static checks and browser tests

There are three different kinds of checking. A report must never mix them up.

| Kind | What it is | What passing means |
|---|---|---|
| **Static check** | A program reads the text of the files (`design-lint.mjs`). No page is opened. | "The text follows these basic rules." It does **not** mean the page looks good, works on a phone or is accessible. |
| **Design review** | You look at screenshots or the live page and judge them against the checklist below. | "Here is what I saw and what I judged." It is opinion, informed by rules. |
| **Browser test** | A real browser opens the page and something is measured or tried (zoom, keyboard, resizing). | "Here is what happened, in this browser, on this screen." |

Contents: the static checker, the design review checklist, manual browser steps, how to report.

## The static checker

Run it on the folder that holds the site's HTML and CSS:

```powershell
node skills/vyson-premium-website-design/scripts/design-lint.mjs path/to/site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-premium-website-design/scripts/design-lint.mjs`). It needs Node.js 22 or newer and no installation. It reads `.html` files, `<style>` blocks and `.css` files. Add `--strict` to treat warnings as errors and `--json` for machine-readable output. Fix every `FAIL` line, and either fix every `WARN` line or explain in the report why it stays.

| Code | Looks for | Severity |
|---|---|---|
| DL001 | The `<html>` tag has no `lang` | error |
| DL002 | No `<meta name="viewport">` | error |
| DL003 | A viewport that blocks zooming (`user-scalable=no`, `maximum-scale` under 2) | error |
| DL004 | An `<img>` with no `alt` attribute | error |
| DL005 | An `<img>` with no `width` and `height` | warning |
| DL006 | No `<title>`, or an empty one | warning |
| DL007 | No `<meta name="description">` with content | warning |
| DL008 | The page does not have exactly one `<h1>` | warning |
| DL009 | A skipped heading level (for example `h2` then `h4`) | warning |
| DL010 | No `<main>` element | warning |
| DL011 | `outline: none` or `0` with no `:focus-visible` rule that shows a replacement | warning |
| DL012 | Text smaller than 12px | warning |
| DL013 | Placeholder text such as "lorem ipsum" or "company name" | warning |
| DL014 | A link with `href="#"` | warning |
| DL015 | A text and background token pair under 4.5:1 contrast | error |
| DL016 | More than three font stacks | warning |
| DL017 | A file loaded from another website (image, script, stylesheet, font, `@import`) | warning |
| DL018 | `width: 100vw` | warning |

### What the static checker cannot see

- Whether the design is good: hierarchy, balance, taste, whether it is distinctive or generic.
- Whether the page works on a phone, or whether anything overflows.
- Which of two competing CSS rules wins.
- The contrast of text on images, gradients or colours that are not in the starter tokens. DL015 only reads hex and `rgb()` colours in the `--vd-*` tokens (`--vd-text`, `--vd-muted`, `--vd-link`, `--vd-bg`, `--vd-surface`, `--vd-accent`, `--vd-accent-contrast`), and a project that uses other names is not checked.
- Inline `style=""` attributes, CSS created by JavaScript, and content built by scripts.
- Whether alt text is good (only that it exists), whether a title is useful, and whether copy is real. DL013 only finds the obvious filler phrases.
- Page speed. Nothing is measured.

## The design review checklist

Do this on a screenshot or the live page at 1440 wide and at 390 wide. Answer each line with yes, no or "not checked", and fix every "no" you caused.

**Direction**

- [ ] The direction note exists and the page follows it.
- [ ] A signature move is used at least three times, in the same way.
- [ ] At most three of the generic-template signs in `visual-direction.md` are present, each with a reason.

**Hierarchy and layout**

- [ ] The squint test: the first thing seen is the headline or key visual, the second is the main action.
- [ ] One primary button per view.
- [ ] Every section has a job that can be written in one line.
- [ ] Section layouts vary, and every element sits on a shared alignment line.
- [ ] Spacing comes from the scale, and groups are visibly grouped.

**Type**

- [ ] At most two font families (three stacks counting code), and licences recorded for any font file.
- [ ] Body text is at least 16px, with a line length of about 45 to 75 characters.
- [ ] A clear size jump between headline, section headings and body text.
- [ ] Headings wrap well, with no single word alone on a line.

**Colour and imagery**

- [ ] One accent, used for action and focus only.
- [ ] All text pairs reach 4.5:1 (large text 3:1), including muted text and text on the accent.
- [ ] No state is shown by colour alone.
- [ ] Images are one consistent style, local files with recorded licences, with alt text, sizes and lazy loading below the fold.
- [ ] No stock-photo filler, no made-up names, logos or statistics.

**Details**

- [ ] Every interactive element has visible default, hover, focus and active styles.
- [ ] Tap targets are at least 44 by 44 CSS pixels on touch screens, never under 24 by 24, or the report says it was not measured.
- [ ] Favicon, title, description and a finished footer.
- [ ] No placeholder text, dead links or broken images.

**Implementation**

- [ ] One h1, no skipped heading levels, landmarks in place, real buttons and links.
- [ ] Colours, fonts, spacing and radius come from tokens.
- [ ] No sideways scrolling at 320px, and the page works at 200 percent zoom.
- [ ] `design-lint.mjs` reports no `FAIL` lines.

## The removal test

Use it on anything in the draft that looks like a default (a glow, a badge above a heading, a card around every block, a looping marquee, invented proof). It is adapted from the "Removal Test" in the `no-ai-design-slop` skill of MengTo/skills (MIT licence, copyright 2026 Meng To; the notice is in `NOTICE.md` in this skill's folder).

1. **Name it** exactly: "eyebrow label", "radial glow", "nested card", "icon tile", "marquee".
2. **State its job**: what meaning, state, action or hierarchy does it carry? If you cannot say, that is the answer.
3. **Remove it in your head.** If the page keeps its meaning and gets clearer, delete it.
4. **If deleting loses something real,** make the smallest fix using the existing tokens and signature move.
5. **Add a replacement only if the page needs one.** Do not cover a gap with a new effect.

Do not judge a technique as bad in itself, and do not swap a distinctive choice for a safe neutral template. The test is about reflex choices, not about taste.

## Manual browser steps

Do these in Chrome or Edge on the real page. If you cannot open a browser (for example an agent working only in a terminal), write "browser test: not performed" and list the steps below that were skipped. Never imply they were done.

Open the page by double-clicking `index.html`, or in PowerShell:

```powershell
Start-Process .\index.html
```

1. **Phone width.** Press `F12`, turn on the device toolbar (`Ctrl+Shift+M`), choose 390 by 844 and reload. Read the first screen without scrolling: are the headline and main action visible? Scroll the whole page. Nothing may be cut off or overlap.
2. **Narrowest width.** Drag the width to 320. There must be no sideways scrolling.
3. **Wide screen.** Set the width to 1440, then 1920. Check that line lengths and the container stay sensible and nothing floats in empty space.
4. **Zoom.** Zoom the page to 200 percent (`Ctrl` and `+`). Text must grow, and nothing may be hidden or overlap.
5. **Text size.** In the browser settings, set the font size to Large and reload. The layout must still work.
6. **Keyboard.** Press `Tab` from the top of the page. The skip link appears first. The focus ring is visible on every link and button, the order matches the page, and nothing is skipped or trapped.
7. **Contrast spot check.** Pick the muted text, a link and a button. Check each with a contrast tool in the browser's developer tools (select the element, open the Styles pane, click the colour swatch).
8. **Scripts off** (if the page uses any): the content must still be readable.
9. **Print preview** (if the page matters on paper).

Not covered by these steps, and to be listed as "not tested" unless you did them: a real phone, Firefox and Safari, a screen reader, and a slow network.

## How to report

Finish every design task with a plain-language report in these parts. Keep the lists apart.

1. **Direction**: the direction note in short form, and anything that was a guess.
2. **What changed**: files created or edited, and what is placeholder content the user must replace.
3. **Static checks run**: the last `RESULT` line of `design-lint.mjs`, and what it does not cover.
4. **Design review**: the checklist lines that are "no" or "not checked".
5. **Browser tests run**: which numbered steps, in which browser, and what you saw. Then what was **not** tested.
6. **Licences and credits**: every font file, image and icon, with its source and licence, or "none used".

Never state a speed score, a conversion claim, an accessibility "score" or "fully accessible" for anything you did not measure. Say "untested" when something is untested.
