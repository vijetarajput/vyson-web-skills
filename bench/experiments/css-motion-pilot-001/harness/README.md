# Measuring harness

Small Node.js files that were used to measure both outputs in exactly the same way.

| File | What it does |
|---|---|
| `measure.mjs` | Version 3 (current). Opens a site in headless Chrome, runs the checks and writes a JSON file and screenshots. |
| `summarize.mjs` | Prints one side-by-side table from one or more JSON files (understands version 3 fields and the older ones). |
| `archive/measure-v2.mjs`, `archive/summarize-v2.mjs` | Version 2, kept unchanged because it produced the first published results. |

**Status: experiment-grade, not a polished tool.** It is not part of `npm run check` and has no automated tests. It was checked only by running it on a deliberately bad test page (see "Calibration") and on the two pilot outputs and the repository's example. Only Windows 10 with Chrome 156 and Node 24 was used. Other platforms are untested.

## What it needs
- Node.js 22 or newer (no npm packages for the harness itself; it talks to Chrome through the Chrome DevTools Protocol using Node's built-in `WebSocket`).
- Google Chrome installed.
- Optional: the `axe-core` file for accessibility checks. It is **not** stored in this repository. Its licence is MPL-2.0 and is recorded in [`THIRD_PARTY.md`](../../../../THIRD_PARTY.md); we use it unmodified. To get it, in a scratch folder outside the repo run `npm install axe-core`, then pass `--axe <that folder>\node_modules\axe-core\axe.min.js`.

## Run it (PowerShell)
```powershell
node measure.mjs <site folder> --out result.json --shots <screenshot folder> --axe <path to axe.min.js> --runs 3
node summarize.mjs "WITHOUT=result-a.json" "WITH=result-b.json"
```
- Add `--lint <path to motion-lint.mjs>` to also run the skill's own checker. That result is **not independent evidence** about the skill, because the checker's rules come from the skill.
- Add `--only hoverRules,accordion` (comma-separated scenario names) to run just some scenarios. Names: `motionAllowed`, `reducedMotion`, `hoverRules`, `accordion`, `scriptsDisabled`, `responsive`, `accessibility`, `performanceDesktop`, `performancePhoneCpu4x`, `screenshots`.
- The site folder path is **not** written into the result file (it is recorded as "folder path not recorded").

## What it measures
- Animations the page actually starts (read from the browser's animation list every 30 ms): hero entrance, scroll reveal, hover, FAQ open.
- Which CSS properties are animated, grouped as compositor-only (transform, opacity), layout, or other.
- Reduced motion: re-runs with `prefers-reduced-motion: reduce` emulated.
- **Hover (version 3):** every element that a `:hover` rule can change is found by reading the stylesheets, hovered with a real mouse move, and its computed style is compared before and after. It reports how many rules were found, how many elements were tested, how many changed, how many animated, and which rules declare movement that the browser did **not** apply (for example a rule that loses to a more specific rule). The old rough sample is still recorded as the "legacy" count.
- **Scripts turned off (version 3):** text that is transparent, `visibility: hidden`, or collapsed to no height is counted at desktop and phone width, and every panel named by `aria-controls` is checked for being visible.
- **Accordion (version 3):** opens two panels in a row and counts how many stay expanded.
- Horizontal scroll at 7 widths, touch targets at 390 px (version 3 lists the ones under 44 by 44 px **by name**), text size.
- Accessibility: axe-core rules, keyboard tab stops, focus indicator presence, FAQ keyboard use.
- Performance on this PC only: frame times, layout and style recalculation counts, long tasks, layout shift, at desktop and with 4x CPU slowdown.

## Gaps fixed in version 3
- The hover count was a rough sample of a fixed list of element types (it gave 10 versus 2 and I could not explain it). Replaced by the stylesheet-based real-mouse test above. The old number turned out to be a sampling artefact.
- The scripts-off check could not see collapsed content, so it missed FAQ answers that need JavaScript to appear. It now classifies hidden and collapsed text and checks `aria-controls` panels.

## Known gaps that remain
- **Frame times do not separate the sites.** Headless Chrome on this PC ran at 16.67 ms for both. Treat them as "no problem detected", not as a speed score.
- **Hover test only knows about `:hover` rules in the stylesheets.** It does not see hover effects made by JavaScript. Rules inside a media query that does not match at that moment are skipped (and counted). "Changed" means a computed style differs; it does not say whether the change looks good.
- **Scripts-off check is about the first screen load.** It does not click anything. Text that is `display: none` is listed separately because it can be legitimate. It does not know whether collapsed text is meant to be revealed by CSS alone.
- **Accordion test needs two controls with `aria-expanded`** (or the same pattern it can find). A site that builds its FAQ differently may report "not found", which is not a failure of the site.
- **FAQ test direction can differ** between sites. It clicks the first visible FAQ button. If that panel starts closed in one site and open in the other, one test opens and the other closes.
- **Touch target check** counts links and buttons only, and uses rendered size. The 44 px figure is the skill's target; the hard floor in the accessibility rule it follows is 24 px, with exceptions (spacing, links inside a sentence, and others) that this script does not model.
- **Real devices are not measured.** No real phone, no screen reader, no Firefox or Safari.
- **Performance counts come from 3 runs on one PC.** Differences of a few layouts or one long task are noise until repeated.

## Harness versions
Two bugs were found and fixed during the original experiment (version 2); each fix was applied to both outputs and both outputs were re-measured. The earlier JSON files are kept in `../results/superseded/` so the history is visible.

1. First measurement: the FAQ click happened while the scroll reveal was still moving the button, so the click missed on both outputs.
2. Second measurement: one output has a hidden mobile menu button before the FAQ in the page, and the selector chose that instead of a FAQ button.

The results in `../results/` (not in a subfolder) were produced by version 2 (`archive/measure-v2.mjs`). The results in `../results/harness-v3/` were produced by the `measure.mjs` stored here (version 3). A comparison of the two found the same values in 42 rows; the differences are explained in the experiment README, section "Update after the review".

## Calibration
Before the original experiment, version 2 was run on a small deliberately bad page (uses `transition: all`, ignores reduced motion, hides text until scripts run, has an infinite animation, has accessibility errors) and on the repository's own example. The bad page's planted problems were detected. The file `../results/calibration-bad-page.json` is the re-check after the final version 2 fixes. **Version 3 was not re-run on the bad page**; its new checks were instead verified on the two pilot outputs (where the problems are known from reading the code) and on the updated example. The bad page itself is not stored in the repository.
