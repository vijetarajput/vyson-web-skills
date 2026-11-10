# templates/

Starting points for contributors.

| Item | Use |
|---|---|
| [`skill-template/`](skill-template/) | Copy this folder to `skills/vyson-<your-skill>/`, rename it, and edit `SKILL.md`. The folder name must match the `name` in the header. |
| [`evals.template.json`](evals.template.json) | Copy to `evals/<your-skill>/evals.json` and fill in your test cases. |

The template folder is not inside `skills/`, so it is never installed or loaded by an agent.
