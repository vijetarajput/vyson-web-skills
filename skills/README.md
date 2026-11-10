# skills/

This is the product. Each folder here is one **Agent Skill** that an AI coding agent can load.

```text
skills/
└── vyson-<skill-name>/
    ├── SKILL.md        required: header (name, description) + instructions
    ├── references/     optional: deeper guides, loaded only when needed
    ├── scripts/        optional: small helper scripts
    └── assets/         optional: starter files, checklists
```

Rules (full detail in [CONTRIBUTING.md](../CONTRIBUTING.md)):

- Folder name = skill `name`, starts with `vyson-`.
- `SKILL.md` under 500 lines.
- Every skill has an example in `examples/` and an eval file in `evals/`.

**Status:** no skills published yet. See the [roadmap](../ROADMAP.md). To create one, copy [`templates/skill-template/`](../templates/skill-template/).
