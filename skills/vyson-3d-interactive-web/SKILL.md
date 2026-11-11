---
name: vyson-3d-interactive-web
description: Adds 3D and interactive canvas content to websites that stays fast, accessible and safe on phones. Decides whether 3D earns its place, picks the lightest approach (CSS 3D, 2D canvas, plain WebGL, Three.js), and builds it with a performance budget, a mobile fallback, prefers-reduced-motion handling, a static fallback, context-loss handling and a static checker. Use when a user asks for a 3D hero, product viewer or configurator, WebGL or Three.js scene, interactive canvas, particle or shader background, or a model on a page, or asks to make an existing 3D scene faster or safer on mobile. Not for CSS animation (use vyson-css-motion), general page design, or non-visual frontend logic.
license: MIT
metadata:
  vyson-pillar: "3d"
  vyson-version: "0.1.0"
  vyson-status: "draft"
---

# VYSON 3D and Interactive Web

Helps an AI coding agent add 3D to a website without breaking the page. The idea: a 3D scene is an upgrade on top of a page that already works. The page must make sense without it, stay light, stop drawing when nobody can see it, respect people who want less motion, and have a fallback for phones and for browsers where WebGL fails.

Detail lives in four reference files and three bundled tools. Read them when the steps tell you to.

## When to use

- "Add a 3D hero / product viewer / rotating model / configurator."
- "Build a Three.js (or WebGL, or React Three Fiber) scene."
- "Add an interactive canvas, particles, a shader background or a globe."
- "My 3D page is slow, hot, or broken on phones." "Make this scene respect reduced motion."

## When not to use

- **CSS motion.** Hover effects, fade-ins, scroll reveals and CSS transforms (including a CSS-only card flip): use the `vyson-css-motion` skill if it is installed. This skill covers canvas and WebGL.
- **Page design.** Layout, type, colour and imagery of the page around the scene: use `vyson-premium-website-design` if it is installed. This skill sets up the viewer and its fallback, not the look of the site.
- **App logic.** Forms, data, accounts, routing and framework wiring: use `vyson-frontend-development` if it is installed.
- **Auditing a finished site.** Use `vyson-website-quality-engineering` if it is installed.
- Games and heavy simulations. They need budgets and testing beyond this skill. Say so instead of improvising.
- Making 3D models. This skill uses models that exist, with a licence. It does not model, rig or texture.

## The 3D contract

A 3D feature is finished only when all five are true.

- **It earns its place.** There is a one-line job for the scene ("lets a buyer inspect the product from every side"), and a still image would do that job worse. If not, recommend the image.
- **The page works without it.** Real text, a still image or drawing, and the key facts are in the HTML. The scene is added on top.
- **It stays light.** A stated budget (see [performance-and-fallbacks.md](references/performance-and-fallbacks.md)), a capped pixel ratio, and drawing only while visible.
- **It respects the visitor.** `prefers-reduced-motion` turns off automatic movement. Phones and "save data" get a lighter version or the still image. Touch scrolling still works. Everything the scene offers is reachable with a keyboard-operable control.
- **It fails safely.** No WebGL, a lost context, or a failed model load shows the fallback and a short message, not a blank box.

The numbers in this skill are VYSON defaults, not measured results. Do not claim a frame rate, a load time or a score unless you measured it on a named device.

## Before you start

Work out what you can from the project. Ask the user only for what you cannot find out, and ask at most three questions.

1. **Find the project type.** Plain HTML, Vite, Next.js, React, Vue? Is Three.js (or React Three Fiber) already installed? What is the build and where do static files go?
2. **Find the assets.** Is there a model, texture or image? What is its licence? Never invent a licence or use a model of unknown origin.
3. **Find the job.** What should the visitor be able to do with the scene?
4. **Find the audience devices.** If unknown, assume a mid-range phone is a target and a laptop with a weak GPU is common.
5. **Find the page around it.** Existing brand and layout stay as they are.

## Steps

### 1. Decide whether 3D is right

Write the job of the scene in one line, then run the test in [choose-approach.md](references/choose-approach.md): would a photo, a looping video or a CSS effect do the job? If yes, say so and offer that, and build 3D only if the user still wants it.

### 2. Choose the lightest approach

