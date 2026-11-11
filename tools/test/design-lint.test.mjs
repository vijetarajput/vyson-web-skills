// Tests for skills/vyson-premium-website-design/scripts/design-lint.mjs
// Each test builds a tiny site in a temporary folder with exactly the problem it wants to check.
// design-lint is a static checker, so these tests only check what it reads in text.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-premium-website-design', 'scripts', 'design-lint.mjs');
const { RULES, lintPaths, contrastRatio, parseColor, parseDeclarations } = await import(pathToFileURL(SCRIPT).href);

const temps = [];
after(() => temps.forEach(removeDir));

/** A complete, clean page. Tests change one thing at a time. */
const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A page</title>
  <meta name="description" content="A short description.">
</head>
<body>
  <main>
    <h1>Headline</h1>
    <h2>Section</h2>
    <img src="a.png" alt="A plant" width="400" height="300">
    <a href="#contact">Contact</a>
  </main>
</body>
</html>
`;

function lint(files) {
  const root = makeTempDir('vyson-dl-');
  temps.push(root);
  writeFiles(root, files);
  return lintPaths([root]).issues;
}

const codes = (issues) => issues.map((i) => i.code);

describe('design-lint: a clean site', () => {
  it('has no issues', () => {
    assert.deepEqual(lint({ 'index.html': GOOD_HTML, 'style.css': 'body { font-size: 1rem; }\n' }), []);
  });
});

describe('design-lint: page basics (markup)', () => {
  it('DL001 a page without lang', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<html lang="en">', '<html>') })).includes('DL001'));
  });

  it('DL002 a page without a viewport tag', () => {
    const html = GOOD_HTML.replace(/\s*<meta name="viewport"[^>]*>/, '');
    assert.ok(codes(lint({ 'index.html': html })).includes('DL002'));
  });

  it('DL003 a viewport that blocks zoom (user-scalable and maximum-scale)', () => {
    for (const content of ['width=device-width, initial-scale=1, user-scalable=no', 'width=device-width, maximum-scale=1']) {
      const html = GOOD_HTML.replace('width=device-width, initial-scale=1', content);
      assert.ok(codes(lint({ 'index.html': html })).includes('DL003'), content);
    }
  });

  it('DL003 is not raised for a normal viewport or a generous maximum-scale', () => {
    const html = GOOD_HTML.replace('initial-scale=1', 'initial-scale=1, maximum-scale=5');
    assert.ok(!codes(lint({ 'index.html': html })).includes('DL003'));
  });

  it('DL004 an image without alt, but an empty alt is fine', () => {
    const missing = GOOD_HTML.replace(' alt="A plant"', '');
    assert.ok(codes(lint({ 'index.html': missing })).includes('DL004'));
    const decorative = GOOD_HTML.replace('alt="A plant"', 'alt=""');
    assert.ok(!codes(lint({ 'index.html': decorative })).includes('DL004'));
  });

  it('DL004 does not mistake the word "alt" inside another attribute for alt text', () => {
    const html = GOOD_HTML.replace(' alt="A plant"', ' title="an alt text"');
    assert.ok(codes(lint({ 'index.html': html })).includes('DL004'));
  });

  it('DL005 an image without width and height', () => {
    const html = GOOD_HTML.replace(' width="400" height="300"', '');
    assert.ok(codes(lint({ 'index.html': html })).includes('DL005'));
  });

  it('DL006 no title, or an empty title', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<title>A page</title>', '') })).includes('DL006'));
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<title>A page</title>', '<title> </title>') })).includes('DL006'));
  });

  it('DL007 no meta description', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace(/\s*<meta name="description"[^>]*>/, '') })).includes('DL007'));
  });

  it('DL008 no h1 or two h1 elements', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<h1>Headline</h1>', '<h2>Headline</h2>') })).includes('DL008'));
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<h2>Section</h2>', '<h1>Again</h1>') })).includes('DL008'));
  });

  it('DL009 a skipped heading level', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<h2>Section</h2>', '<h4>Section</h4>') })).includes('DL009'));
  });

  it('DL010 no main landmark', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('<main>', '<div>').replace('</main>', '</div>') })).includes('DL010'));
  });

  it('page-level rules do not apply to a fragment without an <html> tag', () => {
    const issues = lint({ 'partial.html': '<section><h2>Part</h2><p>Text</p></section>\n' });
    assert.deepEqual(issues, []);
  });

  it('DL013 placeholder text, in text and in alt text', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('Headline', 'Lorem ipsum dolor sit amet') })).includes('DL013'));
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('A plant', 'Your logo here') })).includes('DL013'));
  });

  it('DL013 does not look inside scripts, styles or comments', () => {
    const html = GOOD_HTML.replace('</body>', '<!-- lorem ipsum -->\n<script>const s = "lorem ipsum";</script></body>');
    assert.ok(!codes(lint({ 'index.html': html })).includes('DL013'));
  });

  it('DL014 a link that goes nowhere', () => {
    assert.ok(codes(lint({ 'index.html': GOOD_HTML.replace('href="#contact"', 'href="#"') })).includes('DL014'));
  });

  it('DL017 files loaded from another website (image, script, stylesheet), but normal links are fine', () => {
    const html = GOOD_HTML
      .replace('src="a.png"', 'src="https://cdn.example.com/a.png"')
      .replace('</head>', '<link rel="stylesheet" href="https://fonts.example.com/css"><script src="//cdn.example.com/x.js"></script></head>')
      .replace('</main>', '<a href="https://example.com/">A normal link</a></main>');
    const found = lint({ 'index.html': html }).filter((i) => i.code === 'DL017');
    assert.equal(found.length, 3);
  });

  it('DL017 canonical and alternate link tags are not files that get loaded', () => {
    const html = GOOD_HTML.replace('</head>', '<link rel="canonical" href="https://example.com/"></head>');
    assert.ok(!codes(lint({ 'index.html': html })).includes('DL017'));
  });
});

describe('design-lint: style rules (CSS)', () => {
  it('DL011 outline removed with no replacement, but fine with a :focus-visible rule', () => {
    assert.ok(codes(lint({ 'a.css': 'a:focus { outline: none; }\n' })).includes('DL011'));
    assert.ok(codes(lint({ 'a.css': 'a:focus { outline: 0; }\n' })).includes('DL011'));
    assert.deepEqual(codes(lint({ 'a.css': 'a { outline: none; }\na:focus-visible { outline: 3px solid #000; }\n' })), []);
    assert.deepEqual(codes(lint({ 'a.css': 'a:focus:not(:focus-visible) { outline: none; }\n' })), []);
  });

  it('DL012 tiny text in px and rem, but not for hidden helper classes', () => {
    assert.ok(codes(lint({ 'a.css': '.fine-print { font-size: 10px; }\n' })).includes('DL012'));
    assert.ok(codes(lint({ 'a.css': '.fine-print { font-size: 0.6rem; }\n' })).includes('DL012'));
    assert.deepEqual(codes(lint({ 'a.css': '.fine-print { font-size: 0.75rem; }\n.vd-visually-hidden { font-size: 1px; }\n' })), []);
  });

  it('DL012 follows a custom property', () => {
    assert.ok(codes(lint({ 'a.css': ':root { --tiny: 9px; }\n.x { font-size: var(--tiny); }\n' })).includes('DL012'));
  });

  it('DL015 text and background tokens with too little contrast', () => {
    const css = ':root { --vd-text: #999999; --vd-bg: #ffffff; }\n';
    const found = lint({ 'a.css': css }).filter((i) => i.code === 'DL015');
    assert.equal(found.length, 1);
    assert.match(found[0].message, /--vd-text/);
    assert.match(found[0].message, /needs at least 4\.5:1/i);
  });

  it('DL015 passes a good pair, and ignores colours it cannot read (named colours, var(), hsl)', () => {
    assert.deepEqual(codes(lint({ 'a.css': ':root { --vd-text: #1c1a17; --vd-bg: #fbfaf7; }\n' })), []);
    assert.deepEqual(codes(lint({ 'a.css': ':root { --vd-text: gray; --vd-bg: white; }\n' })), []);
    assert.deepEqual(codes(lint({ 'a.css': ':root { --vd-text: hsl(0 0% 60%); --vd-bg: #fff; }\n' })), []);
  });

  it('DL015 reads tokens set in a different file from the base (the last file wins)', () => {
    const issues = lint({
      'a-tokens.css': ':root { --vd-text: #111111; --vd-bg: #ffffff; }\n',
      'b-page.css': ':root { --vd-bg: #333333; }\n',
    });
    assert.ok(codes(issues).includes('DL015'), 'dark background with dark text should fail');
  });

  it('DL015 also checks a theme block on top of the base palette', () => {
    const css = ':root { --vd-text: #111111; --vd-bg: #ffffff; }\n@media (prefers-color-scheme: dark) { :root { --vd-bg: #222222; } }\n';
    assert.ok(codes(lint({ 'a.css': css })).includes('DL015'));
    const ok = ':root { --vd-text: #111111; --vd-bg: #ffffff; }\n@media (prefers-color-scheme: dark) { :root { --vd-text: #f5f5f5; --vd-bg: #222222; } }\n';
    assert.deepEqual(codes(lint({ 'a.css': ok })), []);
  });

  it('DL015 checks text on the accent', () => {
    const css = ':root { --vd-accent: #ffcc00; --vd-accent-contrast: #ffffff; }\n';
    assert.ok(codes(lint({ 'a.css': css })).includes('DL015'));
  });

  it('DL016 more than three font stacks, including stacks held in custom properties', () => {
    const css = ':root { --vd-font-display: Georgia, serif; --vd-font-body: system-ui, sans-serif; --vd-font-mono: ui-monospace, monospace; --vd-font-extra: Verdana, sans-serif; }\n';
    assert.ok(codes(lint({ 'a.css': css })).includes('DL016'));
    assert.deepEqual(codes(lint({ 'a.css': ':root { --vd-font-display: Georgia, serif; --vd-font-body: system-ui, sans-serif; }\nh1 { font-family: var(--vd-font-display); }\n' })), []);
  });

  it('DL017 CSS that loads a file or an @import from another website', () => {
    const css = '@import url("https://fonts.example.com/a.css");\n@font-face { font-family: X; src: url(https://cdn.example.com/x.woff2); }\n';
    const found = lint({ 'a.css': css }).filter((i) => i.code === 'DL017');
    assert.equal(found.length, 2);
    assert.deepEqual(codes(lint({ 'a.css': '@font-face { font-family: X; src: url(fonts/x.woff2); }\n.hero { background: url(data:image/svg+xml,%3Csvg%3E); }\n' })), []);
  });

  it('DL018 width: 100vw', () => {
    assert.ok(codes(lint({ 'a.css': '.band { width: 100vw; }\n' })).includes('DL018'));
    assert.deepEqual(codes(lint({ 'a.css': '.band { width: 100%; }\n' })), []);
  });

  it('reads CSS inside <style> blocks of an HTML file and reports the right line', () => {
    const html = GOOD_HTML.replace('</head>', '<style>\n.x {\n  font-size: 8px;\n}\n</style></head>');
    const issue = lint({ 'index.html': html }).find((i) => i.code === 'DL012');
    assert.ok(issue);
    assert.equal(html.split('\n')[issue.line - 1].trim(), 'font-size: 8px;');
  });
});

describe('design-lint: colour maths', () => {
  it('black on white is 21:1 and the same colour is 1:1', () => {
    assert.equal(Math.round(contrastRatio(parseColor('#000'), parseColor('#fff')) * 100) / 100, 21);
    assert.equal(contrastRatio(parseColor('#336699'), parseColor('#336699')), 1);
  });

  it('#767676 on white just passes 4.5:1 and #777777 just fails', () => {
    assert.ok(contrastRatio(parseColor('#767676'), parseColor('#fff')) >= 4.5);
    assert.ok(contrastRatio(parseColor('#777777'), parseColor('#fff')) < 4.5);
  });

  it('reads #rgb, #rrggbb and rgb(), and gives up on see-through or unknown colours', () => {
    assert.deepEqual(parseColor('#abc'), [170, 187, 204]);
    assert.deepEqual(parseColor('#112233'), [17, 34, 51]);
    assert.deepEqual(parseColor('rgb(1, 2, 3)'), [1, 2, 3]);
    assert.deepEqual(parseColor('rgb(1 2 3)'), [1, 2, 3]);
    assert.equal(parseColor('rgba(1, 2, 3, 0.5)'), null);
    assert.equal(parseColor('tomato'), null);
    assert.equal(parseColor('var(--x)'), null);
  });
});

describe('design-lint: rule catalog and command line', () => {
  it('every rule has a severity, a title and a fix', () => {
    for (const [code, rule] of Object.entries(RULES)) {
      assert.match(code, /^DL\d{3}$/);
      assert.ok(['error', 'warning'].includes(rule.severity), code);
      assert.ok(rule.title && rule.fix, code);
    }
  });

  it('the CSS reader remembers the rule each declaration sits in', () => {
    const decls = parseDeclarations('/* c */ @media (min-width: 40rem) { .a { color: red; } }');
    assert.equal(decls[0].prop, 'color');
    assert.deepEqual(decls[0].context, ['@media (min-width: 40rem)', '.a']);
  });

  const run = (args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('exits 0 for a clean site and says it is a static check', () => {
    const root = makeTempDir('vyson-dl-cli-');
    temps.push(root);
    writeFiles(root, { 'index.html': GOOD_HTML });
    const r = run([root]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /static checks only/i);
    assert.match(r.stdout, /RESULT: PASSED/);
  });

  it('exits 1 when there is an error, and --json reports it', () => {
    const root = makeTempDir('vyson-dl-cli-');
    temps.push(root);
    writeFiles(root, { 'index.html': GOOD_HTML.replace('<html lang="en">', '<html>') });
    const r = run([root, '--json']);
    assert.equal(r.status, 1);
    const data = JSON.parse(r.stdout);
    assert.equal(data.kind, 'static');
    assert.equal(data.errors, 1);
    assert.equal(data.issues[0].code, 'DL001');
  });

  it('--strict turns warnings into failures', () => {
    const root = makeTempDir('vyson-dl-cli-');
    temps.push(root);
    writeFiles(root, { 'a.css': '.x { font-size: 8px; }\n' });
    assert.equal(run([root]).status, 0);
    assert.equal(run([root, '--strict']).status, 1);
  });

  it('exits 2 with no path or an unknown option, and 2 for a path that does not exist', () => {
    assert.equal(run([]).status, 2);
    assert.equal(run(['--nope', '.']).status, 2);
    assert.equal(run([path.join(REPO_ROOT, 'does-not-exist')]).status, 2);
  });
});
