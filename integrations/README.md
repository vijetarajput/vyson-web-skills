# integrations/

Short install guides, one per AI coding agent. The skills themselves are written once in [`skills/`](../skills/). Integrations only explain how to get them into each tool.

## Officially tested agents for v0.1 (planned)

| Agent | Status |
|---|---|
| Cursor | Not yet tested |
| Claude Code | Not yet tested |
| Codex | Not yet tested |

Other agents that support the open [Agent Skills](https://agentskills.io/specification) format should work, but are **untested** and we make no promise for them.

## Install methods

1. **Recommended:** the open `skills` installer, `npx skills add vijetarajput/vyson-web-skills` (Node.js 22.20 or newer). Not yet tested against this repository.
2. **Manual copy:** copy a folder from `skills/` into the agent's skills folder. Each guide will give exact PowerShell commands.

Avoid symlinks: on Windows they often need special permissions.

Planned layout (guides are written on Day 7 of the [roadmap](../ROADMAP.md), after real testing):

```text
integrations/
├── cursor/
├── claude-code/
├── codex/
└── generic/
```
