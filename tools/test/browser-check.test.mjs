// Tests for skills/vyson-website-quality-engineering/scripts/browser-check.mjs
//
// Most tests run without a browser: they check the command line, the browser search and the
// functions that turn measurements into findings. The last group runs the tool for real against
// the two sites in the quality example. It is skipped when no Chrome or Edge is installed, or when
// the environment variable VYSON_SKIP_BROWSER_TESTS is set to 1. Those tests are browser tests; the
// rest of this file is not.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-website-quality-engineering', 'scripts', 'browser-check.mjs');
const { RULES, parseArgs, findBrowser, judgeLayout, judgeKeyboard } = await import(pathToFileURL(SCRIPT).href);
const EXAMPLE = path.join(REPO_ROOT, 'examples', 'vyson-website-quality-engineering');

describe('browser-check: command line', () => {
  it('reads a folder and the defaults', () => {
    const { options, problems } = parseArgs(['site']);
    assert.deepEqual(problems, []);
    assert.equal(options.target, 'site');
    assert.deepEqual(options.widths, [320, 390, 768, 1280, 1440]);
    assert.equal(options.tabStops, 50);
    assert.equal(options.allowRemote, false);
  });

  it('reads every option', () => {
    const { options, problems } = parseArgs(['site', '--page', 'about.html', '--widths', '390, 1280,390', '--screenshots', 'shots', '--browser', 'x', '--tab-stops', '10', '--wait', '100', '--allow-remote', '--strict', '--json']);
    assert.deepEqual(problems, []);
    assert.equal(options.page, 'about.html');
    assert.deepEqual(options.widths, [390, 1280]);
    assert.equal(options.screenshots, 'shots');
    assert.equal(options.browser, 'x');
    assert.equal(options.tabStops, 10);
    assert.equal(options.wait, 100);
    assert.ok(options.allowRemote && options.strict && options.json);
  });

  it('reports wrong use instead of guessing', () => {
    assert.ok(parseArgs([]).problems.length > 0);
    assert.ok(parseArgs(['site', '--widths', '10']).problems.length > 0);
    assert.ok(parseArgs(['site', '--widths', 'a,b']).problems.length > 0);
    assert.ok(parseArgs(['site', '--wait', '-1']).problems.length > 0);
    assert.ok(parseArgs(['site', '--page']).problems.length > 0);
    assert.ok(parseArgs(['site', '--nonsense']).problems.length > 0);
    assert.ok(parseArgs(['a', 'b']).problems.length > 0);
  });

  it('--help needs no folder', () => {
    const { options, problems } = parseArgs(['--help']);
    assert.ok(options.help);
    assert.deepEqual(problems, []);
  });

  it('exits 2 for wrong use, without starting a browser', () => {
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
    assert.equal(run().status, 2);
    assert.equal(run('--widths', '5', EXAMPLE).status, 2);
    assert.equal(run('--help').status, 0);
  });

  it('exits 3 and says "NOT PERFORMED" when no browser can be started', () => {
    const run = spawnSync(process.execPath, [SCRIPT, EXAMPLE, '--browser', path.join(REPO_ROOT, 'no-such-browser.exe')], { encoding: 'utf8' });
    assert.equal(run.status, 3);
    assert.match(run.stderr, /NOT PERFORMED/);
  });

  it('refuses a page on another website unless --allow-remote is given', () => {
    const fake = path.join(REPO_ROOT, 'package.json'); // any existing file passes the "browser exists" test
    const run = spawnSync(process.execPath, [SCRIPT, 'https://example.com/', '--browser', fake], { encoding: 'utf8' });
    assert.equal(run.status, 2);
    assert.match(run.stderr, /--allow-remote/);
  });
});

