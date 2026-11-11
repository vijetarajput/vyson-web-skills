// canvas-stage.js: a small helper that runs a <canvas> render loop politely.
//
// It works with raw WebGL, Three.js or a 2D canvas, because it only manages the
// loop and the canvas size. It does not draw anything itself. It has no
// dependencies. Copy it into your project and import it as an ES module:
//
//   import { createStage, getWebGLContext, pickQuality } from './canvas-stage.js';
//
// What it does for you:
//   * Draws only while the canvas is on screen, the tab is visible and the
//     context is alive. Otherwise the loop is stopped (no wasted battery).
//   * Respects prefers-reduced-motion: no automatic animation. The page can
//     still draw single frames on request (for example after a button press).
//   * Keeps the drawing buffer at a sensible size (pixel ratio and total pixel
//     caps), because the buffer size is the biggest cost on phones.
//   * Handles WebGL context loss and restore.
//   * Cleans up every listener in destroy().
//
// It makes no promise about frame rate. Measure on the devices you care about.

/** Limit the pixel ratio. A phone may report 3 or more; drawing at 3x is rarely worth it. */
export function clampPixelRatio(devicePixelRatio, maxPixelRatio = 2) {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, Math.max(1, maxPixelRatio));
}

/**
 * Work out the size of the drawing buffer for a canvas shown at cssWidth x cssHeight.
 * The pixel ratio is clamped first, then lowered further if the total number of
 * pixels would pass maxPixels (the default is about 1920 x 1080).
 */
export function computeBufferSize(cssWidth, cssHeight, devicePixelRatio, { maxPixelRatio = 2, maxPixels = 2073600 } = {}) {
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  let pixelRatio = clampPixelRatio(devicePixelRatio, maxPixelRatio);
  const total = w * h * pixelRatio * pixelRatio;
  if (total > maxPixels) pixelRatio = Math.max(0.5, Math.sqrt(maxPixels / (w * h)));
  return { width: Math.max(1, Math.round(w * pixelRatio)), height: Math.max(1, Math.round(h * pixelRatio)), pixelRatio };
}

/**
 * Choose a quality level from what the browser says about the visitor.
 * This is the "mobile fallback" decision in one place. The values are VYSON
 * defaults, not measured results. Adjust them after measuring your own scene.
 *
 * Levels:
 *   "poster": do not start the 3D scene; show the still image and a button to load it.
 *   "low":    touch or small screens, or low memory: lower pixel ratio, simpler scene.
 *   "high":   everything else.
 */
export function pickQuality({ saveData = false, coarsePointer = false, narrowScreen = false, deviceMemory } = {}) {
  if (saveData) return { level: 'poster', maxPixelRatio: 1, maxPixels: 0, detail: 0 };
  if (coarsePointer || narrowScreen || (typeof deviceMemory === 'number' && deviceMemory <= 4)) {
    return { level: 'low', maxPixelRatio: 1.5, maxPixels: 1000000, detail: 1 };
  }
  return { level: 'high', maxPixelRatio: 2, maxPixels: 2073600, detail: 2 };
}

/** Read the choice inputs from the browser. Only call this in a browser. */
export function readEnvironment(win = window) {
  const nav = win.navigator || {};
  const media = (query) => (typeof win.matchMedia === 'function' ? win.matchMedia(query).matches : false);
  return {
    saveData: Boolean(nav.connection && nav.connection.saveData),
    coarsePointer: media('(pointer: coarse)'),
    narrowScreen: media('(max-width: 40rem)'),
    deviceMemory: nav.deviceMemory,
  };
}

/**
 * Get a WebGL context, or null when WebGL is not available.
 * Always check the result and show your fallback when it is null.
 */
export function getWebGLContext(canvas, attributes = {}) {
  try {
    return canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes) || null;
  } catch {
    return null;
  }
}

/**
 * Create a stage around a canvas.
 *
 * options:
 *   canvas            the <canvas> element (give it a size with CSS, not with width/height attributes)
 *   render(frame)     called to draw. frame = { time, delta, width, height, pixelRatio } (time and delta in seconds)
 *   onResize(size)    optional. Called when the drawing buffer changes. size = { width, height, pixelRatio }
 *   onContextLost()   optional. Show your fallback here.
 *   onContextRestored() optional. Rebuild your GPU resources here (they are gone after a loss).
 *   animate           true to loop while visible, false to draw only on request. Default true.
 *   respectReducedMotion  default true: start with animate = false when the visitor asks for less motion.
 *   maxPixelRatio, maxPixels  buffer caps (see computeBufferSize)
 *
 * Returns { setAnimated(bool), isAnimated(), requestRender(), destroy() }.
 */
