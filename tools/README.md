# tools/

Small checking scripts that keep the project healthy. Plain Node.js (`.mjs`) with few dependencies.

Planned (Day 2 of the [roadmap](../ROADMAP.md)):

| Script | What it checks |
|---|---|
| `validate-skills` | Every skill follows the Agent Skills specification: folder name matches `name`, description length, file size limits, valid links |
| `check-licenses` | Every library mentioned by a skill is listed in `THIRD_PARTY.md` with an allowed license |
| `new-skill` | Creates a new skill folder from the template |

**Status:** not written yet.