describe('browser-check: finding a browser', () => {
  it('uses CHROME_PATH first when it exists', () => {
    assert.equal(findBrowser({ env: { CHROME_PATH: '/x/chrome' }, platform: 'linux', exists: (p) => p === '/x/chrome' }), '/x/chrome');
  });

  it('ignores CHROME_PATH when the file is missing', () => {
    assert.equal(findBrowser({ env: { CHROME_PATH: '/x/chrome', PATH: '' }, platform: 'linux', exists: () => false }), null);
  });

  it('looks in the usual Windows places for Chrome and Edge', () => {
    const chrome = path.join('C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe');
    const edge = path.join('C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe');
    const env = { PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)' };
    assert.equal(findBrowser({ env, platform: 'win32', exists: (p) => p === chrome }), chrome);
    assert.equal(findBrowser({ env, platform: 'win32', exists: (p) => p === edge }), edge);
  });

  it('looks in the usual macOS places', () => {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    assert.equal(findBrowser({ env: {}, platform: 'darwin', exists: (p) => p === chrome }), chrome);
  });

  it('looks along PATH on Linux', () => {
    const found = findBrowser({ env: { PATH: ['/a', '/b'].join(path.delimiter) }, platform: 'linux', exists: (p) => p === path.join('/b', 'chromium') });
    assert.equal(found, path.join('/b', 'chromium'));
  });

  it('returns null when nothing is found', () => {
    assert.equal(findBrowser({ env: { PATH: '/a' }, platform: 'linux', exists: () => false }), null);
  });
});

describe('browser-check: turning measurements into findings', () => {
  const calm = { overflowX: false, scrollWidth: 390, offenders: [], controls: [{ label: 'Menu', w: 80, h: 48 }], broken: [], smallText: [], bodyPx: 16 };
  const codes = (found) => found.map((f) => f.code);

  it('a calm page has no findings', () => {
    assert.deepEqual(judgeLayout(390, calm, true), []);
  });

  it('BC004 sideways scrolling names the widest element', () => {
    const found = judgeLayout(390, { ...calm, overflowX: true, scrollWidth: 728, offenders: [{ tag: 'table', cls: 'wide', right: 728 }] }, true);
    assert.deepEqual(codes(found), ['BC004']);
    assert.match(found[0].message, /table class="wide"/);
    assert.equal(found[0].severity, 'error');
    assert.equal(found[0].width, 390);
  });

  it('BC005 under 24 is an error, BC006 under 44 is a warning, and the boundaries are exact', () => {
    const controls = [
      { label: 'tiny', w: 23, h: 40 },
      { label: 'small', w: 24, h: 24 },
      { label: 'edge', w: 44, h: 44 },
    ];
    const found = judgeLayout(390, { ...calm, controls }, true);
    const bc5 = found.find((f) => f.code === 'BC005');
    const bc6 = found.find((f) => f.code === 'BC006');
    assert.equal(bc5.severity, 'error');
    assert.match(bc5.message, /1 control under 24x24/);
    assert.equal(bc6.severity, 'warning');
    assert.match(bc6.message, /1 control under 44x44/);
  });

  it('control sizes and body size are not judged at desktop widths', () => {
    const found = judgeLayout(1280, { ...calm, controls: [{ label: 'tiny', w: 10, h: 10 }], bodyPx: 14 }, false);
    assert.deepEqual(found, []);
  });

  it('BC011 body text under 16px at touch widths', () => {
    assert.deepEqual(codes(judgeLayout(390, { ...calm, bodyPx: 14 }, true)), ['BC011']);
    assert.deepEqual(codes(judgeLayout(390, { ...calm, bodyPx: 16 }, true)), []);
  });

  it('BC009 broken images and BC010 small text at any width', () => {
    const found = judgeLayout(1280, { ...calm, broken: ['a.png'], smallText: [{ text: 'tiny print', px: 10 }] }, false);
    assert.deepEqual(codes(found).sort(), ['BC009', 'BC010']);
  });

  it('BC007 focus with no visible change, listed once per control', () => {
    const stop = { kind: 'el', id: 1, tag: 'a', label: 'Menu', visibleIndicator: false };
    const found = judgeKeyboard([stop, { ...stop, id: 2 }, { kind: 'el', id: 3, tag: 'a', label: 'Home', visibleIndicator: true }]);
    assert.deepEqual(codes(found), ['BC007']);
  });

  it('BC008 focus that does not move through three presses', () => {
    const stuck = { kind: 'el', id: 7, tag: 'input', label: 'Search', visibleIndicator: true };
    assert.deepEqual(codes(judgeKeyboard([stuck, stuck, stuck])), ['BC008']);
    assert.deepEqual(codes(judgeKeyboard([stuck, stuck, { ...stuck, id: 8 }])), []);
  });

  it('a clean walk has no findings', () => {
    const stops = [1, 2, 3].map((id) => ({ kind: 'el', id, tag: 'a', label: `L${id}`, visibleIndicator: true }));
    assert.deepEqual(judgeKeyboard(stops), []);
  });
});