export function createStage(options) {
  const {
    canvas,
    render,
    onResize,
    onContextLost,
    onContextRestored,
    animate = true,
    respectReducedMotion = true,
    maxPixelRatio = 2,
    maxPixels = 2073600,
  } = options;
  if (!canvas || typeof render !== 'function') throw new Error('createStage needs a canvas and a render function.');

  const reducedQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let wantAnimate = animate && !(respectReducedMotion && reducedQuery && reducedQuery.matches);
  let onScreen = true;
  let tabVisible = document.visibilityState !== 'hidden';
  let contextLost = false;
  let destroyed = false;
  let loopId = 0;
  let singleId = 0;
  let last = 0;
  let size = { width: 0, height: 0, pixelRatio: 1 };

  function resize() {
    const next = computeBufferSize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio, { maxPixelRatio, maxPixels });
    if (next.width === size.width && next.height === size.height) return false;
    size = next;
    canvas.width = next.width;
    canvas.height = next.height;
    if (onResize) onResize({ ...next });
    return true;
  }

  function draw(now) {
    const time = now / 1000;
    const delta = last ? Math.min(0.1, time - last) : 0; // never jump after the tab slept
    last = time;
    resize();
    render({ time, delta, width: size.width, height: size.height, pixelRatio: size.pixelRatio });
  }

  function shouldLoop() {
    return wantAnimate && onScreen && tabVisible && !contextLost && !destroyed;
  }

  function loop(now) {
    loopId = 0;
    if (!shouldLoop()) return;
    draw(now);
    loopId = requestAnimationFrame(loop);
  }

  function update() {
    if (shouldLoop() && !loopId) {
      last = 0;
      loopId = requestAnimationFrame(loop);
    } else if (!shouldLoop() && loopId) {
      cancelAnimationFrame(loopId);
      loopId = 0;
    }
  }

  function requestRender() {
    if (destroyed || contextLost || singleId || loopId) return;
    singleId = requestAnimationFrame((now) => {
      singleId = 0;
      if (!destroyed && !contextLost) draw(now);
    });
  }

  const listeners = [];
  const on = (target, type, handler, opts) => {
    target.addEventListener(type, handler, opts);
    listeners.push(() => target.removeEventListener(type, handler, opts));
  };

  on(document, 'visibilitychange', () => {
    tabVisible = document.visibilityState !== 'hidden';
    update();
    if (tabVisible) requestRender();
  });
  if (reducedQuery) {
    on(reducedQuery, 'change', () => {
      if (respectReducedMotion) {
        wantAnimate = animate && !reducedQuery.matches;
        update();
        requestRender();
      }
    });
  }
  on(canvas, 'webglcontextlost', (event) => {
    event.preventDefault(); // allows the browser to restore the context later
    contextLost = true;
    update();
    if (onContextLost) onContextLost();
  });
  on(canvas, 'webglcontextrestored', () => {
    contextLost = false;
    size = { width: 0, height: 0, pixelRatio: 1 };
    if (onContextRestored) onContextRestored();
    update();
    requestRender();
  });

  let resizeObserver = null;
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(() => {
      if (resize()) requestRender();
    });
    resizeObserver.observe(canvas);
  }
  let intersectionObserver = null;
  if (typeof IntersectionObserver === 'function') {
    intersectionObserver = new IntersectionObserver((entries) => {
      onScreen = entries[entries.length - 1].isIntersecting;
      update();
      if (onScreen) requestRender();
    });
    intersectionObserver.observe(canvas);
  }

  resize();
  update();
  requestRender();

  return {
    setAnimated(value) {
      wantAnimate = Boolean(value);
      update();
      requestRender();
    },
    isAnimated() {
      return wantAnimate;
    },
    requestRender,
    destroy() {
      destroyed = true;
      if (loopId) cancelAnimationFrame(loopId);
      if (singleId) cancelAnimationFrame(singleId);
      loopId = 0;
      singleId = 0;
      listeners.forEach((remove) => remove());
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();
    },
  };
}
