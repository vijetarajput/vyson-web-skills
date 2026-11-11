// scene.js: draws a faceted glass paperweight with plain WebGL (no libraries).
//
// The page works without this file: the HTML already holds a drawing, the text
// and the facts. This script only upgrades the page when WebGL is available.
// canvas-stage.js (the skill's starter) runs the loop, the resizing, the pause
// off screen and the reduced-motion rule. This file only builds and draws.

import { createStage, getWebGLContext, pickQuality, readEnvironment } from './canvas-stage.js';

const viewer = document.querySelector('[data-viewer]');
const canvas = viewer.querySelector('canvas');
const statusLine = document.querySelector('[data-status]');
const controls = document.querySelector('[data-controls]');
const toggleButton = document.querySelector('[data-action="toggle"]');
const loadButton = document.querySelector('[data-load]');

const TURN_STEP = Math.PI / 6; // one button press turns the object by 30 degrees
const SPIN_SPEED = 0.45; // radians per second while rotation is on
const PITCH = 0.35; // a fixed tilt so the top facets catch the light

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat3 uRotation;
uniform mat4 uProjection;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 p = uRotation * aPosition;
  vNormal = uRotation * aNormal;
  vPosition = p;
  gl_Position = uProjection * vec4(p.xy, p.z - 5.8, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 n = normalize(vNormal);
  vec3 toEye = normalize(vec3(0.0, 0.0, 5.8) - vPosition);
  vec3 keyLight = normalize(vec3(-0.5, 0.8, 0.7));
  vec3 fillLight = normalize(vec3(0.8, -0.2, 0.5));
  float key = max(dot(n, keyLight), 0.0);
  float fill = max(dot(n, fillLight), 0.0);
  float spec = pow(max(dot(n, normalize(keyLight + toEye)), 0.0), 40.0);
  float rim = pow(1.0 - max(dot(n, toEye), 0.0), 2.5);
  vec3 base = vec3(0.10, 0.36, 0.40);
  vec3 colour = base * (0.35 + 0.85 * key + 0.35 * fill) + vec3(0.55, 0.9, 0.85) * rim * 0.55 + vec3(1.0) * spec * 0.9;
  gl_FragColor = vec4(colour, 1.0);
}`;

// Geometry: an icosahedron, optionally split once into smaller triangles and pushed onto a sphere.
function buildMesh(detail) {
  const t = (1 + Math.sqrt(5)) / 2;
  const points = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => normalize(p));
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  if (detail >= 2) {
    const next = [];
    const cache = new Map();
    const middle = (a, b) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!cache.has(key)) {
        points.push(normalize(points[a].map((v, i) => (v + points[b][i]) / 2)));
        cache.set(key, points.length - 1);
      }
      return cache.get(key);
    };
    for (const [a, b, c] of faces) {
      const ab = middle(a, b);
      const bc = middle(b, c);
      const ca = middle(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  const stretch = [1, 1.18, 1]; // a slightly tall shape reads as a paperweight, not a ball
  const data = [];
  for (const [a, b, c] of faces) {
    let [p, q, r] = [a, b, c].map((i) => points[i].map((v, k) => v * stretch[k] * 1.25));
    let n = normalize(cross(sub(q, p), sub(r, p)));
    const centre = [p[0] + q[0] + r[0], p[1] + q[1] + r[1], p[2] + q[2] + r[2]];
    if (n[0] * centre[0] + n[1] * centre[1] + n[2] * centre[2] < 0) {
      // Make every triangle face outwards (counter-clockwise), so back-face culling keeps the right side.
      [q, r] = [r, q];
      n = normalize(cross(sub(q, p), sub(r, p)));
    }
    for (const v of [p, q, r]) data.push(...v, ...n);
  }
  return { vertices: new Float32Array(data), count: data.length / 6 };
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function rotationMatrix(yaw, pitch) {
  const [cy, sy, cx, sx] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  // Column-major mat3: first turn around the vertical axis (yaw), then tilt (pitch).
  return new Float32Array([
    cy, sx * sy, -cx * sy,
    0, cx, sx,
    sy, -sx * cy, cx * cy,
  ]);
}

function perspective(aspect, fovY = 0.7, near = 0.1, far = 20) {
  const f = 1 / Math.tan(fovY / 2);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader did not compile');
  return shader;
}

function setState(state, message = '') {
  viewer.dataset.state = state;
  statusLine.textContent = message;
  controls.hidden = state !== 'ready';
}

let stage = null;
let gpu = null;
let yaw = 0.6;

function build(gl, quality) {
  const program = gl.createProgram();
  const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Program did not link');
  const mesh = buildMesh(quality.detail);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  const normal = gl.getAttribLocation(program, 'aNormal');
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(normal);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);
  return {
    gl,
    program,
    buffer,
    count: mesh.count,
    uniforms: { rotation: gl.getUniformLocation(program, 'uRotation'), projection: gl.getUniformLocation(program, 'uProjection') },
    shaders: [vertexShader, fragmentShader],
  };
}

function free(resources) {
  if (!resources) return;
  const { gl } = resources;
  gl.deleteBuffer(resources.buffer);
  resources.shaders.forEach((shader) => gl.deleteShader(shader));
  gl.deleteProgram(resources.program);
}

function draw({ delta, width, height }) {
  if (!gpu) return;
  const { gl } = gpu;
  if (stage.isAnimated()) yaw += delta * SPIN_SPEED;
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(gpu.program);
  gl.uniformMatrix3fv(gpu.uniforms.rotation, false, rotationMatrix(yaw, PITCH));
  gl.uniformMatrix4fv(gpu.uniforms.projection, false, perspective(width / height));
  gl.drawArrays(gl.TRIANGLES, 0, gpu.count);
}

function start() {
  const quality = pickQuality(readEnvironment());
  if (quality.level === 'poster') {
    setState('poster', 'Interactive view not loaded, to save data.');
    loadButton.hidden = false;
    loadButton.addEventListener('click', () => {
      loadButton.hidden = true;
      begin(pickQuality({ ...readEnvironment(), saveData: false }));
    }, { once: true });
    return;
  }
  begin(quality);
}

function begin(quality) {
  const gl = getWebGLContext(canvas, { antialias: quality.level === 'high', alpha: true });
  if (!gl) {
    setState('fallback', 'The interactive 3D view is not available in this browser, so here is a drawing instead.');
    return;
  }
  try {
    gpu = build(gl, quality);
  } catch (error) {
    gpu = null;
    setState('fallback', 'The interactive 3D view could not start, so here is a drawing instead.');
    console.warn(error);
    return;
  }

  stage = createStage({
    canvas,
    render: draw,
    maxPixelRatio: quality.maxPixelRatio,
    maxPixels: quality.maxPixels,
    onContextLost() {
      gpu = null;
      setState('fallback', 'The 3D view paused because the graphics driver reset. It will return if the browser can restore it.');
    },
    onContextRestored() {
      try {
        gpu = build(gl, quality);
        setState('ready', '');
      } catch {
        setState('fallback', 'The 3D view could not be restored, so here is a drawing instead.');
      }
    },
  });

  const syncToggle = () => {
    toggleButton.textContent = stage.isAnimated() ? 'Pause rotation' : 'Start rotation';
  };
  controls.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'left') yaw -= TURN_STEP;
    if (action === 'right') yaw += TURN_STEP;
    if (action === 'reset') yaw = 0.6;
    if (action === 'toggle') stage.setAnimated(!stage.isAnimated());
    syncToggle();
    stage.requestRender();
  });

  // Dragging turns the object. touch-action: pan-y in the CSS keeps vertical swipes scrolling the page.
  let dragX = null;
  canvas.addEventListener('pointerdown', (event) => {
    dragX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragX === null) return;
    yaw += (event.clientX - dragX) * 0.01;
    dragX = event.clientX;
    stage.requestRender();
  });
  const endDrag = () => { dragX = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  window.addEventListener('pagehide', () => {
    stage.destroy();
    free(gpu);
    gpu = null;
  }, { once: true });

  syncToggle();
  setState('ready', '');
}

start();
