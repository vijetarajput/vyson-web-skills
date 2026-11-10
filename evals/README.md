# evals/

Behavior tests for individual skills. An eval answers: "When an agent gets this request, does it use the skill and do the right things?"

Planned layout:

```text
evals/
└── <skill-name>/
    └── evals.json
```

Each `evals.json` contains test cases. A case has:

- a **prompt** (what the user asks),
- whether the skill **should activate**,
- a list of things that **must be true** about the result,
- a list of things that **must not happen**.

Every skill needs at least one case where the skill should **not** activate, to catch skills that trigger too often.

Start from [`templates/evals.template.json`](../templates/evals.template.json).

Evals are reviewed and run by people, with an AI agent. They are not run automatically on every commit, because each run uses agent time. The cross-agent comparison lives in [`bench/`](../bench/).

**Status:** empty. The first eval file arrives with the pilot skill.
