# Prompt used for this example

This is the exact request given to the AI agent, with the `vyson-css-motion` skill installed.

```text
Build a one-page website for Northlight Coffee, a small made-up coffee roastery.

Use plain HTML, CSS and JavaScript so I can open index.html by double-clicking it.
Do not use any animation library, external images or external fonts.

Use the vyson-css-motion skill to add the motion:
- an entrance for the hero text and button,
- sections and cards that reveal as I scroll,
- hover and press feedback on buttons, links and cards,
- an FAQ whose answers open smoothly.

It should feel calm and premium, work well on phones, and respect people who
have reduced motion turned on.
```

## What a good result looks like

These are the checks from the skill's acceptance list that apply to this request.

- Five or fewer motion moments, each with a purpose.
- Only `transform` and `opacity` animated, apart from the FAQ panels.
- All movement inside `prefers-reduced-motion: no-preference`.
- With reduced motion on, every heading, card and answer is visible without scrolling tricks.
- Hover effects only on devices that hover.
- The first screen is visible without JavaScript.
- `motion-lint.mjs` reports no `FAIL` lines.
- The agent's report says what was and was not tested.
