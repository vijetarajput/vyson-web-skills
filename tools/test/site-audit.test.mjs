// Tests for skills/vyson-website-quality-engineering/scripts/site-audit.mjs
// Each test builds a tiny site in a temporary folder with exactly the problem it wants to check.
// site-audit is a static checker, so these tests only check what it reads in files.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-website-quality-engineering', 'scripts', 'site-audit.mjs');
const { RULES, LIMITS, auditSite } = await import(pathToFileURL(SCRIPT).href);

const temps = [];
after(() => temps.forEach(removeDir));

const HEAD = `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A short description.">
  <meta property="og:title" content="A page">
  <meta property="og:description" content="A short description.">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E">
  <link rel="stylesheet" href="style.css">
  <script src="app.js" defer></script>`;

const page = ({ title = 'Home', body = '', head = HEAD, lang = ' lang="en"' } = {}) => `<!doctype html>
<html${lang}>
<head>
  <title>${title}</title>
  ${head}
</head>
<body>
  <main>
    <h1>Welcome</h1>
    <h2 id="part">Part</h2>
    <img src="a.png" alt="A plant" width="40" height="30">
    <a href="about.html">About</a> <a href="#part">Part</a>
    ${body}
  </main>
</body>
</html>
`;

const GOOD_CSS = 'a { color: #123; }\n:focus-visible { outline: 3px solid; }\n@media (prefers-reduced-motion: reduce) { * { animation: none; } }\n';

const baseFiles = () => ({
  'index.html': page(),
  'about.html': page({ title: 'About' }),
  'style.css': GOOD_CSS,
  'app.js': 'export {};\n',
  'a.png': 'png',
});

function site(overrides = {}) {
  const root = makeTempDir('vyson-sa-');
  temps.push(root);
  writeFiles(root, { ...baseFiles(), ...overrides });
  return root;
}
const codes = (overrides) => auditSite(site(overrides)).issues.map((i) => i.code);

describe('site-audit: a clean site', () => {
  it('has no issues', () => {
    const result = auditSite(site());
    assert.deepEqual(result.issues, []);
    assert.equal(result.pages.length, 2);
  });
});

