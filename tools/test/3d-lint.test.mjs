// Tests for skills/vyson-3d-interactive-web/scripts/3d-lint.mjs
// Each test gives the checker a tiny set of files with exactly the problem it wants to check.
// 3d-lint is a static checker, so these tests only check what it reads in text.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-3d-interactive-web', 'scripts', '3d-lint.mjs');
const { RULES, lintSources, lintPaths } = await import(pathToFileURL(SCRIPT).href);

const temps = [];
after(() => temps.forEach(removeDir));

const codes = (result) => result.issues.map((i) => i.code);
const check = (text, file = 'scene.js', assets = []) => codes(lintSources([{ file, text }], assets));

/** A small scene with every safety the checker looks for. */
const GOOD_SCENE = `
const gl = canvas.getContext('webgl');
if (!gl) { showFallback(); }
const ratio = Math.min(window.devicePixelRatio, 2);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let frame = 0;
function draw() { frame = requestAnimationFrame(draw); }
function stop() { cancelAnimationFrame(frame); }
new IntersectionObserver(() => {}).observe(canvas);
canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());
canvas.addEventListener('pointerdown', () => {});
const buffer = gl.createBuffer();
function destroy() { gl.deleteBuffer(buffer); }
`;
const GOOD_CSS = 'canvas { touch-action: pan-y; }\n';
const GOOD_HTML = '<!doctype html><html lang="en"><body><div class="fallback"><p>Text</p></div><canvas aria-label="A turning object"></canvas></body></html>';

describe('3d-lint: a clean scene', () => {
  it('has no issues, and knows it is a 3D page', () => {
    const result = lintSources([
      { file: 'scene.js', text: GOOD_SCENE },
      { file: 'style.css', text: GOOD_CSS },
      { file: 'index.html', text: GOOD_HTML },
    ]);
    assert.deepEqual(result.issues, []);
    assert.equal(result.uses3d, true);
  });

  it('a page with no 3D code gets no 3D warnings', () => {
    const result = lintSources([{ file: 'index.html', text: '<!doctype html><html lang="en"><body><h1>Hi</h1></body></html>' }]);
    assert.equal(result.uses3d, false);
    assert.deepEqual(result.issues, []);
  });
});

describe('3d-lint: one test for every rule', () => {
  it('TD001 a loop that nothing cancels', () => {
    assert.ok(check('function f(){ requestAnimationFrame(f); }').includes('TD001'));
  });

  it('TD002 no reduced-motion handling', () => {
    assert.ok(check("const gl = canvas.getContext('webgl'); function f(){ requestAnimationFrame(f); }").includes('TD002'));
  });

  it('TD003 a pixel ratio with no limit', () => {
    assert.ok(check('renderer.setPixelRatio(window.devicePixelRatio);').includes('TD003'));
    assert.ok(!check('renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));').includes('TD003'));
  });

  it('TD004 a canvas with no name, and TD008 no fallback', () => {
    const found = codes(lintSources([{ file: 'index.html', text: '<canvas></canvas>' }]));
    assert.ok(found.includes('TD004'));
    assert.ok(found.includes('TD008'));
  });

  it('TD004 is satisfied by aria-label, aria-labelledby or aria-hidden', () => {
    for (const tag of ['<canvas aria-label="A scene"></canvas>', '<canvas aria-labelledby="t"></canvas>', '<canvas aria-hidden="true"></canvas>']) {
      assert.ok(!codes(lintSources([{ file: 'index.html', text: `<div class="fallback">x</div>${tag}` }])).includes('TD004'), tag);
    }
  });

  it('TD005 and TD006 for WebGL with no check and no context-loss handler', () => {
    const found = check("const gl = canvas.getContext('webgl'); gl.clear(0);");
    assert.ok(found.includes('TD005'));
    assert.ok(found.includes('TD006'));
  });

  it('TD007 a loop with nothing that pauses it', () => {
    assert.ok(check("const gl = canvas.getContext('webgl'); function f(){ requestAnimationFrame(f); } cancelAnimationFrame(0);").includes('TD007'));
  });

  it('TD009 a script from another website, in HTML and in code', () => {
    assert.ok(codes(lintSources([{ file: 'index.html', text: '<script src="https://cdn.example.com/three.js"></script>' }])).includes('TD009'));
    assert.ok(check("import * as THREE from 'https://cdn.example.com/three.module.js';").includes('TD009'));
    assert.ok(!codes(lintSources([{ file: 'index.html', text: '<link rel="canonical" href="https://example.com/">' }])).includes('TD009'));
  });

  it('TD010 GPU objects that are never freed', () => {
    assert.ok(check("const gl = canvas.getContext('webgl'); const b = gl.createBuffer();").includes('TD010'));
  });

  it('TD011 a non-passive wheel listener', () => {
    assert.ok(check("el.addEventListener('wheel', onWheel, { passive: false });").includes('TD011'));
    assert.ok(!check("el.addEventListener('wheel', onWheel, { passive: true });").includes('TD011'));
  });

  it('TD012 pointer controls with no touch-action', () => {
    assert.ok(check("canvas.addEventListener('pointerdown', start);").includes('TD012'));
    const result = lintSources([{ file: 'a.js', text: "canvas.addEventListener('pointerdown', start);" }, { file: 'a.css', text: 'canvas { touch-action: pan-y; }' }]);
    assert.ok(!codes(result).includes('TD012'));
  });

  it('TD013 a large model, and TD014 a large total', () => {
    assert.ok(check('', 'a.js', [{ file: 'chair.glb', size: 4_000_000 }]).includes('TD013'));
    assert.ok(!check('', 'a.js', [{ file: 'chair.glb', size: 2_000_000 }]).includes('TD013'));
    const many = [1, 2, 3].map((n) => ({ file: `m${n}.glb`, size: 2_000_000 }));
    const found = check('', 'a.js', many);
    assert.ok(found.includes('TD014'));
    assert.ok(!found.includes('TD013'));
  });

  it('every rule in the catalogue has a test above', () => {
    assert.equal(Object.keys(RULES).length, 14);
    for (const code of Object.keys(RULES)) assert.ok(RULES[code].fix.length > 20, code);
  });
});

