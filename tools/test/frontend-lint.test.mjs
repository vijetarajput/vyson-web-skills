// Tests for skills/vyson-frontend-development/scripts/frontend-lint.mjs
// Each test gives the checker a tiny file with exactly the problem it wants to check.
// frontend-lint is a static checker, so these tests only check what it reads in text.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const SCRIPT = path.join(REPO_ROOT, 'skills', 'vyson-frontend-development', 'scripts', 'frontend-lint.mjs');
const { RULES, lintSources, lintPaths } = await import(pathToFileURL(SCRIPT).href);

const temps = [];
after(() => temps.forEach(removeDir));

const codes = (sources) => lintSources(sources).map((i) => i.code);
const js = (text) => codes([{ file: 'app.js', text }]);
const html = (text) => codes([{ file: 'index.html', text }]);

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head><title>Page</title><script src="app.js" defer></script></head>
<body>
  <form method="post" action="/join">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="email">
    <button type="submit">Join</button>
  </form>
</body>
</html>
`;
const GOOD_JS = `
async function load() {
  try {
    const response = await fetch('/data.json');
    if (!response.ok) throw new Error('bad status');
    return await response.json();
  } catch (error) {
    return null;
  }
}
`;

describe('frontend-lint: clean files', () => {
  it('have no issues', () => {
    assert.deepEqual(lintSources([{ file: 'index.html', text: GOOD_HTML }, { file: 'app.js', text: GOOD_JS }]), []);
  });
});

describe('frontend-lint: one test for every rule', () => {
  it('FD001 a field with no label', () => {
    assert.ok(html('<form><input type="text" name="q"></form>').includes('FD001'));
    assert.ok(!html('<label for="q">Search</label><input id="q" type="text" autocomplete="off">').includes('FD001'));
    assert.ok(!html('<label>Search <input type="text"></label>').includes('FD001'));
    assert.ok(!html('<input type="text" aria-label="Search">').includes('FD001'));
    assert.ok(!html('<input type="hidden" name="t">').includes('FD001'));
  });

  it('FD002 HTML built from a variable, but not from a plain string', () => {
    assert.ok(js('el.innerHTML = "<b>" + name + "</b>";').includes('FD002'));
    assert.ok(js('el.innerHTML = `<b>${name}</b>`;').includes('FD002'));
    assert.ok(js("el.insertAdjacentHTML('beforeend', html);").includes('FD002'));
    assert.ok(!js("el.innerHTML = '';").includes('FD002'));
    assert.ok(!js("el.innerHTML = '<b>fixed</b>';").includes('FD002'));
  });

  it('FD002 can be suppressed with a reason on the same or the line above', () => {
    assert.ok(!js('el.innerHTML = safe(name); // vyson-ok: FD002 escaped by safe()').includes('FD002'));
    assert.ok(!js('// vyson-ok: FD002 reviewed\nel.innerHTML = safe(name);').includes('FD002'));
    assert.ok(js('// vyson-ok: FD009 wrong code\nel.innerHTML = safe(name);').includes('FD002'));
  });

  it('FD003 eval, new Function, a string timer and a javascript: link', () => {
    assert.ok(js('eval(code);').includes('FD003'));
    assert.ok(js('const f = new Function("return 1");').includes('FD003'));
    assert.ok(js('setTimeout("run()", 10);').includes('FD003'));
    assert.ok(html('<a href="javascript:run()">Go</a>').includes('FD003'));
    assert.ok(!js('setTimeout(run, 10);').includes('FD003'));
  });

  it('FD004 a secret in client code', () => {
    assert.ok(js("const apiKey = 'abcd1234efgh5678ijkl';").includes('FD004'));
    assert.ok(js("const k = 'sk_live_abcdefghij123456';").includes('FD004'));
    assert.ok(!js("const apiKey = 'short';").includes('FD004'));
  });

  it('FD005 and FD006 fetch with no status check and no error handling', () => {
    const found = js("fetch('/a').then((r) => r.json()).then(show);");
    assert.ok(found.includes('FD005'));
    assert.ok(found.includes('FD006'));
    assert.ok(!js(GOOD_JS).includes('FD005'));
    assert.ok(!js(GOOD_JS).includes('FD006'));
  });

  it('FD007 a click handler on a div, FD008 an inline handler on a button', () => {
    assert.ok(html('<div onclick="go()">Go</div>').includes('FD007'));
    assert.ok(!html('<div onclick="go()" role="button" tabindex="0">Go</div>').includes('FD007'));
    assert.ok(html('<button onclick="go()">Go</button>').includes('FD008'));
  });

  it('FD009 a button with no name', () => {
    assert.ok(html('<button><svg></svg></button>').includes('FD009'));
    assert.ok(!html('<button aria-label="Close"><svg></svg></button>').includes('FD009'));
    assert.ok(!html('<button>Close</button>').includes('FD009'));
  });

  it('FD010 a blocking script in the head, FD011 a script from another website', () => {
    assert.ok(html('<html><head><script src="app.js"></script></head><body></body></html>').includes('FD010'));
    assert.ok(!html('<html><head><script src="app.js" defer></script></head><body></body></html>').includes('FD010'));
    assert.ok(!html('<html><head><script type="module" src="app.js"></script></head><body></body></html>').includes('FD010'));
    assert.ok(html('<script src="https://cdn.example.com/x.js"></script>').includes('FD011'));
    assert.ok(!html('<script src="https://cdn.example.com/x.js" integrity="sha384-abc"></script>').includes('FD011'));
  });

  it('FD012 a personal-data field with no autocomplete', () => {
    assert.ok(html('<label for="e">E</label><input id="e" type="email" name="email">').includes('FD012'));
    assert.ok(!html('<label for="e">E</label><input id="e" type="email" name="email" autocomplete="email">').includes('FD012'));
  });

  it('FD013 console.log and debugger, but not in a command-line script', () => {
    assert.ok(js('console.log(x);').includes('FD013'));
    assert.ok(js('debugger;').includes('FD013'));
    assert.ok(!js('#!/usr/bin/env node\nconsole.log(x);').includes('FD013'));
    assert.ok(!js('// console.log(x)\nconst a = 1;').includes('FD013'));
  });

  it('FD014 a token kept in localStorage', () => {
    assert.ok(js("localStorage.setItem('authToken', t);").includes('FD014'));
    assert.ok(!js("localStorage.setItem('theme', 'dark');").includes('FD014'));
  });

  it('FD015 a password form that does not use POST', () => {
    const field = '<label for="p">Password</label><input id="p" type="password" autocomplete="current-password">';
    assert.ok(html(`<form>${field}</form>`).includes('FD015'));
    assert.ok(html(`<form method="get">${field}</form>`).includes('FD015'));
    assert.ok(!html(`<form method="post">${field}</form>`).includes('FD015'));
  });

  it('every rule has a fix, and the catalogue has 15 rules', () => {
    assert.equal(Object.keys(RULES).length, 15);
    for (const [code, rule] of Object.entries(RULES)) {
      assert.ok(['error', 'warning'].includes(rule.severity), code);
      assert.ok(rule.fix.length > 20, code);
    }
  });
});

describe('frontend-lint: it reads code, not comments or markup comments', () => {
  it('a bad pattern in an HTML comment does not count', () => {
    assert.ok(!html('<!-- <input type="text"> <button onclick="x()"></button> --><p>Hi</p>').includes('FD001'));
  });

  it('inline scripts in HTML are checked, and external ones are not read twice', () => {
    assert.ok(html('<script>el.innerHTML = "<i>" + x + "</i>";</script>').includes('FD002'));
  });
});

describe('frontend-lint: Vue single-file components', () => {
  const vue = (text) => codes([{ file: 'Card.vue', text }]);

  it('v-html is flagged as FD002, and a reviewed use can be silenced', () => {
    assert.deepEqual(vue('<template>\n  <div v-html="bio"></div>\n</template>'), ['FD002']);
    assert.deepEqual(vue('<template>\n  <!-- vyson-ok: FD002 bio is sanitised on the server -->\n  <div v-html="bio"></div>\n</template>'), []);
  });

  it('the <script> block is checked, and the template text is not read as script', () => {
    assert.ok(vue('<script setup>\nconst el = document.body;\nel.innerHTML = "<b>" + name + "</b>";\n</script>').includes('FD002'));
    assert.deepEqual(vue('<template>\n  <p>{{ eval }} and fetch( in prose</p>\n</template>'), []);
  });

  it('is found when a folder is scanned, and the issue shows the line', () => {
    const dir = makeTempDir('vue');
    try {
      writeFiles(dir, { 'src/Card.vue': '<template>\n  <div v-html="bio"></div>\n</template>\n' });
      const found = lintPaths([dir]);
      assert.equal(found.files.length, 1);
      assert.equal(found.issues[0].line, 2);
    } finally {
      removeDir(dir);
    }
  });
});

describe('frontend-lint: folders and the command line', () => {
  function site(files) {
    const root = makeTempDir('vyson-fd-');
    temps.push(root);
    writeFiles(root, files);
    return root;
  }
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

  it('lintPaths reads html and script files and skips node_modules', () => {
    const root = site({ 'index.html': GOOD_HTML, 'app.js': GOOD_JS, 'node_modules/x/bad.js': 'eval(1);', 'notes.txt': 'eval(1)' });
    const result = lintPaths([root]);
    assert.deepEqual(result.issues, []);
    assert.equal(result.files.length, 2);
  });

  it('exits 0 for clean files, 1 for errors and 2 for wrong use', () => {
    assert.equal(run(site({ 'index.html': GOOD_HTML, 'app.js': GOOD_JS })).status, 0);
    assert.equal(run(site({ 'app.js': 'eval(x);' })).status, 1);
    assert.equal(run().status, 2);
    assert.equal(run('--nonsense').status, 2);
    assert.equal(run('--help').status, 0);
  });

  it('--strict fails on a warning and --json prints data', () => {
    const warn = site({ 'app.js': 'console.log(1);' });
    assert.equal(run(warn).status, 0);
    const strict = run(warn, '--strict', '--json');
    assert.equal(strict.status, 1);
    assert.ok(JSON.parse(strict.stdout).issues.some((i) => i.code === 'FD013'));
  });

  it('says it is a static check in its output', () => {
    assert.match(run(site({ 'app.js': GOOD_JS })).stdout, /static/i);
  });
});

describe('frontend-lint: the checker itself', () => {
  const script = fs.readFileSync(SCRIPT, 'utf8');

  it('says it is a static checker and uses no network', () => {
    assert.match(script, /IT IS A STATIC CHECKER/);
    assert.doesNotMatch(script, /node:(http|https|net|dgram|child_process)|XMLHttpRequest/);
  });

  it('imports only Node built-ins', () => {
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, spec);
  });
});
