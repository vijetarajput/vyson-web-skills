---
name: skill-template
description: TEMPLATE. Replace this text. Say what the skill does AND when an agent should use it, using words a user might actually say (for example "build a luxury real-estate landing page"). Maximum 1024 characters.
license: MIT
metadata:
  vyson-pillar: "design | motion | 3d | frontend | quality"
  vyson-version: "0.0.0"
  vyson-status: "template"
---

# Skill Title

One or two sentences: what this skill helps the agent do, and for whom.

## When to use

- A situation where the skill should activate.
- Another situation.

## When not to use

- A similar-looking situation where a different skill or no skill is better.

## Before you start

Ask the user only for what you cannot work out yourself:

1. Question one.
2. Question two.

## Steps

1. First step. Be specific and practical.
2. Second step.
3. Third step.

## Output

Describe exactly what the agent should produce (files, structure, or report).

## Acceptance checks

The work is finished only when all of these are true:

- [ ] Check one (something that can be verified).
- [ ] Check two.

## Motion and 3D contract (delete this section if the skill has no animation or 3D)

- **Performance budget:** state limits (for example, animate only `transform` and `opacity`; maximum model size).
- **Reduced motion:** state what happens when the user has `prefers-reduced-motion: reduce`.
- **Mobile fallback:** state what small or weak devices get instead.

## Accessibility

- Everything the skill produces must work with a keyboard and have text alternatives where needed.

## References

Link detail files directly from here, one level deep:

- [Example reference](references/example.md)

## Licensing notes

List any library this skill recommends and confirm it appears in `THIRD_PARTY.md`.
