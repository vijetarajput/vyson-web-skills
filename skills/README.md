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

**Status:** five skills, all awaiting review: the pilot [`vyson-css-motion`](vyson-css-motion/SKILL.md) (motion) and four drafts, [`vyson-premium-website-design`](vyson-premium-website-design/SKILL.md) (design), [`vyson-3d-interactive-web`](vyson-3d-interactive-web/SKILL.md) (3D), [`vyson-frontend-development`](vyson-frontend-development/SKILL.md) (frontend) and [`vyson-website-quality-engineering`](vyson-website-quality-engineering/SKILL.md) (quality). None has been tested with an agent. Only the pilot is published. See the [roadmap](../ROADMAP.md). To create one, copy [`templates/skill-template/`](../templates/skill-template/).
