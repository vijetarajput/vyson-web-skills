// Tests for skills/vyson-css-motion/scripts/motion-lint.mjs
// Each test feeds a small piece of CSS to the checker and looks at the rule codes it reports.

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-css-motion', 'scripts', 'motion-lint.mjs');
const { RULES, parseDeclarations, lintSources, lintPaths, lintScripts, lintMarkup } = await import(pathToFileURL(SCRIPT).href);

/** Codes reported for one script, and for one HTML file. */
const lintJs = (js) => lintScripts([{ file: 'test.js', js }]).map((i) => i.code);
const lintHtml = (html) => lintMarkup([{ file: 'test.html', html }]).map((i) => i.code);

/** Codes reported for one piece of CSS. */
const lint = (css) => lintSources([{ file: 'test.css', css }]).map((i) => i.code);

/** Wrap motion in the "no preference" query, which is what the skill teaches. */
const guarded = (css) => `@media (prefers-reduced-motion: no-preference) { ${css} }`;

const temps = [];
afterEach(() => {
  while (temps.length) removeDir(temps.pop());
});
function tempWith(files) {
  const dir = makeTempDir('vyson-lint-');
  temps.push(dir);
  writeFiles(dir, files);
  return dir;
}

function runCli(args) {
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout, err: r.stderr };
}

describe('motion-lint: CSS reader', () => {
  it('reads declarations with their line numbers and at-rule context', () => {
    const decls = parseDeclarations('a {\n  color: red;\n}\n@media (min-width: 10px) {\n  b {\n    opacity: 0;\n  }\n}\n');
    assert.deepEqual(decls.map((d) => [d.prop, d.value, d.line]), [['color', 'red', 2], ['opacity', '0', 6]]);
    assert.deepEqual(decls[1].context, ['@media (min-width: 10px)', 'b']);
  });

  it('ignores comments', () => {
    assert.deepEqual(lint('/* transition: all 1s; */ a { color: red; }'), []);
  });

  it('is not confused by semicolons inside url() or quotes', () => {
    const css = 'a { background: url("data:image/svg+xml;base64,AAAA"); content: "a;b"; opacity: 1; }';
    assert.deepEqual(parseDeclarations(css).map((d) => d.prop), ['background', 'content', 'opacity']);
  });

  it('does not split on commas inside cubic-bezier()', () => {
    const css = guarded('.a { transition: transform 200ms cubic-bezier(0.2, 0, 0, 1); }');
    assert.deepEqual(lint(css), []);
  });
});

describe('motion-lint: good CSS passes', () => {
  it('accepts a named transition on transform and opacity, written for no-preference', () => {
    assert.deepEqual(lint(guarded('.a { transition: transform 200ms ease, opacity 200ms ease; }')), []);
  });

  it('accepts CSS that has no motion at all', () => {
    assert.deepEqual(lint('.a { color: red; margin: 0 auto; }'), []);
  });

  it('accepts motion that a reduce block removes', () => {
    const css = '.a { animation: fade 300ms both; } @media (prefers-reduced-motion: reduce) { .a { animation: none; } }';
    assert.deepEqual(lint(css), []);
  });
});

describe('motion-lint: ML001 transition on all', () => {
  it('flags "transition: all"', () => {
    assert.ok(lint(guarded('.a { transition: all 200ms; }')).includes('ML001'));
  });

  it('flags a transition that names no property (this means "all")', () => {
    assert.ok(lint(guarded('.a { transition: 200ms ease-out; }')).includes('ML001'));
  });

  it('flags "transition-property: all"', () => {
    assert.ok(lint(guarded('.a { transition-property: all; transition-duration: 200ms; }')).includes('ML001'));
  });

  it('does not flag "transition: none"', () => {
    assert.ok(!lint('.a { transition: none; }').includes('ML001'));
  });
});

describe('motion-lint: ML002 layout properties', () => {
  it('flags a transition on width', () => {
    assert.ok(lint(guarded('.a { transition: width 200ms; }')).includes('ML002'));
  });

  it('flags one bad property in a list of good ones', () => {
    assert.ok(lint(guarded('.a { transition: opacity 200ms, height 200ms; }')).includes('ML002'));
  });

  it('flags layout properties inside @keyframes', () => {
    const css = guarded('@keyframes grow { from { left: 0; } to { left: 100px; } } .a { animation: grow 300ms; }');
    assert.ok(lint(css).includes('ML002'));
  });

  it('allows transform and opacity inside @keyframes', () => {
    const css = guarded('@keyframes rise { from { opacity: 0; transform: translateY(10px); } } .a { animation: rise 300ms both; }');
    assert.deepEqual(lint(css), []);
  });

  it('allows grid-template-rows (the documented disclosure-panel exception)', () => {
    assert.ok(!lint(guarded('.a { transition: grid-template-rows 240ms; }')).includes('ML002'));
  });
});

