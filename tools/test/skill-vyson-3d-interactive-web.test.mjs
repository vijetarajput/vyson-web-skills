// Tests for the skill vyson-3d-interactive-web.
// They check that the skill passes our own validator and checker, and that its
// pieces (documentation, starter file, example, evals) agree with each other.
// They read text and run small pure functions. They are static tests, not browser tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir } from './helpers.mjs';
import { validateSkill } from '../lib/validate-skill.mjs';
import { listMarkdownFiles, readText } from '../lib/fs-utils.mjs';

const NAME = 'vyson-3d-interactive-web';
const SKILL_DIR = path.join(REPO_ROOT, 'skills', NAME);
const EXAMPLE_DIR = path.join(REPO_ROOT, 'examples', NAME);
const LINT = path.join(SKILL_DIR, 'scripts', '3d-lint.mjs');
const SERVE = path.join(SKILL_DIR, 'scripts', 'serve.mjs');
const STAGE = path.join(SKILL_DIR, 'assets', 'canvas-stage.js');
const { RULES } = await import(pathToFileURL(LINT).href);
const { clampPixelRatio, computeBufferSize, pickQuality } = await import(pathToFileURL(STAGE).href);
const { resolveRequest, createServer, MIME } = await import(pathToFileURL(SERVE).href);

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

function lintCli(target) {
  const r = spawnSync(process.execPath, [LINT, target, '--strict', '--json'], { encoding: 'utf8' });
  return { status: r.status, data: JSON.parse(r.stdout) };
}

describe(`${NAME}: validator`, () => {
  it('passes the VYSON project profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'project', repoRoot: REPO_ROOT }).issues, []);
  });

  it('passes the specification-only profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'spec', repoRoot: REPO_ROOT }).issues, []);
  });

  it('declares the 3d pillar', () => {
    assert.match(read(SKILL_DIR, 'SKILL.md'), /vyson-pillar: "3d"/);
  });
});

describe(`${NAME}: the skill and its neighbours have clear boundaries`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const description = /^description: (.*)$/m.exec(skillMd)[1];

  it('the description says when to use it and points CSS animation to vyson-css-motion', () => {
    assert.match(description, /Use when/);
    assert.match(description, /vyson-css-motion/);
    assert.ok(description.length <= 1024);
  });

  it('"When not to use" names the other four skills', () => {
    const notUse = skillMd.slice(skillMd.indexOf('## When not to use'), skillMd.indexOf('## The 3D contract'));
    for (const other of ['vyson-css-motion', 'vyson-premium-website-design', 'vyson-frontend-development', 'vyson-website-quality-engineering']) {
      assert.ok(notUse.includes(other), other);
    }
  });

  it('does not link into another skill (a skill is installed on its own)', () => {
    for (const file of listMarkdownFiles(SKILL_DIR)) {
      assert.doesNotMatch(readText(file), /\]\([^)]*(?:vyson-css-motion|vyson-premium|vyson-frontend|vyson-website)/, file);
    }
  });

  it('no skill document tells the agent to fetch instructions from the internet', () => {
    const everything = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    assert.doesNotMatch(everything, /\b(curl|wget|Invoke-WebRequest)\b/);
  });
});

describe(`${NAME}: the 3D contract is written down`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');

  it('SKILL.md states the five parts of the contract', () => {
    for (const part of ['It earns its place', 'The page works without it', 'It stays light', 'It respects the visitor', 'It fails safely']) {
      assert.ok(skillMd.includes(part), part);
    }
  });

  it('carries the performance, reduced-motion and mobile promises', () => {
    assert.match(skillMd, /prefers-reduced-motion/);
    assert.match(skillMd, /[Pp]hones and "save data" get a lighter version/);
    assert.match(skillMd, /capped pixel ratio/);
    assert.match(skillMd, /VYSON defaults, not measured results/);
  });

  it('keeps static checks and browser tests apart, and forbids unmeasured claims', () => {
    assert.match(skillMd, /\*\*This is a static check\.\*\*/);
    assert.match(skillMd, /browser test: not performed/);
    assert.match(skillMd, /Never claim a frame rate/);
  });

  it('the tap-target rule matches the project decision (44 aim, 24 floor, WCAG 2.2 SC 2.5.8)', () => {
    assert.match(skillMd, /44 by 44 CSS pixels/);
    assert.match(skillMd, /24 by 24/);
    assert.match(skillMd, /2\.5\.8/);
  });

  it('every reference file is linked from SKILL.md, and no reference links to another file', () => {
    const refs = fs.readdirSync(path.join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'));
    assert.equal(refs.length, 6);
    for (const ref of refs) {
      assert.ok(skillMd.includes(`(references/${ref})`), `${ref} is not linked from SKILL.md`);
      assert.doesNotMatch(read(SKILL_DIR, 'references', ref), /\]\([^)]*\.md/, `${ref} links to another file`);
    }
  });
});