Use the table in [choose-approach.md](references/choose-approach.md). In short: CSS for flat depth effects, a 2D canvas for particles and charts, plain WebGL for one simple shape or shader, Three.js for models, materials and lighting, React Three Fiber only if the project is already React. Do not add a library to draw one cube. If a library is needed, name it, state its licence, pin the version, and ask before adding a dependency the project does not have.

### 3. Build the page shell first

Before any scene code, write the HTML the page needs without 3D: a heading, the real text, a fallback block (`class="fallback"` with a still image or inline SVG), the facts as text, and a `<canvas>` with an `aria-label`. Reserve the canvas size with CSS (`aspect-ratio`) so the page does not jump when the scene starts. Add real buttons for each action the scene offers (turn, pause, reset). Hide the buttons until the scene is ready. See [interaction-and-accessibility.md](references/interaction-and-accessibility.md).

### 4. Set up the stage

Copy [assets/canvas-stage.js](assets/canvas-stage.js) into the project and import it. It runs the draw loop only while the canvas is on screen and the tab is visible, handles resizing, caps the drawing buffer, honours reduced motion, and handles context loss. Use `pickQuality(readEnvironment())` to choose between `poster`, `low` and `high`, and `getWebGLContext()` so a missing WebGL gives `null` instead of an exception. Three.js has its own loop: either let the stage call `renderer.render()` from its `render` callback, or follow the patterns in [threejs-patterns.md](references/threejs-patterns.md).

### 5. Build the scene

Keep it small: few draw calls, small textures, one light setup, no post-processing unless the job needs it. For Three.js, follow [threejs-patterns.md](references/threejs-patterns.md): pinned version, local files, `renderer.setPixelRatio` clamped, `dispose()` on teardown, models loaded from the project and never from a CDN. Check licences of every model and texture and write them in `CREDITS.md`.

### 6. Add interaction and accessibility

Pointer drag to rotate, with `touch-action: pan-y` on the canvas so vertical swipes scroll the page. Buttons that do the same thing for keyboard and screen reader users. A pause control if anything moves by itself. Never hijack the mouse wheel or lock the page scroll. Details in [interaction-and-accessibility.md](references/interaction-and-accessibility.md).

### 7. Apply the budget and the fallback ladder

Go through [performance-and-fallbacks.md](references/performance-and-fallbacks.md): the budget table, the fallback ladder (`high`, `low`, `poster`, no WebGL), loading the scene lazily after the first paint, memory cleanup and the reduced-motion rule. Make each rung work and test each one you can.

### 8. Run the checks

Run the bundled static checker on the folder with the site's files:

```powershell
node skills/vyson-3d-interactive-web/scripts/3d-lint.mjs path/to/site
```

Use the path where the skill is installed (for example `.agents/skills/vyson-3d-interactive-web/scripts/3d-lint.mjs`). Fix every `FAIL` line. Read every `WARN` line and fix it or explain why it stays.

**This is a static check.** It reads text and file sizes. It never opens a browser, runs a scene or measures frame rate, and passing it is not a performance test.

Module scripts and model files do not load from a page opened by double-clicking it. To test in a browser, serve the folder: `node skills/vyson-3d-interactive-web/scripts/serve.mjs path/to/site` (it listens on your own computer only). Then do the browser and device checks in [performance-and-fallbacks.md](references/performance-and-fallbacks.md). If you cannot open a browser, say "browser test: not performed" and list what you skipped. A desktop test is not a phone test: say which devices you tested.

### 9. Report

Give a short report in plain language: the scene's job and approach, the budget and what you measured against it, which fallback rungs exist and which you tested, the static check result (paste the last `RESULT` line), the browser and device tests run and not run, and the licences. Keep static checks and browser tests in separate lists. Never claim a frame rate or "smooth on mobile" that you did not measure on a real device.

## Common mistakes