describe('site-audit: one test for every rule', () => {
  it('QA001 a broken link, and a capital letter that differs', () => {
    assert.ok(codes({ 'index.html': page({ body: '<a href="missing.html">x</a>' }) }).includes('QA001'));
    // Windows and macOS would open About.html; most web servers would not, so the audit says so on every system.
    assert.ok(codes({ 'index.html': page({ body: '<a href="About.html">x</a>' }) }).includes('QA001'));
    assert.ok(codes({ 'index.html': page({ body: '<img src="A.PNG" alt="x" width="1" height="1">' }) }).includes('QA002'));
    assert.ok(!codes({ 'index.html': page({ body: '<a href="mailto:a@b.example">x</a> <a href="https://example.com/">y</a>' }) }).includes('QA001'));
  });

  it('QA002 a missing image, script or stylesheet', () => {
    assert.ok(codes({ 'index.html': page({ body: '<img src="missing.png" alt="x" width="1" height="1">' }) }).includes('QA002'));
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace('style.css', 'gone.css') }) }).includes('QA002'));
  });

  it('QA003 a link to a section that does not exist', () => {
    assert.ok(codes({ 'index.html': page({ body: '<a href="#nope">x</a>' }) }).includes('QA003'));
  });

  it('QA004 the same id twice', () => {
    assert.ok(codes({ 'index.html': page({ body: '<p id="part">x</p>' }) }).includes('QA004'));
  });

  it('QA005 no lang', () => {
    assert.ok(codes({ 'index.html': page({ lang: '' }) }).includes('QA005'));
  });

  it('QA006 no viewport, and a viewport that blocks zooming', () => {
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace(/<meta name="viewport"[^>]*>/, '') }) }).includes('QA006'));
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace('initial-scale=1"', 'initial-scale=1, user-scalable=no"') }) }).includes('QA006'));
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace('initial-scale=1"', 'initial-scale=1, maximum-scale=1"') }) }).includes('QA006'));
  });

  it('QA007 no title, QA008 the same title on two pages', () => {
    assert.ok(codes({ 'index.html': page({ title: '' }) }).includes('QA007'));
    assert.ok(codes({ 'about.html': page({ title: 'Home' }) }).includes('QA008'));
  });

  it('QA009 no description', () => {
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace(/<meta name="description"[^>]*>/, '') }) }).includes('QA009'));
  });

  it('QA010 two h1, QA011 a skipped level', () => {
    assert.ok(codes({ 'index.html': page({ body: '<h1>Another</h1>' }) }).includes('QA010'));
    assert.ok(codes({ 'index.html': page({ body: '<h4>Deep</h4>' }) }).includes('QA011'));
  });

  it('QA012 an image with no alt, but empty alt is allowed', () => {
    assert.ok(codes({ 'index.html': page({ body: '<img src="a.png" width="1" height="1">' }) }).includes('QA012'));
    assert.ok(!codes({ 'index.html': page({ body: '<img src="a.png" alt="" width="1" height="1">' }) }).includes('QA012'));
  });

  it('QA013 an image with no width and height', () => {
    assert.ok(codes({ 'index.html': page({ body: '<img src="a.png" alt="x">' }) }).includes('QA013'));
  });

  it('QA014 a field with no label, but a label, wrapping or aria-label is fine', () => {
    assert.ok(codes({ 'index.html': page({ body: '<input type="text" placeholder="Name">' }) }).includes('QA014'));
    assert.ok(!codes({ 'index.html': page({ body: '<label for="n">Name</label><input id="n" type="text">' }) }).includes('QA014'));
    assert.ok(!codes({ 'index.html': page({ body: '<label>Name <input type="text"></label>' }) }).includes('QA014'));
    assert.ok(!codes({ 'index.html': page({ body: '<input type="text" aria-label="Name">' }) }).includes('QA014'));
  });

  it('QA015 a button with no name', () => {
    assert.ok(codes({ 'index.html': page({ body: '<button><svg></svg></button>' }) }).includes('QA015'));
    assert.ok(!codes({ 'index.html': page({ body: '<button aria-label="Close"><svg></svg></button>' }) }).includes('QA015'));
  });

  it('QA016 a positive tabindex, QA017 a link that goes nowhere', () => {
    assert.ok(codes({ 'index.html': page({ body: '<a href="about.html" tabindex="3">x</a>' }) }).includes('QA016'));
    assert.ok(codes({ 'index.html': page({ body: '<a href="#">x</a>' }) }).includes('QA017'));
    assert.ok(codes({ 'index.html': page({ body: '<a href="javascript:void(0)">x</a>' }) }).includes('QA017'));
  });

  it('QA018 noindex', () => {
    assert.ok(codes({ 'index.html': page({ head: `${HEAD}\n<meta name="robots" content="noindex">` }) }).includes('QA018'));
  });

  it('QA019 no favicon, unless a favicon.ico file exists', () => {
    const noIcon = HEAD.replace(/<link rel="icon"[^>]*>/, '');
    assert.ok(codes({ 'index.html': page({ head: noIcon }), 'about.html': page({ title: 'About', head: noIcon }) }).includes('QA019'));
    assert.ok(!codes({ 'index.html': page({ head: noIcon }), 'about.html': page({ title: 'About', head: noIcon }), 'favicon.ico': 'ico' }).includes('QA019'));
  });

  it('QA020 no Open Graph tags', () => {
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace(/<meta property="og:[^>]*>/g, '') }) }).includes('QA020'));
  });

  it('QA021 placeholder text', () => {
    assert.ok(codes({ 'index.html': page({ body: '<p>Lorem ipsum dolor sit amet</p>' }) }).includes('QA021'));
  });

  it('QA022 an http resource and QA023 a resource from another website', () => {
    const found = codes({ 'index.html': page({ body: '<img src="http://example.com/a.png" alt="x" width="1" height="1">' }) });
    assert.ok(found.includes('QA022'));
    assert.ok(found.includes('QA023'));
    const https = codes({ 'index.html': page({ body: '<script src="https://cdn.example.com/x.js" defer></script>' }) });
    assert.ok(https.includes('QA023'));
    assert.ok(!https.includes('QA022'));
  });

  it('QA024 a script in the head with no defer', () => {
    assert.ok(codes({ 'index.html': page({ head: HEAD.replace(' defer', '') }) }).includes('QA024'));
    assert.ok(!codes({ 'index.html': page({ head: HEAD.replace('<script src="app.js" defer>', '<script type="module" src="app.js">') }) }).includes('QA024'));
  });

  it('QA025 a large file, QA026 a page whose files add up to a lot', () => {
    assert.ok(codes({ 'big.png': 'x'.repeat(LIMITS.image + 10), 'index.html': page({ body: '<img src="big.png" alt="x" width="1" height="1">' }) }).includes('QA025'));
    const files = { 'index.html': page({ body: [1, 2, 3, 4, 5].map((n) => `<img src="i${n}.png" alt="x" width="1" height="1">`).join('') }) };
    for (const n of [1, 2, 3, 4, 5]) files[`i${n}.png`] = 'x'.repeat(450_000);
    const found = codes(files);
    assert.ok(found.includes('QA026'));
    assert.ok(!found.includes('QA025'));
  });

  it('QA027 a removed focus outline, and QA028 animation with no reduced-motion rule', () => {
    assert.ok(codes({ 'style.css': 'a:focus { outline: none; }\n' }).includes('QA027'));
    assert.ok(!codes({ 'style.css': 'a:focus { outline: none; }\n:focus-visible { outline: 2px solid; }\n' }).includes('QA027'));
    assert.ok(codes({ 'style.css': 'a { transition: color 1s; }\n:focus-visible { outline: 2px solid; }\n' }).includes('QA028'));
  });

  it('the catalogue has 28 rules, each with a fix', () => {
    assert.equal(Object.keys(RULES).length, 28);
    for (const [code, rule] of Object.entries(RULES)) {
      assert.ok(['error', 'warning'].includes(rule.severity), code);
      assert.ok(rule.fix.length > 20, code);
    }
  });
});