describe(`${NAME}: checker documentation matches the checker`, () => {
  const allDocs = () => fs.readdirSync(path.join(SKILL_DIR, 'references')).map((f) => read(SKILL_DIR, 'references', f)).join('\n');

  it('every rule code is in a reference table with the same severity', () => {
    const lines = allDocs().split(/\r?\n/);
    for (const [code, rule] of Object.entries(RULES)) {
      const row = lines.find((l) => l.startsWith(`| ${code} |`));
      assert.ok(row, `${code} is missing from the references`);
      assert.match(row, new RegExp(`\\| ${rule.severity} \\|$`), `${code} should be marked "${rule.severity}"`);
    }
  });

  it('every rule code mentioned anywhere in the skill documentation exists', () => {
    const files = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const mentioned = new Set(files.match(/\bTD\d{3}\b/g) ?? []);
    assert.ok(mentioned.size > 0);
    for (const code of mentioned) assert.ok(RULES[code], `${code} is mentioned but does not exist`);
  });

  it('SKILL.md states the right number of rules', () => {
    const count = Object.keys(RULES).length;
    assert.match(read(SKILL_DIR, 'SKILL.md'), new RegExp(`${count} rules, TD001 to TD${String(count).padStart(3, '0')}`));
  });

  it('the performance reference separates what a browser and a device can tell you', () => {
    const perf = read(SKILL_DIR, 'references', 'performance-and-fallbacks.md');
    assert.match(perf, /What only a browser and a device can tell you/);
    assert.match(perf, /A real phone/);
    assert.match(perf, /not performed/);
  });
});

describe(`${NAME}: the starter stage file`, () => {
  it('clampPixelRatio limits the ratio, and falls back to 1 for nonsense', () => {
    assert.equal(clampPixelRatio(3), 2);
    assert.equal(clampPixelRatio(1.5), 1.5);
    assert.equal(clampPixelRatio(3, 1.5), 1.5);
    assert.equal(clampPixelRatio(0), 1);
    assert.equal(clampPixelRatio(NaN), 1);
    assert.equal(clampPixelRatio(undefined), 1);
    assert.equal(clampPixelRatio(3, 0.2), 1);
  });

  it('computeBufferSize caps the pixel ratio and the total number of pixels', () => {
    assert.deepEqual(computeBufferSize(400, 300, 3), { width: 800, height: 600, pixelRatio: 2 });
    const big = computeBufferSize(1920, 1080, 2);
    assert.ok(big.width * big.height <= 2_073_600 + big.width + big.height);
    const tiny = computeBufferSize(0, 0, 2);
    assert.ok(tiny.width >= 1 && tiny.height >= 1);
    const phone = computeBufferSize(390, 300, 3, { maxPixelRatio: 1.5, maxPixels: 1_000_000 });
    assert.equal(phone.pixelRatio, 1.5);
  });

  it('pickQuality chooses poster, low or high', () => {
    assert.equal(pickQuality({ saveData: true }).level, 'poster');
    assert.equal(pickQuality({ saveData: true, coarsePointer: true }).level, 'poster');
    assert.equal(pickQuality({ coarsePointer: true }).level, 'low');
    assert.equal(pickQuality({ narrowScreen: true }).level, 'low');
    assert.equal(pickQuality({ deviceMemory: 2 }).level, 'low');
    assert.equal(pickQuality({ deviceMemory: 8 }).level, 'high');
    assert.equal(pickQuality().level, 'high');
    assert.ok(pickQuality().maxPixelRatio > pickQuality({ coarsePointer: true }).maxPixelRatio);
  });

  it('has no imports, no network and no timers that never stop', () => {
    const stage = fs.readFileSync(STAGE, 'utf8');
    assert.doesNotMatch(stage, /^import\s/m);
    assert.doesNotMatch(stage, /fetch\(|XMLHttpRequest|https?:\/\//);
    assert.match(stage, /cancelAnimationFrame/);
    assert.match(stage, /prefers-reduced-motion/);
    assert.match(stage, /webglcontextlost/);
    assert.match(stage, /IntersectionObserver/);
    assert.match(stage, /visibilitychange/);
  });
});

describe(`${NAME}: the local server`, () => {
  const temps = [];

  it('maps an address to a path inside the folder and refuses to leave it', () => {
    const root = makeTempDir('vyson-serve-');
    temps.push(root);
    fs.writeFileSync(path.join(root, 'index.html'), '<p>hi</p>');
    fs.mkdirSync(path.join(root, 'sub'));
    fs.writeFileSync(path.join(root, 'sub', 'a.js'), 'export {}');
    assert.equal(resolveRequest(root, '/'), path.resolve(root));
    assert.equal(resolveRequest(root, '/sub/a.js'), path.join(root, 'sub', 'a.js'));
    // The address parser removes ".." segments (also as %2e%2e), so these cannot climb above the top: the result stays inside the folder.
    assert.equal(resolveRequest(root, '/../package.json'), path.join(root, 'package.json'));
    assert.equal(resolveRequest(root, '/%2e%2e/package.json'), path.join(root, 'package.json'));
    assert.equal(resolveRequest(root, '/..%2f..%2fpackage.json'), null);
    temps.forEach(removeDir);
    temps.length = 0;
  });

  it('serves files from the folder, answers 404 for a missing file and 403 for an escape attempt', async () => {
    const root = makeTempDir('vyson-serve-');
    temps.push(root);
    fs.writeFileSync(path.join(root, 'index.html'), '<p>hello</p>');
    const server = createServer(root);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const get = (requestPath) => new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: requestPath }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
      }).on('error', reject);
    });
    try {
      const home = await get('/');
      assert.equal(home.status, 200);
      assert.match(home.type, /text\/html/);
      assert.match(home.body, /hello/);
      assert.equal((await get('/nothing.js')).status, 404);
      assert.equal((await get('/..%2f..%2fpackage.json')).status, 403);
    } finally {
      await new Promise((resolve) => server.close(resolve));
      temps.forEach(removeDir);
      temps.length = 0;
    }
  });
  it('knows the file types a 3D page needs', () => {
    for (const ext of ['.html', '.js', '.mjs', '.css', '.glb', '.gltf', '.wasm']) assert.ok(MIME[ext], ext);
  });

  it('listens on the local computer only', () => {
    assert.equal(typeof createServer, 'function');
    assert.match(fs.readFileSync(SERVE, 'utf8'), /127\.0\.0\.1/);
  });
});

