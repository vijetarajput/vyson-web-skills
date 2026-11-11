# Three.js patterns

Use this only when the approach table says Three.js (models, materials, lighting). Three.js is MIT licensed (read on 10 November 2026). Its API changes between versions, so install an exact version, and read that version's documentation instead of relying on memory. Do not copy library files into the project by hand, and do not load it from a CDN at run time.

## Setup

- Install with the project's package manager at an exact version (no `^` or `~` range) if the user agreed to the dependency. Record the version in your report.
- Import only what you use (`import { WebGLRenderer, Scene, PerspectiveCamera } from 'three'`), so the bundler can drop the rest.
- Loaders (for example the glTF loader) come from the Three.js examples folder of the same version. Import them from the same package at the same version.
- Models, textures and decoder files live in the project (for example `public/models/`), not on another website.

## A safe skeleton

This shows the shape. Check the exact names against the pinned version.

```js
import { WebGLRenderer, Scene, PerspectiveCamera } from 'three';
import { createStage, pickQuality, readEnvironment } from './canvas-stage.js';

const canvas = document.querySelector('canvas');
const quality = pickQuality(readEnvironment());
if (quality.level === 'poster') { /* show the still image and a "Load the 3D view" button */ }

let renderer;
try {
  renderer = new WebGLRenderer({ canvas, antialias: quality.level === 'high', alpha: true });
} catch {
  /* WebGL is not available: show the fallback and stop */
}

const scene = new Scene();
const camera = new PerspectiveCamera(35, 1, 0.1, 50);
camera.position.set(0, 0, 6);
// Add your own lights and meshes here.

const stage = createStage({
  canvas,
  maxPixelRatio: quality.maxPixelRatio,
  maxPixels: quality.maxPixels,
  onResize({ width, height, pixelRatio }) {
    renderer.setPixelRatio(1);           // the stage already sized the buffer
    renderer.setSize(width, height, false); // false: leave the CSS size alone
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  },
  render({ delta }) {
    // Update your objects with delta here, then draw.
    renderer.render(scene, camera);
  },
  onContextLost() { /* show the fallback */ },
  onContextRestored() { /* rebuild textures and materials that need it */ },
});
```

Why the stage owns the loop: it already stops drawing off screen and in hidden tabs, honours reduced motion, and caps the buffer. If you use `renderer.setAnimationLoop(fn)` instead, you must add the same behaviour yourself, and call `renderer.setAnimationLoop(null)` to stop it.

## Lights and materials

- Start with two or three lights (a key light, a fill and a soft ambient or hemisphere light). Each extra light costs on every pixel.
- Shadows, reflections, transmission (real glass) and post-processing are expensive. Add them only if the job needs them, and drop them in the `low` quality level.
- Reuse materials and geometries between meshes. Fewer materials means fewer draw calls.
- Use the lightest material that looks right. A standard material is plenty for most product views.

## Loading a model

- Load after the first paint, once the canvas is near the viewport.
- Show the fallback until the model is ready. On error, keep the fallback and show a short message.
- After loading, check the triangle count and file size against the budget. If it is over, reduce the model before shipping.
- Center and scale the model in code or in the model file so the camera framing is predictable.
- A model may carry its own lights, cameras or huge textures. Inspect what it contains.

## Tearing down

When the scene is removed, stop the loop (`stage.destroy()`), then dispose:

```js
scene.traverse((object) => {
  if (object.geometry) object.geometry.dispose();
  const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value && value.isTexture) value.dispose();
    }
    material.dispose();
  }
});
renderer.dispose();
```

## React Three Fiber

Use it only if the project is already React and the scene is part of the component tree. It is MIT licensed (read on 10 November 2026). The rules of this skill apply unchanged:

- The page still needs the fallback, the text, the buttons and the reduced-motion rule.
- Set the frame loop to `demand` when nothing animates, and invalidate on interaction.
- Cap the pixel ratio with the `dpr` prop (for example `[1, 2]`, and a lower range on phones).
- Mount the canvas only when it is near the viewport, and unmount it when the component goes away.
- Check the component-level APIs against the pinned versions of `three` and `@react-three/fiber`, because they must be compatible with each other.

## Vue, React and Next.js without a wrapper library

`canvas-stage.js` and the skeleton above do not depend on a framework, so a project that uses Vue, React or Next.js can mount them directly instead of adding another library. Keep the scene code in its own module and let the component only own the lifecycle:

- **Vue:** create the stage in `onMounted` (the canvas exists by then) and call `stage.destroy()` and the disposal code in `onBeforeUnmount`.
- **React:** create it in a `useEffect` and return a cleanup that destroys and disposes. In Strict Mode the effect runs twice in development, so the cleanup must leave nothing behind.
- **Next.js:** the component that touches `canvas` or `window` must be a client component. Keep the fallback and the text in the server-rendered markup, so the page still reads without the 3D view.

This is guidance, not a tested integration: the bundled stage was run in plain HTML only.

## Things not to do

- Do not load Three.js, models or textures from a CDN or any other website.
- Do not run two renderers on one page.
- Do not call `new` inside the render function.
- Do not leave `preserveDrawingBuffer: true` on without a reason (it costs memory and speed).
- Do not enable orbit controls that capture the mouse wheel over a page that scrolls.
