# Blind review, attempt 0 (RUBRIC.md was missing, so this review is UNSCORED)

Status: kept for the record. It is not the primary subjective evaluation, because the evaluator never saw the rubric (my mistake: the rubric file was deleted by a folder re-creation step that ran in the same batch). It used its own free-form structure and gave no 1 to 5 scores.

Evaluator: fresh generalPurpose sub-agent, model claude-sonnet-5-5-high.

Its stated overall verdict (verbatim summary): "The two sites are close ... I lean slightly toward B for visual craft, accessibility and reliability of its motion. A has the richer motion and a real mobile menu, but its CSS has a likely bug and a flatter look."

Claims it made (all from reading code and screenshots, none measured):
- A: headline wraps to 3 lines with an orphan word; flat stripe/gradient card art; floating hero shapes loop forever; logo rotates on hover; hamburger menu; sticky blurred header; FAQ grid-row animation; padding and max-height transitions (layout properties).
- A: probable CSS bug. `.js .reveal.in { transform: none }` has higher specificity than `.card:hover` / `.step:hover`, so the hover lift probably never applies after reveal (inferred, not run).
- A: reduced motion shortens durations to 0.01ms; hover transforms still snap to end state.
- A: project cards link to #contact; role="region" on FAQ answers is noise.
- B: headline fits on two lines; illustrated cards (house, arch hall, louvres, glass roof, bars, moon); FAQ first answer open.
- B: all movement inside prefers-reduced-motion: no-preference; reveal class only added when motion allowed; hover gated to fine pointers; reveal on `li` and lift on inner `article` to avoid transform conflicts; only layout-property animation is FAQ grid rows.
- B: weaknesses: no mobile menu (links stay inline on 390px, inferred); nav link tap height probably under 44px (judgement); cards lift on hover but are not links; FAQ starts `data-open="true"` and the script closes the others (possible flash, not observed); fewer "wow" effects.
- Evaluator saw a folder named "sealed" in the listing and says it did not open it.