describe(`${NAME}: own checker is satisfied by the skill's own files`, () => {
  it('the starter file has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(SKILL_DIR, 'assets'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the example site has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(EXAMPLE_DIR, 'result'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
    assert.equal(data.uses3d, true);
  });

  it('the example uses an exact copy of the starter file', () => {
    assert.equal(read(EXAMPLE_DIR, 'result', 'canvas-stage.js'), read(STAGE));
  });
});

describe(`${NAME}: the example`, () => {
  const html = read(EXAMPLE_DIR, 'result', 'index.html');
  const css = read(EXAMPLE_DIR, 'result', 'styles.css');

  it('has the files an example needs', () => {
    for (const file of ['prompt.md', 'README.md', 'CREDITS.md', 'preview.png', 'result/index.html', 'result/styles.css', 'result/scene.js', 'result/canvas-stage.js']) {
      assert.ok(fs.existsSync(path.join(EXAMPLE_DIR, file)), file);
    }
  });

  it('the prompt names the skill and the made-up brand', () => {
    const prompt = read(EXAMPLE_DIR, 'prompt.md');
    assert.match(prompt, /vyson-3d-interactive-web/);
    assert.match(prompt, /Halden Glassworks/);
  });

  it('the page works without the scene: one h1, a skip link, a named canvas, a fallback and hidden controls', () => {
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, /<a class="skip-link" href="#main">/);
    assert.match(html, /<canvas[^>]*aria-label="[^"]{20,}"/);
    assert.match(html, /fallback/);
    assert.match(html, /<noscript>/);
    assert.match(html, /hidden/);
  });

  it('the CSS reserves the canvas size, allows vertical scrolling over it and sizes the buttons', () => {
    assert.match(css, /aspect-ratio/);
    assert.match(css, /touch-action:\s*pan-y/);
    assert.match(css, /min-height:\s*2\.75rem/);
    assert.match(css, /:focus-visible/);
  });

  it('loads nothing from another website', () => {
    assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//);
    assert.doesNotMatch(read(EXAMPLE_DIR, 'result', 'scene.js'), /https?:\/\//);
  });

  it('says clearly that the studio and the product are made up', () => {
    assert.match(html, /made-up|made up|Demo/i);
    assert.match(read(EXAMPLE_DIR, 'CREDITS.md'), /Made-up names for a demo/);
  });

  it('the example README is honest: it says what was not checked and that it is not an independent test', () => {
    const readme = read(EXAMPLE_DIR, 'README.md');
    assert.match(readme, /## What was not checked/);
    assert.match(readme, /not an independent test/);
    assert.match(readme, /real GPU/);
    assert.match(readme, /real phone/);
  });

  it('the README line count of the scene is about right', () => {
    const lines = read(EXAMPLE_DIR, 'result', 'scene.js').split(/\r?\n/).length;
    const claimed = Number(/about (\d+) lines/.exec(read(EXAMPLE_DIR, 'README.md'))[1]);
    assert.ok(Math.abs(lines - claimed) <= 40, `scene.js has ${lines} lines, the README says ${claimed}`);
  });
});

describe(`${NAME}: eval file`, () => {
  const evals = JSON.parse(read(REPO_ROOT, 'evals', NAME, 'evals.json'));

  it('has both "should activate" and "should not activate" cases', () => {
    assert.ok(evals.cases.filter((c) => c.should_activate).length >= 4);
    assert.ok(evals.cases.filter((c) => !c.should_activate).length >= 3);
  });

  it('includes the cases that mark the boundary with motion, design and logic-only work', () => {
    const prompts = evals.cases.filter((c) => !c.should_activate).map((c) => c.prompt).join('\n');
    assert.match(prompts, /fade-in animation/);
    assert.match(prompts, /premium/);
    assert.match(prompts, /signup form/);
  });

  it('every case has checkable statements', () => {
    for (const c of evals.cases) assert.ok(c.must_be_true.length >= 1, `case ${c.id}`);
  });
});
