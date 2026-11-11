# Prompt used for this example

This is the request this example answers, written to match the page. It was **not** given to a separate agent in a clean test: the page was written by an AI agent (Claude, working in Cursor) in the same session that wrote the skill, so the prompt describes the task rather than recording a test run. To try the skill yourself, install it and give your agent this request.

```text
Build a one-page website for Marrowfield Studio, a small made-up architecture
and interiors studio.

Use plain HTML and CSS so I can open index.html by double-clicking it. Do not
use any framework, external images, external fonts or scripts, and add no
animation.

Use the vyson-premium-website-design skill. It should feel calm, editorial and
expensive, not like a template. Include a header, a hero, a work section, one
strong contrast section about the studio's approach, a process section, a final
call to action and a footer. It must work well on phones.

Write real, specific copy. Do not invent clients, quotes or statistics, and say
clearly that the studio and its projects are made up.
```

## What a good result looks like

These are the checks from the skill's acceptance list that apply to this request.

- A direction is visible: one signature move used several times (here: large serif type, thin line drawings and one terracotta circle).
- The first thing seen is the headline, then the one primary action.
- Colours, fonts and spacing come from the tokens in `design-tokens.css`.
- Section layouts differ from each other, and there is no row of equal icon cards.
- No stock photos, no placeholder text, no `#` links, nothing loaded from another website.
- All text pairs reach 4.5:1 contrast, and the focus ring is visible.
- No sideways scrolling at 320px, and tap targets of 44 by 44 CSS pixels.
- `design-lint.mjs` reports no `FAIL` lines.
- The agent's report keeps static checks, the design review and browser tests apart, and says what was not tested.