| Mistake | Why it hurts | Instead |
|---|---|---|
| 3D because it looks impressive | Slow, hot, and the visitor cannot find the product details | Write the job first, and use an image if it does the job |
| Drawing at full pixel ratio on phones | The buffer can be 9 times larger than needed | Clamp the pixel ratio and the total pixels |
| A loop that never stops | Battery drain and a janky page in the background | Draw only while visible; use the stage helper |
| No reduced-motion handling | Auto-rotation and camera moves make some people ill | Start still; let controls move the object |
| Canvas without a name or text | Screen reader users get nothing | `aria-label`, text description, real buttons |
| Model or library loaded from a CDN | Privacy, licence and uptime risk | Keep pinned local files |
| Hijacking scroll or wheel | Visitors get stuck inside the canvas | `touch-action: pan-y`, passive listeners |
| Never calling `dispose()` | GPU memory leaks when the scene is removed | Free geometries, materials, textures, renderer |
| Several WebGL contexts on one page | Browsers limit them; old ones get lost | One canvas, one context |
| "Smooth on all devices" | Nothing was measured | Say which device and tool you used, or say untested |

## Output

- The page shell (HTML, CSS), the scene code, the stage helper copied into the project, and any local model or texture files with credits.
- A fallback for every rung of the ladder, and a report as in step 9.
- No remote scripts, no CDN, no telemetry. No dependency added without telling the user.

## Acceptance checks

The work is finished only when all of these are true:

- [ ] The scene has a one-line job, and a still image would not do it as well (or the user chose 3D anyway).
- [ ] The page has real text, a fallback image or drawing, and the key facts without the scene.
- [ ] The canvas has an `aria-label` and a nearby text description, and its size is reserved in CSS.
- [ ] Every action the scene offers has a real button with a visible focus ring and a touch target of at least 44 by 44 CSS pixels (never under 24 by 24).
- [ ] With `prefers-reduced-motion: reduce`, nothing moves by itself, and the controls still work.
- [ ] The pixel ratio and the total pixels are capped, and the budget numbers are stated in the report.
- [ ] The loop stops when the canvas is off screen or the tab is hidden.
- [ ] `getContext` or the renderer is checked, and missing WebGL, a lost context and a failed model load show the fallback.
- [ ] Vertical swipes still scroll the page on touch screens, and the wheel is not hijacked.
- [ ] GPU objects are freed on teardown.
- [ ] Models, textures and libraries are local, pinned, and have a recorded licence.
- [ ] `3d-lint.mjs` (a static check) reports no `FAIL` lines.
- [ ] The report keeps static checks and browser or device tests apart, and says which devices were and were not tested.

## Accessibility

- Names and text: the canvas has an `aria-label`, and the page has a text description of what it shows and the facts a visitor needs. Do not put essential information only inside the scene.
- Keyboard: every action is a real `<button>` reachable with `Tab`, operated with `Enter` or `Space`, with visible focus.
- Motion: respect `prefers-reduced-motion`, offer a pause control, and avoid fast spinning, flashing and large camera sweeps.
- Touch: 44 by 44 CSS pixels to aim for, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8).
- Contrast and text: the text and buttons around the scene meet 4.5:1 contrast. Never draw essential text only into the canvas.

## References

Load these only when needed. They are one level deep and do not link to each other.

- [choose-approach.md](references/choose-approach.md): does 3D earn its place, the approach table, asset licences, loading models.
- [performance-and-fallbacks.md](references/performance-and-fallbacks.md): the budget, the fallback ladder, pausing, memory, reduced motion, browser and device checks, the checker rules.
- [threejs-patterns.md](references/threejs-patterns.md): a safe Three.js setup, loading and disposing models, React Three Fiber notes, mounting in Vue, React and Next.js.
- [interaction-and-accessibility.md](references/interaction-and-accessibility.md): pointer and touch, keyboard controls, text alternatives, motion comfort.
- [assets/canvas-stage.js](assets/canvas-stage.js): the loop, sizing, pause, reduced-motion and context-loss helper (no dependencies).
- [scripts/3d-lint.mjs](scripts/3d-lint.mjs): the static checker (14 rules, TD001 to TD014). Needs Node.js 22 or newer, no installation.
- [scripts/serve.mjs](scripts/serve.mjs): a local static server (your computer only) for trying module and model files in a browser.

## Licensing notes

This skill includes no third-party code, models or textures. It mentions Three.js (MIT licence, verified on 10 November 2026 from its npm listing) and React Three Fiber (MIT) as options the project may install; their licences and versions must be re-checked before use. Models, textures, HDR files and fonts you add keep their own licences: record the source and licence of each one, and do not use assets whose terms you cannot confirm.
