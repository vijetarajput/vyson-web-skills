// Tests for the skill vyson-frontend-development.
// They check that the skill passes our own validator and checker, and that its
// pieces (documentation, helper modules, example, evals) agree with each other.
// They read text and run small pure functions. They are static tests, not browser tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers.mjs';
import { validateSkill } from '../lib/validate-skill.mjs';
import { listMarkdownFiles, readText } from '../lib/fs-utils.mjs';

const NAME = 'vyson-frontend-development';
const SKILL_DIR = path.join(REPO_ROOT, 'skills', NAME);
const EXAMPLE_DIR = path.join(REPO_ROOT, 'examples', NAME);
const LINT = path.join(SKILL_DIR, 'scripts', 'frontend-lint.mjs');
const FETCH_STATE = path.join(SKILL_DIR, 'assets', 'fetch-state.js');
const FORM_HELPERS = path.join(SKILL_DIR, 'assets', 'form-helpers.js');
const { RULES } = await import(pathToFileURL(LINT).href);
const { fetchJson, describeError, createLatest, HttpError, TimeoutError, ParseError } = await import(pathToFileURL(FETCH_STATE).href);
const { messageFor, createSubmitGuard } = await import(pathToFileURL(FORM_HELPERS).href);

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

  it('declares the frontend pillar', () => {
    assert.match(read(SKILL_DIR, 'SKILL.md'), /vyson-pillar: "frontend"/);
  });
});

describe(`${NAME}: the skill and its neighbours have clear boundaries`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const description = /^description: (.*)$/m.exec(skillMd)[1];

  it('the description says when to use it and points design to vyson-premium-website-design', () => {
    assert.match(description, /Use when/);
    assert.match(description, /vyson-premium-website-design/);
    assert.match(description, /vyson-css-motion/);
    assert.ok(description.length <= 1024);
  });

  it('"When not to use" names the other four skills', () => {
    const notUse = skillMd.slice(skillMd.indexOf('## When not to use'), skillMd.indexOf('## The frontend contract'));
    for (const other of ['vyson-css-motion', 'vyson-premium-website-design', 'vyson-3d-interactive-web', 'vyson-website-quality-engineering']) {
      assert.ok(notUse.includes(other), other);
    }
  });

  it('does not link into another skill (a skill is installed on its own)', () => {
    for (const file of listMarkdownFiles(SKILL_DIR)) {
      assert.doesNotMatch(readText(file), /\]\([^)]*(?:vyson-css-motion|vyson-premium|vyson-3d|vyson-website)/, file);
    }
  });

  it('no skill document tells the agent to fetch instructions from the internet', () => {
    const everything = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    assert.doesNotMatch(everything, /\b(curl|wget|Invoke-WebRequest)\b/);
  });
});

describe(`${NAME}: the frontend contract is written down`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');

  it('SKILL.md states the five parts of the contract', () => {
    for (const part of ['It works without JavaScript where it can', 'Every asynchronous thing has four states', 'Visitors cannot inject code', 'It is keyboard and screen-reader usable', 'It is robust']) {
      assert.ok(skillMd.includes(part), part);
    }
  });

  it('forbids unmeasured claims and keeps static checks and browser tests apart', () => {
    assert.match(skillMd, /VYSON defaults, not measured results/);
    assert.match(skillMd, /\*\*This is a static check\.\*\*/);
    assert.match(skillMd, /browser test: not performed/);
    assert.match(skillMd, /Do not claim that something is "secure"/);
  });

  it('the tap-target rule matches the project decision (44 aim, 24 floor)', () => {
    assert.match(skillMd, /44 by 44 CSS pixels \(never under 24 by 24\)/);
  });

  it('every reference file is linked from SKILL.md, and no reference links to another file', () => {
    const refs = fs.readdirSync(path.join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'));
    assert.equal(refs.length, 7);
    for (const ref of refs) {
      assert.ok(skillMd.includes(`(references/${ref})`), `${ref} is not linked from SKILL.md`);
      assert.doesNotMatch(read(SKILL_DIR, 'references', ref), /\]\([^)]*\.md/, `${ref} links to another file`);
    }
  });
});

