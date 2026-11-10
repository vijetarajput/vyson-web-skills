---
name: valid-full
description: >
  A complete valid skill used by the tests, written as folded text over two
  lines. Use when the validator tests need every optional field and folder.
license: MIT
compatibility: Needs Node.js 22 or newer. No network access required.
metadata:
  author: "test-suite"
  version: "1.0"
allowed-tools: Read Grep
---

# Valid full

## Steps

1. Read [the guide](references/guide.md#setup-steps).
2. Run `scripts/check.mjs`.
3. Start from the [starter page](assets/starter.html).

See also the [heading below](#a-second-section).

## A second section

A link to a web page is ignored by the checker: [agentskills.io](https://agentskills.io/specification).

```markdown
This link is inside a code block, so it is ignored: [missing](does-not-exist.md)
```