describe('motion-lint: ML003 no reduced-motion handling', () => {
  it('reports motion when nothing handles reduced motion', () => {
    assert.ok(lint('.a { transition: opacity 200ms; }').includes('ML003'));
    assert.ok(lint('.a { animation: spin 2s linear; }').includes('ML003'));
  });

  it('is satisfied by a no-preference block', () => {
    assert.ok(!lint(guarded('.a { transition: opacity 200ms; }')).includes('ML003'));
  });

  it('is satisfied by a handling block in another file of the same check', () => {
    const issues = lintSources([
      { file: 'a.css', css: '.a { transition: opacity 200ms; }' },
      { file: 'b.css', css: '@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important; } }' },
    ]);
    assert.ok(!issues.some((i) => i.code === 'ML003'));
  });

  it('ignores a zero-length transition', () => {
    assert.ok(!lint('.a { transition: opacity 0s; }').includes('ML003'));
  });
});

describe('motion-lint: ML004 endless animation', () => {
  it('flags an infinite animation with no reduced-motion switch-off', () => {
    assert.ok(lint('.a { animation: spin 3s linear infinite; } @media (prefers-reduced-motion: reduce) { .b { color: red; } }').includes('ML004'));
  });

  it('accepts an infinite animation inside no-preference', () => {
    assert.ok(!lint(guarded('.a { animation: spin 3s linear infinite; }')).includes('ML004'));
  });

  it('accepts a reduce block that stops animations', () => {
    const css = '.a { animation: spin 3s linear infinite; } @media (prefers-reduced-motion: reduce) { .a { animation: none; } }';
    assert.ok(!lint(css).includes('ML004'));
  });
});

describe('motion-lint: ML005 will-change', () => {
  const rules = (n) => Array.from({ length: n }, (_, i) => `.w${i} { will-change: transform; }`).join('\n');

  it('allows three will-change declarations', () => {
    assert.ok(!lint(rules(3)).includes('ML005'));
  });

  it('flags four', () => {
    assert.ok(lint(rules(4)).includes('ML005'));
  });

  it('does not count will-change: auto', () => {
    assert.ok(!lint(`${rules(3)}\n.x { will-change: auto; }`).includes('ML005'));
  });
});

describe('motion-lint: ML006 long durations', () => {
  it('allows exactly 1000ms and flags 1.5s', () => {
    assert.ok(!lint(guarded('.a { transition: opacity 1s; }')).includes('ML006'));
    assert.ok(lint(guarded('.a { transition: opacity 1.5s; }')).includes('ML006'));
  });

  it('understands var() tokens', () => {
    const css = guarded(':root { --slow: 2000ms; } .a { transition: opacity var(--slow); }');
    assert.ok(lint(css).includes('ML006'));
  });

  it('flags a long transition-duration', () => {
    assert.ok(lint(guarded('.a { transition-property: opacity; transition-duration: 1200ms; }')).includes('ML006'));
  });

  it('does not flag slow endless loops', () => {
    assert.ok(!lint(guarded('.a { animation: drift 30s linear infinite; }')).includes('ML006'));
  });
});

describe('motion-lint: ML007 smooth scrolling', () => {
  it('flags unguarded smooth scrolling', () => {
    assert.ok(lint('html { scroll-behavior: smooth; }').includes('ML007'));
  });

  it('accepts it inside no-preference', () => {
    assert.ok(!lint(guarded('html { scroll-behavior: smooth; }')).includes('ML007'));
  });

  it('accepts it when a reduce block sets scroll-behavior', () => {
    const css = 'html { scroll-behavior: smooth; } @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }';
    assert.ok(!lint(css).includes('ML007'));
  });
});

describe('motion-lint: ML008 scroll-driven animation', () => {
  it('flags animation-timeline outside @supports', () => {
    assert.ok(lint(guarded('.a { animation: rise linear both; animation-timeline: view(); }')).includes('ML008'));
  });

  it('accepts it inside @supports', () => {
    const css = guarded('@supports (animation-timeline: view()) { .a { animation: rise linear both; animation-timeline: view(); } }');
    assert.ok(!lint(css).includes('ML008'));
  });
});