describe(`${NAME}: checker documentation matches the checker`, () => {
  const quality = read(SKILL_DIR, 'references', 'quality-and-security.md');

  it('every rule code is in the table with the same severity', () => {
    const lines = quality.split(/\r?\n/);
    for (const [code, rule] of Object.entries(RULES)) {
      const row = lines.find((l) => l.startsWith(`| ${code} |`));
      assert.ok(row, `${code} is missing from quality-and-security.md`);
      assert.match(row, new RegExp(`\\| ${rule.severity} \\|$`), `${code} should be marked "${rule.severity}"`);
    }
  });

  it('every rule code mentioned anywhere in the skill documentation exists', () => {
    const files = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const mentioned = new Set(files.match(/\bFD\d{3}\b/g) ?? []);
    assert.ok(mentioned.size > 0);
    for (const code of mentioned) assert.ok(RULES[code], `${code} is mentioned but does not exist`);
  });

  it('SKILL.md states the right number of rules', () => {
    const count = Object.keys(RULES).length;
    assert.match(read(SKILL_DIR, 'SKILL.md'), new RegExp(`${count} rules, FD001 to FD${String(count).padStart(3, '0')}`));
  });
});

describe(`${NAME}: fetch-state.js`, () => {
  const response = (status, body, { json } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: json ?? (async () => body),
  });

  it('returns the parsed body and asks for JSON', async () => {
    let seen;
    const data = await fetchJson('/a', { fetchImpl: async (url, init) => { seen = init; return response(200, { ok: true }); } });
    assert.deepEqual(data, { ok: true });
    assert.equal(seen.headers.Accept, 'application/json');
  });

  it('returns null for 204, and throws HttpError for 4xx and 5xx', async () => {
    assert.equal(await fetchJson('/a', { fetchImpl: async () => response(204) }), null);
    await assert.rejects(fetchJson('/a', { fetchImpl: async () => response(404) }), (e) => e instanceof HttpError && e.status === 404);
    await assert.rejects(fetchJson('/a', { fetchImpl: async () => response(500) }), (e) => e instanceof HttpError && e.status === 500);
  });

  it('throws ParseError when the body is not JSON', async () => {
    await assert.rejects(fetchJson('/a', { fetchImpl: async () => response(200, null, { json: async () => { throw new SyntaxError('bad'); } }) }), (e) => e instanceof ParseError);
  });

  it('throws TimeoutError when the server is too slow, and aborts the request', async () => {
    let aborted = false;
    const slow = (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => { aborted = true; reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
    });
    await assert.rejects(fetchJson('/a', { fetchImpl: slow, timeoutMs: 20 }), (e) => e instanceof TimeoutError && e.timeoutMs === 20);
    assert.equal(aborted, true);
  });

  it('can be cancelled by the caller, and lets a network failure through', async () => {
    const controller = new AbortController();
    const hang = (url, init) => new Promise((resolve, reject) => init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const promise = fetchJson('/a', { fetchImpl: hang, signal: controller.signal, timeoutMs: 5000 });
    controller.abort();
    await assert.rejects(promise, (e) => e.name === 'AbortError');
    await assert.rejects(fetchJson('/a', { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), TypeError);
  });

  it('describeError gives a plain sentence for each kind, and never raw error text', () => {
    assert.equal(describeError(Object.assign(new Error('x'), { name: 'AbortError' })), '');
    assert.match(describeError(new TimeoutError(10)), /longer than expected/);
    assert.match(describeError(new HttpError(404)), /could not find/);
    assert.match(describeError(new HttpError(403)), /access/);
    assert.match(describeError(new HttpError(429)), /Too many/);
    assert.match(describeError(new HttpError(503)), /server had a problem/);
    assert.match(describeError(new HttpError(418)), /code 418/);
    assert.match(describeError(new ParseError()), /could not be read/);
    assert.match(describeError(new TypeError('Failed to fetch')), /offline/);
    assert.match(describeError(new Error('secret internal detail')), /Something went wrong/);
    assert.doesNotMatch(describeError(new Error('secret internal detail')), /secret internal detail/);
  });

  it('createLatest says only the newest request is current', () => {
    const latest = createLatest();
    const first = latest.next();
    const second = latest.next();
    assert.equal(latest.isCurrent(first), false);
    assert.equal(latest.isCurrent(second), true);
  });

  it('never builds markup from data: no innerHTML in the helper modules', () => {
    for (const file of [FETCH_STATE, FORM_HELPERS]) {
      const code = fs.readFileSync(file, 'utf8').replace(/\/\/[^\n]*/g, '');
      assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML\(|document\.write|eval\(/, file);
    }
  });
});

describe(`${NAME}: form-helpers.js`, () => {
  const ok = { valid: true };
  const only = (flag) => ({ valid: false, [flag]: true });

  it('says nothing when the field is valid', () => {
    assert.equal(messageFor(ok, { label: 'Name' }), '');
    assert.equal(messageFor(undefined), '');
  });

  it('turns each kind of problem into a plain sentence that names the field', () => {
    assert.equal(messageFor(only('valueMissing'), { label: 'Your name' }), 'Your name is required.');
    assert.equal(messageFor(only('valueMissing'), { label: 'I agree', type: 'checkbox' }), 'Tick the box: I agree.');
    assert.equal(messageFor(only('valueMissing'), { label: 'Workshop', type: 'select-one' }), 'Choose an option for workshop.');
    assert.equal(messageFor(only('typeMismatch'), { label: 'Email', type: 'email' }), 'Enter an email address like name@example.com.');
    assert.equal(messageFor(only('tooShort'), { label: 'Message', minLength: 10 }), 'Message must be at least 10 characters.');
    assert.equal(messageFor(only('tooLong'), { label: 'Message', maxLength: 5 }), 'Message must be 5 characters or fewer.');
    assert.equal(messageFor(only('rangeUnderflow'), { label: 'Places', min: '1' }), 'Places must be 1 or more.');
    assert.equal(messageFor(only('rangeOverflow'), { label: 'Places', max: '4' }), 'Places must be 4 or less.');
    assert.equal(messageFor(only('patternMismatch'), { label: 'Code', title: 'Use six digits.' }), 'Use six digits.');
    assert.equal(messageFor(only('patternMismatch'), { label: 'Code' }), 'Code is not in the expected format.');
    assert.equal(messageFor(only('badInput'), { label: 'Places' }), 'Enter a number for places.');
    assert.equal(messageFor(only('customError'), { label: 'Code', customMessage: 'That code is used.' }), 'That code is used.');
    assert.match(messageFor({ valid: false }, { label: 'Thing' }), /Thing is not valid/);
  });

  it('createSubmitGuard ignores a second submit while the first is running', async () => {
    const guard = createSubmitGuard();
    let calls = 0;
    let release;
    const first = guard.run(() => new Promise((resolve) => { calls += 1; release = resolve; }));
    await Promise.resolve();
    assert.equal(guard.busy, true);
    const second = guard.run(() => { calls += 1; });
    assert.equal(second, first);
    release('done');
    assert.equal(await first, 'done');
    assert.equal(calls, 1);
    assert.equal(guard.busy, false);
    await guard.run(() => { calls += 1; });
    assert.equal(calls, 2);
  });

  it('createSubmitGuard becomes ready again after a failure', async () => {
    const guard = createSubmitGuard();
    await assert.rejects(guard.run(() => { throw new Error('nope'); }), /nope/);
    assert.equal(guard.busy, false);
  });
});

describe(`${NAME}: own checker is satisfied by the skill's own files`, () => {
  it('the starter files have no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(SKILL_DIR, 'assets'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the example site has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(EXAMPLE_DIR, 'result'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the checker passes its own source (with its documented suppressions)', () => {
    const { status, data } = lintCli(path.join(SKILL_DIR, 'scripts'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the example uses exact copies of the starter files', () => {
    assert.equal(read(EXAMPLE_DIR, 'result', 'fetch-state.js'), read(FETCH_STATE));
    assert.equal(read(EXAMPLE_DIR, 'result', 'form-helpers.js'), read(FORM_HELPERS));
  });
});

describe(`${NAME}: React, Next.js and Vue support`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const frameworks = read(SKILL_DIR, 'references', 'frameworks.md');
  const reactHook = read(SKILL_DIR, 'assets', 'use-fetch-state.react.js');
  const vueComposable = read(SKILL_DIR, 'assets', 'use-fetch-state.vue.js');

  it('the description and the steps name all four stacks, without forcing any', () => {
    for (const word of ['React', 'Next.js', 'Vue']) assert.ok(skillMd.includes(word), `${word} is not mentioned`);
    assert.match(frameworks, /Never add or switch one/);
  });

  it('frameworks.md is linked from SKILL.md and covers each stack and the usual traps', () => {
    assert.ok(skillMd.includes('(references/frameworks.md)'));
    for (const word of ['useEffect', "'use client'", 'v-html', 'dangerouslySetInnerHTML', 'onScopeDispose', 'NEXT_PUBLIC_', 'VITE_', 'runtimeConfig.public']) {
      assert.ok(frameworks.includes(word), `frameworks.md does not mention ${word}`);
    }
  });

  it('says exactly how the adapters were checked and what was not', () => {
    assert.match(frameworks, /not browser tests/);
    assert.match(frameworks, /not tried in a real page, in Nuxt or in Next\.js/);
    assert.match(frameworks, /Vue 3\.5\.45/);
  });

  it('both adapters cancel requests, reuse fetch-state.js and never write HTML', () => {
    for (const [name, text] of [['react', reactHook], ['vue', vueComposable]]) {
      assert.match(text, /from '\.\/fetch-state\.js'/, `${name}: does not reuse fetch-state.js`);
      assert.match(text, /AbortController/, `${name}: cannot cancel`);
      assert.match(text, /describeError/, `${name}: does not use polite messages`);
      assert.doesNotMatch(text, /innerHTML|v-html|dangerouslySetInnerHTML|https?:\/\//, `${name}: unsafe or remote`);
    }
    assert.match(reactHook, /return \(\) => controller\.abort\(\)/);
    assert.match(vueComposable, /onScopeDispose/);
  });

  it('the Vue and React adapter checks exist and are not part of the dependency-free test run', () => {
    const dir = path.join(REPO_ROOT, 'tools', 'framework-checks');
    for (const file of ['run.mjs', 'vue-check.mjs', 'react-check.mjs']) assert.ok(fs.existsSync(path.join(dir, file)), `${file} is missing`);
    assert.match(read(dir, 'run.mjs'), /DISABLE_TELEMETRY/);
    assert.doesNotMatch(read(REPO_ROOT, 'package.json'), /"(?:vue|react)"/, 'the repository must not depend on vue or react');
  });
});

describe(`${NAME}: the example`, () => {
  const html = read(EXAMPLE_DIR, 'result', 'index.html');
  const app = read(EXAMPLE_DIR, 'result', 'app.js');

  it('has the files an example needs', () => {
    for (const file of ['prompt.md', 'README.md', 'CREDITS.md', 'preview.png', 'result/index.html', 'result/app.js', 'result/styles.css', 'result/workshops.json', 'result/fetch-state.js', 'result/form-helpers.js']) {
      assert.ok(fs.existsSync(path.join(EXAMPLE_DIR, file)), file);
    }
  });

  it('the prompt names the skill and the made-up programme', () => {
    const prompt = read(EXAMPLE_DIR, 'prompt.md');
    assert.match(prompt, /vyson-frontend-development/);
    assert.match(prompt, /Fernside Workshops/);
  });

  it('the page has one h1, a skip link and labelled form fields, and a no-script message for the list', () => {
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, /<a class="skip-link" href="#main">/);
    assert.match(html, /<noscript>/);
    assert.match(html, /<form id="signup"[^>]*method="post"/);
    assert.match(html, /<label for="email">/);
    assert.match(html, /autocomplete="email"/);
  });

  it('the data is shown with text, not markup, and nothing is sent anywhere', () => {
    assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML|document\.write/);
    assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//);
    assert.doesNotMatch(app, /https?:\/\//);
    assert.match(html, /nothing is sent anywhere/i);
  });

  it('the workshop data is valid JSON with the fields the page reads', () => {
    const list = JSON.parse(read(EXAMPLE_DIR, 'result', 'workshops.json'));
    assert.ok(Array.isArray(list) && list.length >= 5);
    for (const item of list) assert.ok(item.id && item.title, JSON.stringify(item));
  });

  it('says clearly that the programme is made up', () => {
    assert.match(read(EXAMPLE_DIR, 'CREDITS.md'), /Made-up names for a demo/);
  });

  it('the example README is honest: it says what was not checked and that it is not an independent test', () => {
    const readme = read(EXAMPLE_DIR, 'README.md');
    assert.match(readme, /## What was not checked/);
    assert.match(readme, /not an independent test/);
    assert.match(readme, /A real phone/);
    assert.match(readme, /A screen reader/);
  });
});

describe(`${NAME}: eval file`, () => {
  const evals = JSON.parse(read(REPO_ROOT, 'evals', NAME, 'evals.json'));

  it('has both "should activate" and "should not activate" cases', () => {
    assert.ok(evals.cases.filter((c) => c.should_activate).length >= 4);
    assert.ok(evals.cases.filter((c) => !c.should_activate).length >= 3);
  });

  it('includes the cases that mark the boundary with design, motion and 3D', () => {
    const prompts = evals.cases.filter((c) => !c.should_activate).map((c) => c.prompt).join('\n');
    assert.match(prompts, /premium/);
    assert.match(prompts, /fade-in animation/);
    assert.match(prompts, /Three\.js/);
  });

  it('every case has checkable statements', () => {
    for (const c of evals.cases) assert.ok(c.must_be_true.length >= 1, `case ${c.id}`);
  });
});
