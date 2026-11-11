# Performance budget, fallbacks and checks

All numbers on this page are **VYSON defaults, not measured results**. They are starting points taken from common practice. Replace them with numbers you measure on the devices that matter, and say in the report which you used.

## The budget

State a budget before building and check against it at the end.

| Item | Desktop default | Light (phone) default | Why |
|---|---|---|---|
| Model file | 3 MB or less | 1 MB or less | Download time on mobile networks |
| Each texture | 2048 px or less on the long side | 1024 px or less | GPU memory grows with the square of the size |
| All 3D files together (models, textures, environment maps) | 5 MB or less | 2 MB or less | First-load cost |
| Triangles on screen | About 100,000 or fewer | About 30,000 or fewer | Fill and vertex cost on weak GPUs |
| Draw calls per frame | About 100 or fewer | About 40 or fewer | CPU cost of issuing draws |
| Drawing buffer pixel ratio | 2 or less | 1.5 or less | A pixel ratio of 3 draws 9 pixels for every one drawn at 1 |
| Drawing buffer total pixels | About 2.1 million (1920 by 1080) or less | About 1 million or less | The largest single cost of most scenes |
| Live WebGL contexts per page | 1 | 1 | Browsers limit them |
| Frame time target | 16.7 ms (60 frames per second) | 33 ms (30 frames per second) is acceptable | Smoothness. Only a real measurement counts |

The starter `assets/canvas-stage.js` enforces the pixel ratio and total pixel caps for you, and `pickQuality()` returns the light values on touch screens, narrow screens and low-memory devices.

## The fallback ladder

Build every rung that applies and test each one you can.

| Rung | When | What the visitor gets |
|---|---|---|
| `high` | Capable desktop, no restrictions | The full scene, within the desktop budget |
| `low` | Touch or narrow screen, low device memory | Lower pixel ratio and pixel cap, simpler geometry or textures, no shadows or post-processing, fewer lights |
| `poster` | The browser asks to save data (`navigator.connection.saveData`), or the model is very heavy | The still image, the text and a button "Load the 3D view" |
| Reduced motion | `prefers-reduced-motion: reduce` | The scene may load, but nothing moves by itself: no auto-rotation, no camera sweeps, no scroll-driven camera. Buttons still move the object, one frame at a time |
| No WebGL | `getContext` returns `null`, the renderer throws, or the context is lost for good | The still image or drawing, the text and a one-line message |
| No JavaScript | Script blocked or failed | The same still image and text (a `<noscript>` note is enough) |

Notes:

- Reduced motion is not "no 3D". It is "no automatic movement".
- Never decide only by user agent or screen width. Use the signals above and let the visitor override with a button.
- Always show a message when the scene fails. A blank rectangle looks broken.

## Draw only when it is worth it

- **Pause off screen.** Use `IntersectionObserver` on the canvas. Stop the loop when it leaves the viewport.
- **Pause in a hidden tab.** Listen to `visibilitychange`.
- **Draw on demand** when nothing moves: render one frame after each interaction instead of looping.
- **Clamp the time step.** After a tab sleeps, cap the frame delta (the starter uses 0.1 seconds) so the scene does not jump.
- **Resize with `ResizeObserver`**, not a `resize` listener that recreates things.
- **Keep work out of the frame.** Allocate vectors and matrices once, not each frame. Avoid creating objects inside the render function.

`assets/canvas-stage.js` does all of the above. If you use your own loop, do all of it yourself.

## Memory and teardown

GPU memory is not garbage collected. When the scene is removed (page change in a single-page app, a hidden panel, `pagehide`):

- **Three.js:** call `geometry.dispose()`, `material.dispose()`, `texture.dispose()` for each, and `renderer.dispose()`. Stop the loop first.
- **Plain WebGL:** `gl.deleteBuffer`, `gl.deleteTexture`, `gl.deleteProgram`, `gl.deleteShader`.
- Remove event listeners you added to `window` or `document`.

## Context loss

The browser can take the WebGL context away (driver reset, too many contexts, a background tab). Listen for `webglcontextlost` on the canvas and call `event.preventDefault()` so the browser may restore it. Show the fallback while it is lost. On `webglcontextrestored`, rebuild every GPU resource (buffers, textures, programs). The stage helper wires the events and calls your `onContextLost` and `onContextRestored`.

## What the static checker covers

`scripts/3d-lint.mjs` reads text and file sizes. It never runs the scene.

| Rule | What it reports | Severity |
|---|---|---|
| TD001 | The render loop has no way to stop | error |
| TD002 | No prefers-reduced-motion handling | error |
| TD003 | The pixel ratio is not limited | warning |
| TD004 | A canvas has no accessible name | error |
| TD005 | No check that WebGL is available | warning |
| TD006 | No handling of WebGL context loss | warning |
| TD007 | Nothing pauses the scene off screen or in a hidden tab | warning |
| TD008 | The canvas has no static fallback in the HTML | warning |
| TD009 | A script, model or texture is loaded from another website | error |
| TD010 | GPU objects are created but never freed | warning |
| TD011 | A wheel or touch listener is non-passive | warning |
| TD012 | Pointer controls but no touch-action in the CSS | warning |
| TD013 | A model or texture file is large | warning |
| TD014 | The 3D assets add up to a lot of data | warning |

The checks are text patterns, so they can miss problems and flag code that is fine. They cannot see what the scene looks like, how fast it runs, or whether a fallback really appears.

## What only a browser and a device can tell you

Run these in a real browser, and label them **browser test** in the report. Serve the folder first (`scripts/serve.mjs`) because module scripts and model files do not load from `file://`.

1. **Fallback rungs.** Block WebGL (in Chrome, start with `--disable-gpu --disable-3d-apis`) and confirm the still image and the message appear. Emulate reduced motion (DevTools, Rendering, "Emulate CSS prefers-reduced-motion") and confirm nothing moves by itself.
2. **Pause.** Scroll the canvas out of view, or switch tab, and confirm drawing stops (the DevTools Performance panel shows the frames stop).
3. **Phone width.** Check 320, 390 and a tablet width: no sideways scrolling, the controls are at least 44 by 44 CSS pixels, and a vertical swipe on the canvas scrolls the page.
4. **Keyboard.** `Tab` reaches every button in order with a visible focus ring, and `Enter` or `Space` works.
5. **Frame time.** Record a few seconds in the DevTools Performance panel with CPU throttling (for example 4x slowdown) as a rough stand-in for a weak phone. Note the numbers.
6. **A real phone.** Open the page on at least one real phone if you can, and say which. Headless or software-rendered Chrome tells you nothing about GPU speed.

If you did not do a step, say "not performed" and name it.

## Report the difference between measuring and assuming

Good (the wording shows the format; fill in your own measured numbers): "On <named laptop> with <browser and version>, CPU throttled 4x, the Performance panel showed <your measured frame rate>. Not tested on a phone."

Bad: "Optimised for mobile." "Runs at 60 frames per second everywhere."