describe('motion-lint: ML009 paint-heavy properties', () => {
  it('flags a box-shadow transition', () => {
    assert.ok(lint(guarded('.a { transition: box-shadow 200ms; }')).includes('ML009'));
  });

  it('flags filter inside @keyframes', () => {
    assert.ok(lint(guarded('@keyframes blur { to { filter: blur(4px); } } .a { animation: blur 300ms; }')).includes('ML009'));
  });
});

describe('motion-lint: reports', () => {
  it('gives each issue a code, severity, message, fix and line number', () => {
    const [issue] = lintSources([{ file: 'x.css', css: '\n\n.a { transition: all 200ms; }' }]).filter((i) => i.code === 'ML001');
    assert.equal(issue.severity, 'error');
    assert.equal(issue.file, 'x.css');
    assert.equal(issue.line, 3);
    assert.match(issue.fix, /Name the properties/);
    assert.ok(issue.message.length > 0);
  });

  it('has a plain-English fix for every rule', () => {
    for (const [code, rule] of Object.entries(RULES)) {
      assert.match(code, /^ML\d{3}$/);
      assert.ok(['error', 'warning'].includes(rule.severity), code);
      assert.ok(rule.title.length > 5 && rule.fix.length > 20, code);
    }
  });
});

describe('motion-lint: files and HTML', () => {
  it('reads <style> blocks inside HTML and keeps the right line numbers', () => {
    const dir = tempWith({ 'index.html': '<!doctype html>\n<html>\n<head>\n<style>\n.a { transition: all 1s; }\n</style>\n</head></html>\n' });
    const { issues, files } = lintPaths([dir]);
    assert.equal(files.length, 1);
    const bad = issues.find((i) => i.code === 'ML001');
    assert.ok(bad);
    assert.equal(bad.line, 5);
  });

  it('walks folders and skips hidden folders and node_modules', () => {
    const dir = tempWith({
      'a.css': '.a { color: red; }',
      'sub/b.css': '.b { color: red; }',
      'node_modules/c.css': '.c { transition: all 1s; }',
      '.hidden/d.css': '.d { transition: all 1s; }',
      'notes.txt': 'transition: all',
    });
    const { files, issues } = lintPaths([dir]);
    assert.equal(files.length, 2);
    assert.deepEqual(issues, []);
  });
});

describe('motion-lint: command line', () => {
  it('exits 0 and says PASSED for clean CSS', () => {
    const dir = tempWith({ 'ok.css': guarded('.a { transition: opacity 200ms; }') });
    const r = runCli([dir]);
    assert.equal(r.status, 0);
    assert.match(r.out, /RESULT: PASSED/);
  });

  it('exits 1 and explains how to fix an error', () => {
    const dir = tempWith({ 'bad.css': '.a { transition: all 200ms; }' });
    const r = runCli([dir]);
    assert.equal(r.status, 1);
    assert.match(r.out, /FAIL .*bad\.css:1 {2}ML001/);
    assert.match(r.out, /How to fix:/);
    assert.match(r.out, /RESULT: FAILED/);
  });

  it('passes with warnings, but --strict turns them into a failure', () => {
    const dir = tempWith({ 'warn.css': guarded('.a { transition: opacity 1500ms; }') });
    const normal = runCli([dir]);
    assert.equal(normal.status, 0);
    assert.match(normal.out, /WARN .*ML006/);
    const strict = runCli([dir, '--strict']);
    assert.equal(strict.status, 1);
    assert.match(strict.out, /FAIL .*ML006/);
  });

  it('prints valid JSON with --json', () => {
    const dir = tempWith({ 'bad.css': guarded('.a { transition: all 200ms; }') });
    const r = runCli([dir, '--json']);
    assert.equal(r.status, 1);
    const data = JSON.parse(r.out);
    assert.equal(data.tool, 'vyson-motion-lint');
    assert.equal(data.errors, 1);
    assert.equal(data.warnings, 0);
    assert.equal(data.issues[0].code, 'ML001');
  });

  it('exits 2 with usage text when no path is given', () => {
    const r = runCli([]);
    assert.equal(r.status, 2);
    assert.match(r.err, /Usage:/);
  });

  it('exits 2 for an unknown option', () => {
    const r = runCli(['somewhere', '--bogus']);
    assert.equal(r.status, 2);
    assert.match(r.err, /Unknown option: --bogus/);
  });

  it('exits 2 with a clear message for a path that does not exist', () => {
    const r = runCli([path.join(REPO_ROOT, 'no-such-folder-xyz')]);
    assert.equal(r.status, 2);
    assert.match(r.err, /Could not read the files/);
  });
});

