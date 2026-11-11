# examples/

Small demo websites that show what each skill produces. Examples are proof: a visitor should be able to see the result before installing anything.

Planned layout, one folder per skill:

```text
examples/
└── <skill-name>/
    ├── prompt.md       the exact request given to the AI agent
    ├── result/         the website files the agent produced
    ├── preview.png     a screenshot of the result
    └── CREDITS.md      license and source of every font, image, model or icon used
```

Rules:

- Plain HTML, CSS and JavaScript first, so a beginner can open the page by double-clicking it. Vite is used where a build tool is required (for example 3D examples).
- Every asset must have a recorded license. See [THIRD_PARTY.md](../THIRD_PARTY.md).
- Results are shown as produced. We do not hand-polish output and present it as the skill's work.

**Status:** five examples so far: [`vyson-css-motion`](vyson-css-motion/README.md), [`vyson-premium-website-design`](vyson-premium-website-design/README.md), [`vyson-3d-interactive-web`](vyson-3d-interactive-web/README.md), [`vyson-frontend-development`](vyson-frontend-development/README.md) and [`vyson-website-quality-engineering`](vyson-website-quality-engineering/README.md). The last one has no single `result/` folder: it holds a flawed site and its repaired version, with the saved output of both tools. Each example's own README says what was checked and what was not.
