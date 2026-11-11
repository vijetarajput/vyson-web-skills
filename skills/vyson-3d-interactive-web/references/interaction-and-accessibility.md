# Interaction and accessibility

A 3D viewer is a custom widget. Treat it like any other: it needs a name, a text alternative, a keyboard path and a way to stop movement.

## Structure

Put the scene in a `<figure>` with a caption, so the text description sits next to it:

```html
<figure class="viewer" data-viewer data-state="loading">
  <div class="viewer-frame">
    <canvas aria-label="A 3D view of the product. Use the buttons below to turn it."></canvas>
    <div class="fallback"><!-- still image or inline SVG with alt text --></div>
  </div>
  <div class="controls" hidden><!-- real buttons, shown once the scene is ready --></div>
  <p role="status" data-status></p>
  <figcaption>A plain-language description of the object and what the visitor can see from each angle.</figcaption>
</figure>
```

- The canvas has `aria-label` (what it shows, and how to use it). The caption and the facts on the page carry the real information.
- If the canvas is only decoration, give it `aria-hidden="true"` and make sure nothing important lives only inside it.
- Reserve the size in CSS (`aspect-ratio`, a maximum height) so the page does not jump.
- The status line (`role="status"`) announces failures and mode changes ("The interactive view is not available, so here is a drawing") to screen readers without moving focus.

## Controls

- Every action is a real `<button type="button">`: turn left, turn right, pause or start rotation, reset, load the 3D view, switch finish or colour.
- Minimum size 44 by 44 CSS pixels to aim for, never under 24 by 24 (WCAG 2.2 level AA, SC 2.5.8). Visible focus ring with 3:1 contrast against its surroundings.
- The label says what will happen ("Pause rotation"), and changes with the state. Do not also add `aria-pressed` for the same state, because it announces twice.
- Hide the controls until the scene is ready. Without the scene they do nothing.
- Keep the controls in the HTML order next to the viewer, so the focus order matches the visual order.

## Pointer and touch

- Use pointer events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) and `setPointerCapture`, so mouse, pen and touch share one code path.
- Set `touch-action: pan-y` on the canvas. A vertical swipe then scrolls the page, and a sideways drag rotates the object. Use `touch-action: none` only on a full-screen viewer that has a clear way out.
- Never call `preventDefault()` on `wheel` or `touchmove` to stop the page scrolling. If the scene must use the wheel for zoom, require a click or focus on the canvas first, and say so in the caption.
- Do not add a scroll listener that moves the camera unless there is a reduced-motion version that does not.
- Avoid hover-only cues. A touch screen has no hover.

## Keyboard

- The buttons are the keyboard path. A focusable canvas is optional. If you make the canvas focusable (`tabindex="0"`), handle the arrow keys, show a focus ring, and give it a role and name that match what it does. Do not create a keyboard trap: `Tab` must leave it.
- Test with `Tab`, `Shift+Tab`, `Enter` and `Space` only, with the mouse unplugged.

## Motion comfort

- With `prefers-reduced-motion: reduce`, start still. Nothing rotates, drifts, bobs or sweeps by itself. The buttons still work and move the object a fixed step at a time.
- If anything moves by itself without the setting, give a pause control and keep the speed low (a full turn in 10 to 20 seconds is calmer than a spin).
- Avoid flashing and strobing, large fast camera moves, and parallax tied to scroll.
- Never autoplay sound.

## Text and contrast

- All text is HTML, never drawn into the canvas. HTML text can be read, resized, translated and selected.
- Text and buttons around the scene meet 4.5:1 contrast (3:1 for large text and for control borders).
- Labels over a canvas need a solid or semi-opaque background so they stay readable on every frame.

## Fallback content

- The fallback image or drawing has real `alt` text, and the same facts appear as text.
- The fallback works with no JavaScript (a `<noscript>` note, or the fallback visible by default and hidden by the script when the scene is ready).
- Keep the fallback visible while the scene loads, then swap, so there is no empty frame.

## Quick self-test

1. Reload with JavaScript disabled. Does the page still make sense?
2. Tab through the page. Can you do everything the scene offers, with a visible focus ring?
3. Turn on reduced motion. Does anything still move on its own?
4. On a phone (or phone emulation), can you scroll past the scene with one finger?
5. Read the page aloud as a screen reader would: is the information in the text, not only in the picture?