describe('motion-lint: ML010 scroll-event listeners (scripts)', () => {
  it('flags addEventListener("scroll")', () => {
    assert.ok(lintJs("window.addEventListener('scroll', onScroll, { passive: true });").includes('ML010'));
    assert.ok(lintJs('document.addEventListener( "scroll", f)').includes('ML010'));
  });

  it('flags onscroll assignments', () => {
    assert.ok(lintJs('window.onscroll = () => {};').includes('ML010'));
  });

  it('does not flag IntersectionObserver, scrollend or other events', () => {
    assert.deepEqual(lintJs("new IntersectionObserver(f); el.addEventListener('scrollend', g); el.addEventListener('click', h);"), []);
  });

  it('ignores comments that only talk about scroll listeners', () => {
    assert.deepEqual(lintJs("// no addEventListener('scroll', x) here\n/* window.onscroll = 1 */\nlet a = 1;"), []);
  });

  it('reports the right line number', () => {
    const [issue] = lintScripts([{ file: 'a.js', js: "let a = 1;\n\nwindow.addEventListener('scroll', f);" }]);
    assert.equal(issue.line, 3);
  });

  it('finds listeners in inline <script> blocks of HTML files, with the right line', () => {
    const dir = tempWith({ 'index.html': "<!doctype html>\n<body>\n<script>\nwindow.addEventListener('scroll', f);\n</script>\n</body>\n" });
    const hit = lintPaths([dir]).issues.find((i) => i.code === 'ML010');
    assert.ok(hit);
    assert.equal(hit.line, 4);
  });

  it('does not read external script files named in src, and reads .js files in a folder', () => {
    const dir = tempWith({
      'index.html': '<script src="a.js"></script>',
      'a.js': "window.addEventListener('scroll', f);",
    });
    const { issues } = lintPaths([dir]);
    assert.equal(issues.filter((i) => i.code === 'ML010').length, 1);
  });
});

describe('motion-lint: ML011 hover movement on touch screens', () => {
  it('flags a hover transform that is not limited to devices that hover', () => {
    assert.ok(lint(guarded('.card:hover { transform: translateY(-4px); }')).includes('ML011'));
  });

  it('flags scale, translate and rotate too', () => {
    for (const prop of ['scale: 1.05', 'translate: 0 -4px', 'rotate: 3deg']) {
      assert.ok(lint(guarded(`.a:hover { ${prop}; }`)).includes('ML011'), prop);
    }
  });

  it('accepts the same rule inside (hover: hover) and (pointer: fine)', () => {
    assert.ok(!lint(guarded('@media (hover: hover) and (pointer: fine) { .card:hover { transform: translateY(-4px); } }')).includes('ML011'));
  });

  it('accepts (any-hover: hover) as a guard', () => {
    assert.ok(!lint('@media (any-hover: hover) { .a:hover { transform: scale(1.1); } }').includes('ML011'));
  });

  it('does not flag colour-only hover changes, or "transform: none"', () => {
    assert.ok(!lint('.a:hover { background-color: red; color: white; }').includes('ML011'));
    assert.ok(!lint('.a:hover { transform: none; }').includes('ML011'));
  });

  it('does not flag movement on :active (press feedback works on touch)', () => {
    assert.ok(!lint(guarded('.a:active { transform: scale(0.97); }')).includes('ML011'));
  });
});

describe('motion-lint: ML012 tiny interactive targets', () => {
  it('flags a button or link with an explicit size under 24px', () => {
    assert.ok(lint('button { height: 20px; }').includes('ML012'));
    assert.ok(lint('.nav a { min-width: 16px; }').includes('ML012'));
    assert.ok(lint('.menu-toggle { width: 1rem; height: 1rem; }').includes('ML012'));
  });

  it('accepts 24px and larger, including 44px', () => {
    assert.ok(!lint('button { height: 24px; }').includes('ML012'));
    assert.ok(!lint('.button { min-height: 44px; min-width: 44px; }').includes('ML012'));
  });

  it('understands variables and em/rem lengths', () => {
    assert.ok(lint(':root { --hit: 18px; } .btn { height: var(--hit); }').includes('ML012'));
    assert.ok(!lint('.btn { min-height: 2.75rem; }').includes('ML012'));
  });

  it('ignores things that are not controls, and decorative pseudo-elements of controls', () => {
    assert.ok(!lint('.divider { height: 2px; }').includes('ML012'));
    assert.ok(!lint('.link::after { height: 2px; }').includes('ML012'));
  });

  it('does not judge sizes it cannot work out (percentages, calc)', () => {
    assert.ok(!lint('button { height: 50%; } .btn { min-height: calc(1px + 1px); }').includes('ML012'));
  });
});

