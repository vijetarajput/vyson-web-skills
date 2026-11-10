# bench/: VYSON Bench

A reproducible way to compare what an AI coding agent produces **with** and **without** VYSON skills, using the same brief.

**Status: the benchmark described below (3 repeats per condition, several briefs) has NOT been run. There are no benchmark results.** Nothing in this repository may claim a benchmark result until it appears in `results/` with its raw data.

One small exploratory pilot has been run and is reported honestly in the next section. It is **not** this benchmark, and it must not be quoted as evidence that the skills work.

## Pilot experiment so far (exploratory, not the benchmark)

| | Pilot experiment | Planned benchmark |
|---|---|---|
| Report | [`experiments/css-motion-pilot-001`](experiments/css-motion-pilot-001/README.md) | not written yet |
| Date | 2026-11-10 | not scheduled |
| Skill | `vyson-css-motion` only | all five v0.1 skills |
| Task | one brief ("Harborline Architects", one page) | several fixed briefs |
| Runs per condition | **1** | **3** (and ranges reported) |
| Isolation | **soft**: separate empty folders and fresh agent sessions, but the "without" agent still saw this repository's `AGENTS.md` (which includes motion guidance), and the skill was supplied through the prompt rather than discovered by Cursor | clean workspaces without those leaks, with skill discovery verified independently (see the [three-repeat plan](experiments/css-motion-repeat-plan.md), **not started**) |
| Human raters | none yet (a review sheet is prepared) | at least 3, blind |
| AI reviewer | one blinded review (24 versus 25 out of 30) | optional extra, never a substitute for humans |

**What the one run showed (measured by a script, same steps for both outputs, one PC, headless Chrome):** the with-skill output obeyed the skill's own motion rules and had fewer detected problems on automated checks (for example no `!important`, no endless animations, 0 automated accessibility violations against 1 rule on 6 elements for the other output, and FAQ answers that stay readable when JavaScript is off). It was worse on phone tap-target size and had no mobile menu. Frame times did not differ, and its subjective AI review was a tie within noise.

**What it does not show:** that the skill makes sites better or faster, that it generalises to other briefs or models, or that Cursor finds the skill by itself. One run per condition cannot separate the skill's effect from ordinary run-to-run variation.

The measuring script used in the pilot is stored with its report and has known gaps listed in [its README](experiments/css-motion-pilot-001/harness/README.md). It is experiment-grade, not the planned `runner/` below.

## Method (planned)

1. **Fixed briefs.** Business briefs with supplied copy (for example a luxury interior studio, a real-estate listing, a SaaS product, an agency, a 3D product page), so writing quality does not affect results.
2. **Two conditions.** A: the agent with no skills. B: the same agent with the VYSON skills installed.
3. **Controlled setup.** A fresh project for each run. Record the agent, model name, date and the commit of this repository.
4. **Repeat each run 3 times**, because AI output varies. Report ranges, not a single result.

## Automated measurements

| Area | Measure | Tool |
|---|---|---|
| Builds and runs | Build succeeds, console errors | Node.js, Playwright |
| Mobile responsiveness | Horizontal overflow at 360, 768, 1024 and 1440 px, plus screenshots | Playwright |
| Accessibility | Violations by severity | axe-core |
| Performance | Core Web Vitals, page weight | Lighthouse |
| SEO and best practice | Lighthouse categories | Lighthouse |
| Code quality | Lint and typecheck pass, where applicable | Project tools |
| Motion safety | Behavior when `prefers-reduced-motion` is set | Playwright |
| Install success | Skill discovered, then activated by a trigger prompt | Per-agent checklist, Windows first |

## Human rubric

Five criteria, each scored 0 to 4, with written descriptions of what a 0, 2 and 4 look like: visual hierarchy, typography and spacing, brand fit, motion taste, originality ("not generic"). At least 3 raters, blind (A and B shuffled, labels hidden). Raw scores and rater agreement are published.

## Reporting rules

- No hidden composite score: show each measure and the with/without difference.
- Publish raw outputs and failures, including cases where the skills do not help.
- State that sample sizes are small. The results are evidence, not proof.
- Acceptance thresholds are set after a pilot, from real data, not guessed in advance.

## Planned layout

```text
bench/
├── briefs/       fixed business briefs (not created yet)
├── rubric.md     human scoring guide (not created yet)
├── runner/       automated checks (not created yet)
├── results/      raw outputs and scores of the real benchmark (empty: not run)
└── experiments/  exploratory one-off experiments, each with its own honest report
    ├── css-motion-pilot-001/       the one-run pilot (done)
    └── css-motion-repeat-plan.md   plan for a controlled three-repeat run (not started)
```
