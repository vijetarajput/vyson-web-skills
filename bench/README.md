# bench/: VYSON Bench

A reproducible way to compare what an AI coding agent produces **with** and **without** VYSON skills, using the same brief.

**Status: design only. No benchmark has been run. There are no results.** Nothing in this repository may claim a benchmark result until it appears in `results/` with its raw data.

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
├── briefs/       fixed business briefs
├── rubric.md     human scoring guide
├── runner/       automated checks
└── results/      raw outputs and scores, per date, agent and model
```