describe('motion-lint: ML013 aria-expanded wiring (HTML)', () => {
  const good = '<button type="button" aria-expanded="false" aria-controls="p1">Q</button><div id="p1">A</div>';

  it('accepts a button with aria-controls that points at an existing id', () => {
    assert.deepEqual(lintHtml(good), []);
  });

  it('flags a non-button element with aria-expanded', () => {
    assert.ok(lintHtml('<div aria-expanded="false" aria-controls="p1" tabindex="0">Q</div><div id="p1"></div>').includes('ML013'));
  });

  it('flags a missing aria-controls', () => {
    assert.ok(lintHtml('<button type="button" aria-expanded="false">Q</button>').includes('ML013'));
  });

  it('flags aria-controls that names an id which is not in the file', () => {
    assert.ok(lintHtml('<button type="button" aria-expanded="false" aria-controls="nope">Q</button>').includes('ML013'));
  });

  it('flags a button without type', () => {
    assert.ok(lintHtml('<button aria-expanded="false" aria-controls="p1">Q</button><div id="p1"></div>').includes('ML013'));
  });

  it('ignores commented-out markup and pages with no aria-expanded', () => {
    assert.deepEqual(lintHtml('<!-- <div aria-expanded="true"></div> --><p>Hello</p>'), []);
  });

  it('reports the line number of the control', () => {
    const [issue] = lintMarkup([{ file: 'a.html', html: '<p>one</p>\n<p>two</p>\n<button type="button" aria-expanded="false">Q</button>' }]);
    assert.equal(issue.line, 3);
  });
});

describe('motion-lint: ML014 content hidden by default', () => {
  it('flags content that is collapsed or transparent with no script-gate class', () => {
    assert.ok(lint('.answer { visibility: hidden; }').includes('ML014'));
    assert.ok(lint('.answer { opacity: 0; }').includes('ML014'));
    assert.ok(lint('.answer { grid-template-rows: 0fr; }').includes('ML014'));
    assert.ok(lint('.answer { max-height: 0; }').includes('ML014'));
  });

  it('flags it inside a media query too', () => {
    assert.ok(lint('@media (max-width: 800px) { .menu { visibility: hidden; } }').includes('ML014'));
  });

  it('accepts hiding that is switched on by a script-added class', () => {
    assert.ok(!lint('.js-panels .panel[data-open="false"] .panel-body { grid-template-rows: 0fr; }').includes('ML014'));
    assert.ok(!lint(guarded('.vy-js .vy-reveal { opacity: 0; }')).includes('ML014'));
    assert.ok(!lint('.js .reveal { opacity: 0; }').includes('ML014'));
  });

  it('accepts hidden states of pseudo-elements, interaction states and starting styles', () => {
    assert.ok(!lint('.card::after { opacity: 0; }').includes('ML014'));
    assert.ok(!lint('.tip:hover { opacity: 0; }').includes('ML014'));
    assert.ok(!lint('@starting-style { .dialog { opacity: 0; } }').includes('ML014'));
  });

  it('accepts visually-hidden helpers and keyframes', () => {
    assert.ok(!lint('.sr-only { opacity: 0; }').includes('ML014'));
    assert.ok(!lint(guarded('@keyframes fade { from { opacity: 0; } } .a { animation: fade 300ms both; }')).includes('ML014'));
  });

  it('does not flag "opacity: 0.5" or "visibility: visible"', () => {
    assert.deepEqual(lint('.a { opacity: 0.5; visibility: visible; }'), []);
  });
});

describe('motion-lint: it says clearly that it is a static check', () => {
  it('prints that no browser was opened, in text and in JSON', () => {
    const dir = tempWith({ 'ok.css': guarded('.a { transition: opacity 200ms; }') });
    const text = runCli([dir]);
    assert.match(text.out, /static checks only: no browser was opened/);
    assert.match(text.out, /Passing does not replace the browser checks/);
    const json = JSON.parse(runCli([dir, '--json']).out);
    assert.equal(json.kind, 'static');
    assert.match(json.note, /No browser was opened/);
  });
});