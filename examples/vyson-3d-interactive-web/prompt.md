# Prompt used for this example

This is the request this example answers, written to match the page. It was **not** given to a separate agent in a clean test: the page was written by an AI agent (Claude, working in Cursor) in the same session that wrote the skill, so the prompt describes the task rather than recording a test run. To try the skill yourself, install it and give your agent this request.

```text
Build a one-page product page for the Facet paperweight from Halden Glassworks,
a made-up glass studio. The page needs an interactive 3D view of the
paperweight that the visitor can turn.

Use plain HTML, CSS and JavaScript, and plain WebGL: do not add any library,
and do not load any script, model, image or font from another website.

Use the vyson-3d-interactive-web skill. The page must still work and make sense
without the 3D view. It must work well on phones, respect reduced motion, and
fail safely when WebGL is not available.

Say clearly that the studio and the product are made up.
```

## What a good result looks like

These are the checks from the skill's acceptance list that apply to this request.

- The scene has a one-line job (let the visitor inspect the object from every side), and the page holds the text, the facts and a still drawing without it.
- The canvas has an `aria-label`, a caption describes the object, and its size is reserved in CSS.
- Turning, pausing and resetting are real buttons of at least 44 by 44 CSS pixels with a visible focus ring. They stay hidden until the scene is ready.
- With reduced motion on, nothing moves by itself, and the buttons still work.
- The pixel ratio and total pixels are capped, there is a lighter version for touch and narrow screens, and a "Load the 3D view" button when the browser asks to save data.
- The loop stops when the canvas is off screen or the tab is hidden.
- Missing WebGL, a lost context and a shader failure show the drawing and a short message.
- A vertical swipe on the canvas still scrolls the page, and the mouse wheel is not captured.
- GPU buffers and the program are freed when the page is left.
- `3d-lint.mjs` reports no `FAIL` lines.
- The report keeps static checks and browser or device tests apart, and says which devices were not tested.