describe('browser-check: the rule catalogue', () => {
  it('has 14 rules BC001 to BC014, each with a severity and a fix', () => {
    const codes = Object.keys(RULES);
    assert.equal(codes.length, 14);
    assert.deepEqual(codes, Array.from({ length: 14 }, (_, i) => `BC${String(i + 1).padStart(3, '0')}`));
    for (const [code, rule] of Object.entries(RULES)) {
      assert.ok(['error', 'warning'].includes(rule.severity), code);
      assert.ok(rule.fix.length > 20, code);
    }
  });

  it('tap targets follow the project decision: error under 24, warning under 44', () => {
    assert.equal(RULES.BC005.severity, 'error');
    assert.equal(RULES.BC006.severity, 'warning');
    assert.match(RULES.BC005.fix, /2\.5\.8/);
  });
});

describe('browser-check: the script itself', () => {
  const script = fs.readFileSync(SCRIPT, 'utf8');

  it('says it is one run in one browser, not a static check, and not a phone', () => {
    assert.match(script, /real-browser test/);
    assert.match(script, /Not tested: a real phone/);
  });

  it('imports only Node built-ins and downloads nothing', () => {
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, spec);
    // The word fetch() appears in advice text, so look for a call that is used as code.
    assert.doesNotMatch(script, /await fetch\(|= fetch\(|XMLHttpRequest|node:https\b|npm install|npx /);
  });

  it('serves on 127.0.0.1 only', () => {
    assert.match(script, /listen\(0, '127\.0\.0\.1'/);
  });
});

const skipReason = process.env.VYSON_SKIP_BROWSER_TESTS === '1' ? 'VYSON_SKIP_BROWSER_TESTS=1' : findBrowser() ? false : 'no Chrome or Edge found';

describe('browser-check: a real browser run on the example sites (browser test)', { skip: skipReason, concurrency: 1 }, () => {
  function run(site, ...extra) {
    const r = spawnSync(process.execPath, [SCRIPT, path.join(EXAMPLE, site), '--json', '--widths', '390,1280', '--wait', '400', ...extra], { encoding: 'utf8', timeout: 120_000 });
    assert.ok(r.stdout, `no output. stderr: ${r.stderr}`);
    return { status: r.status, data: JSON.parse(r.stdout) };
  }

  it('the repaired site passes, even in strict mode', () => {
    const { status, data } = run('site-after', '--strict');
    assert.equal(status, 0, JSON.stringify(data.issues));
    assert.equal(data.errors, 0);
    assert.equal(data.widths.length, 2);
    assert.equal(data.widths[0].overflowX, false);
  });

  it('the flawed site fails for the problems it was built to have', () => {
    const { status, data } = run('site-before');
    assert.equal(status, 1);
    const found = new Set(data.issues.map((i) => i.code));
    for (const code of ['BC004', 'BC005', 'BC007', 'BC013']) assert.ok(found.has(code), `${code} was not reported`);
    assert.equal(data.widths[0].overflowX, true);
  });

  it('the JSON output says what it is', () => {
    const { data } = run('site-after');
    assert.equal(data.kind, 'browser');
    assert.match(data.note, /Not a real phone/);
    assert.match(data.browser, /Chrome|Edg|Chromium/);
  });
});