describe('3d-lint: it reads code, not comments', () => {
  it('a rule word inside a comment does not count', () => {
    assert.ok(!check('// requestAnimationFrame(loop) goes here later\nconst x = 1;').includes('TD001'));
    assert.ok(!check('/* devicePixelRatio is used below */\nconst x = 1;').includes('TD003'));
  });

  it('a cancel call inside a comment does not hide a missing cancel', () => {
    assert.ok(check('// cancelAnimationFrame(id)\nfunction f(){ requestAnimationFrame(f); }').includes('TD001'));
  });

  it('issues are sorted by file and line and carry a fix', () => {
    const { issues } = lintSources([{ file: 'a.js', text: 'requestAnimationFrame(f);\nwindow.devicePixelRatio;' }]);
    assert.ok(issues.length >= 2);
    for (const i of issues) assert.ok(i.fix && i.title && i.severity && i.line >= 1);
    const lines = issues.map((i) => i.line);
    assert.deepEqual(lines, [...lines].sort((a, b) => a - b));
  });
});

describe('3d-lint: folders and the command line', () => {
  function site(files) {
    const root = makeTempDir('vyson-3d-');
    temps.push(root);
    writeFiles(root, files);
    return root;
  }
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('lintPaths reads a folder and ignores node_modules', () => {
    const root = site({ 'index.html': GOOD_HTML, 'scene.js': GOOD_SCENE, 'style.css': GOOD_CSS, 'node_modules/x/bad.js': 'requestAnimationFrame(f);' });
    const result = lintPaths([root]);
    assert.deepEqual(result.issues, []);
    assert.equal(result.files.length, 3);
  });

  it('lintPaths counts model files by their size on disk', () => {
    const root = site({ 'scene.js': GOOD_SCENE, 'big.glb': 'x'.repeat(10) });
    assert.equal(lintPaths([root]).assets, 1);
  });

  it('exits 0 for a clean folder and 1 when there are errors', () => {
    const clean = site({ 'index.html': GOOD_HTML, 'scene.js': GOOD_SCENE, 'style.css': GOOD_CSS });
    assert.equal(run(clean).status, 0);
    const bad = site({ 'scene.js': 'function f(){ requestAnimationFrame(f); }' });
    assert.equal(run(bad).status, 1);
  });

  it('--strict turns warnings into a failure, and --json prints data', () => {
    const warn = site({ 'index.html': GOOD_HTML, 'scene.js': GOOD_SCENE.replace('Math.min(window.devicePixelRatio, 2)', 'window.devicePixelRatio'), 'style.css': GOOD_CSS });
    assert.equal(run(warn).status, 0);
    const strict = run(warn, '--strict', '--json');
    assert.equal(strict.status, 1);
    const data = JSON.parse(strict.stdout);
    assert.ok(data.issues.some((i) => i.code === 'TD003'));
  });

  it('exits 2 for wrong use', () => {
    assert.equal(run().status, 2);
    assert.equal(run('--nonsense').status, 2);
    assert.equal(run('--help').status, 0);
  });

  it('says it is a static check in its output', () => {
    const clean = site({ 'index.html': GOOD_HTML, 'scene.js': GOOD_SCENE, 'style.css': GOOD_CSS });
    assert.match(run(clean).stdout, /static/i);
  });
});

describe('3d-lint: the checker itself', () => {
  const script = fs.readFileSync(SCRIPT, 'utf8');

  it('says it is a static checker and uses no network', () => {
    assert.match(script, /IT IS A STATIC CHECKER/);
    assert.doesNotMatch(script, /node:(http|https|net|dgram|child_process)|fetch\(|XMLHttpRequest/);
  });

  it('imports only Node built-ins', () => {
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, spec);
  });
});
