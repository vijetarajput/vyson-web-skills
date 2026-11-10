# examples/

Small demo websites that show what each skill produces. Examples are proof: a visitor should be able to see the result before installing anything.

Planned layout, one folder per skill:

```text
examples/
└── <skill-name>/
    ├── prompt.md       the exact request given to the AI agent
    ├── result/         the website files the agent produced
    ├── preview.jpg     a screenshot of the result
    └── CREDITS.md      license and source of every font, image, model or icon used
```

Rules:

- Plain HTML, CSS and JavaScript first, so a beginner can open the page by double-clicking it. Vite is used where a build tool is required (for example 3D examples).
- Every asset must have a recorded license. See [THIRD_PARTY.md](../THIRD_PARTY.md).
- Results are shown as produced. We do not hand-polish output and present it as the skill's work.

**Status:** empty. The first example arrives with the pilot skill (Day 3 of the [roadmap](../ROADMAP.md)).