describe('site-audit: it reads markup, not comments or script text', () => {
  it('a bad tag inside an HTML comment or a script string does not count', () => {
    const body = '<!-- <img src="missing.png"> --><script>const s = \'<img src="x.png">\';</script>';
    const found = codes({ 'index.html': page({ body }) });
    assert.ok(!found.includes('QA002'));
    assert.ok(!found.includes('QA012'));
  });

  it('issues carry a file, a line, a message and a fix', () => {
    const { issues } = auditSite(site({ 'index.html': page({ body: '<a href="missing.html">x</a>' }) }));
    const issue = issues.find((i) => i.code === 'QA001');
    assert.ok(issue.file.endsWith('index.html'));
    assert.ok(issue.line > 1);
    assert.ok(issue.message && issue.fix && issue.title);
  });
});

describe('site-audit: the command line', () => {
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('exits 0 for a clean site, 1 for errors and 2 for wrong use', () => {
    assert.equal(run(site()).status, 0);
    assert.equal(run(site({ 'index.html': page({ lang: '' }) })).status, 1);
    assert.equal(run().status, 2);
    assert.equal(run('--nonsense').status, 2);
    assert.equal(run(path.join(REPO_ROOT, 'no-such-folder')).status, 2);
    assert.equal(run('--help').status, 0);
  });

  it('--strict fails on a warning, and --json prints data', () => {
    const warn = site({ 'index.html': page({ body: '<img src="a.png" alt="x">' }) });
    assert.equal(run(warn).status, 0);
    const strict = run(warn, '--strict', '--json');
    assert.equal(strict.status, 1);
    assert.ok(JSON.parse(strict.stdout).issues.some((i) => i.code === 'QA013'));
  });

  it('says it is a static check, and not a browser test, in its output', () => {
    const out = run(site()).stdout;
    assert.match(out, /static checks only/i);
    assert.match(out, /no browser was opened/i);
  });
});

describe('site-audit: the checker itself', () => {
  const script = fs.readFileSync(SCRIPT, 'utf8');

  it('says it is a static checker and uses no network, no browser and no child process', () => {
    assert.match(script, /IT IS A STATIC CHECKER/);
    assert.doesNotMatch(script, /node:(http|https|net|dgram|child_process)|fetch\(|XMLHttpRequest/);
  });

  it('imports only Node built-ins', () => {
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, spec);
  });
});
