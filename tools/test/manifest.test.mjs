// Tests for skills-manifest.json: the generated list of every skill file,
// its size and its sha256.

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fingerprint } from '../lib/content-hash.mjs';
import { PROMPT_ORDER } from '../lib/install-skills.mjs';
import {
  MANIFEST_NAME,
  buildManifest,
  compareWithManifest,
  isSafeRelativePath,
  isValidSkillName,
  manifestToText,
  validateManifest,
} from '../lib/manifest.mjs';
import { REPO_ROOT, makeSkill, makeTempDir, removeDir } from './helpers.mjs';

const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const MANIFEST_PATH = path.join(REPO_ROOT, MANIFEST_NAME);

function committedManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

describe('the committed skills-manifest.json', () => {
  it('exists and has a valid shape', () => {
    assert.ok(fs.existsSync(MANIFEST_PATH), 'skills-manifest.json is missing. Run: npm run build:manifest');
    const result = validateManifest(committedManifest());
    assert.equal(result.ok, true, result.error);
  });

  it('is up to date with the skills folder (run npm run build:manifest if this fails)', () => {
    const expected = manifestToText(buildManifest(SKILLS_DIR, { order: PROMPT_ORDER }));
    const actual = fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/\r\n/g, '\n');
    assert.equal(actual, expected);
  });

  it('lists exactly the five skills, in the five-prompt order', () => {
    assert.deepEqual(committedManifest().order, PROMPT_ORDER);
    assert.deepEqual(Object.keys(committedManifest().skills).sort(), [...PROMPT_ORDER].sort());
  });

  it('lists SKILL.md and the workflow and prompt files of every skill', () => {
    for (const [name, skill] of Object.entries(committedManifest().skills)) {
      const paths = skill.files.map((f) => f.path);
      for (const needed of ['SKILL.md', 'references/workflow.md', 'references/prompt.md']) {
        assert.ok(paths.includes(needed), `${name} does not list ${needed}`);
      }
    }
  });

  it('matches every file on disk (nothing missing, changed or extra)', () => {
    const diff = compareWithManifest(SKILLS_DIR, committedManifest());
    assert.deepEqual(diff, { missing: [], changed: [], extra: [] });
  });

  it('carries no date, user name or machine path', () => {
    const text = fs.readFileSync(MANIFEST_PATH, 'utf8');
    assert.doesNotMatch(text, /\b[A-Za-z]:\\/);
    assert.doesNotMatch(text, /\b[A-Za-z]:\/(?!\/)/);
    assert.doesNotMatch(text, /\b20\d\d-\d\d-\d\d\b/);
  });

  it('is what git would serve: line endings in the file are not part of the fingerprint', () => {
    const lf = Buffer.from('# Title\n\nText\n');
    const crlf = Buffer.from('# Title\r\n\r\nText\r\n');
    assert.deepEqual(fingerprint(lf, 'a.md'), fingerprint(crlf, 'a.md'));
    // Binary-looking extensions are left alone.
    assert.notEqual(fingerprint(lf, 'a.bin').sha256, fingerprint(crlf, 'a.bin').sha256);
  });
});

describe('buildManifest', () => {
  let root;
  before(() => {
    root = makeTempDir('vyson-manifest-');
    makeSkill(root, 'vyson-b', { files: { 'references/x.md': 'x\n', 'scripts/s.mjs': 'export {}\n' } });
    makeSkill(root, 'vyson-a', { files: { 'NOTICE.md': 'n\n' } });
    fs.mkdirSync(path.join(root, 'not-a-skill'), { recursive: true });
    fs.writeFileSync(path.join(root, 'not-a-skill', 'readme.md'), 'no SKILL.md here\n');
    fs.writeFileSync(path.join(root, 'vyson-a', '.DS_Store'), 'junk');
  });
  after(() => removeDir(root));

  it('lists only folders that contain SKILL.md, with sorted files and ignored junk', () => {
    const m = buildManifest(root);
    assert.deepEqual(Object.keys(m.skills), ['vyson-a', 'vyson-b']);
    assert.deepEqual(m.skills['vyson-a'].files.map((f) => f.path), ['NOTICE.md', 'SKILL.md']);
    assert.deepEqual(m.skills['vyson-b'].files.map((f) => f.path), ['SKILL.md', 'references/x.md', 'scripts/s.mjs']);
  });

  it('puts the requested order first and is deterministic', () => {
    const a = manifestToText(buildManifest(root, { order: ['vyson-b'] }));
    const b = manifestToText(buildManifest(root, { order: ['vyson-b'] }));
    assert.equal(a, b);
    assert.deepEqual(JSON.parse(a).order, ['vyson-b', 'vyson-a']);
  });

  it('gives a CRLF copy and an LF copy the same fingerprints', () => {
    const lfRoot = makeTempDir('vyson-manifest-lf-');
    const crlfRoot = makeTempDir('vyson-manifest-crlf-');
    try {
      makeSkill(lfRoot, 'vyson-a', { body: 'one\ntwo\n' });
      makeSkill(crlfRoot, 'vyson-a', { body: 'one\ntwo\n' });
      const file = path.join(crlfRoot, 'vyson-a', 'SKILL.md');
      fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
      assert.equal(manifestToText(buildManifest(lfRoot)), manifestToText(buildManifest(crlfRoot)));
    } finally {
      removeDir(lfRoot);
      removeDir(crlfRoot);
    }
  });
});

describe('validateManifest', () => {
  const good = () => ({
    schema: 1,
    order: ['vyson-a'],
    skills: { 'vyson-a': { files: [{ path: 'SKILL.md', bytes: 3, sha256: 'a'.repeat(64) }] } },
  });
  const mutate = (fn) => {
    const m = good();
    fn(m);
    return validateManifest(m);
  };

  it('accepts a well-formed manifest', () => {
    assert.equal(validateManifest(good()).ok, true);
  });

  it('rejects things that are not manifests', () => {
    for (const bad of [null, 'text', 42, [], {}]) assert.equal(validateManifest(bad).ok, false);
  });

  it('rejects an unsupported schema, a missing order and no skills', () => {
    assert.equal(mutate((m) => (m.schema = 2)).ok, false);
    assert.equal(mutate((m) => delete m.order).ok, false);
    assert.equal(mutate((m) => (m.skills = {})).ok, false);
    assert.equal(mutate((m) => (m.order = ['vyson-other'])).ok, false);
  });

  it('rejects unsafe file paths (traversal, absolute, backslash, drive letter, empty parts)', () => {
    for (const p of ['../evil.md', 'a/../../evil.md', '/etc/passwd', 'a\\b.md', 'C:evil.md', 'a//b.md', './a.md', '']) {
      const r = mutate((m) => (m.skills['vyson-a'].files.push({ path: p, bytes: 1, sha256: 'b'.repeat(64) })));
      assert.equal(r.ok, false, `accepted path ${JSON.stringify(p)}`);
    }
  });

  it('rejects bad names, sizes, hashes, duplicates and a missing SKILL.md', () => {
    assert.equal(mutate((m) => (m.skills['Bad Name'] = m.skills['vyson-a'])).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].bytes = -1)).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].bytes = 1.5)).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].bytes = 999_999_999)).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].sha256 = 'xyz')).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].sha256 = 'A'.repeat(64))).ok, false);
    assert.equal(mutate((m) => m.skills['vyson-a'].files.push({ ...m.skills['vyson-a'].files[0] })).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files[0].path = 'README.md')).ok, false);
    assert.equal(mutate((m) => (m.skills['vyson-a'].files = [])).ok, false);
  });

  it('knows valid and invalid skill names and paths', () => {
    assert.equal(isValidSkillName('vyson-css-motion'), true);
    for (const n of ['', 'A', 'a--b', '-a', 'a-', '../a', 'a/b', 'a b', 'a'.repeat(65), 7]) {
      assert.equal(isValidSkillName(n), false, `accepted ${String(n)}`);
    }
    assert.equal(isSafeRelativePath('references/a.md'), true);
    assert.equal(isSafeRelativePath('..'), false);
  });
});

describe('compareWithManifest', () => {
  let root;
  let manifest;
  before(() => {
    root = makeTempDir('vyson-compare-');
    makeSkill(root, 'vyson-a', { files: { 'references/r.md': 'r\n' } });
    manifest = buildManifest(root);
  });
  after(() => removeDir(root));

  it('is clean for an untouched folder', () => {
    assert.deepEqual(compareWithManifest(root, manifest), { missing: [], changed: [], extra: [] });
  });

  it('reports missing, changed and extra files', () => {
    fs.rmSync(path.join(root, 'vyson-a', 'references', 'r.md'));
    fs.appendFileSync(path.join(root, 'vyson-a', 'SKILL.md'), 'edited\n');
    fs.writeFileSync(path.join(root, 'vyson-a', 'new.md'), 'new\n');
    const diff = compareWithManifest(root, manifest);
    assert.deepEqual(diff.missing, ['vyson-a/references/r.md']);
    assert.deepEqual(diff.changed, ['vyson-a/SKILL.md']);
    assert.deepEqual(diff.extra, ['vyson-a/new.md']);
  });

  it('reports a skill folder that is gone as all missing', () => {
    const diff = compareWithManifest(path.join(root, 'nowhere'), manifest);
    assert.ok(diff.missing.includes('vyson-a/SKILL.md'));
  });
});

describe('tools/build-manifest.mjs', () => {
  const script = path.join(REPO_ROOT, 'tools', 'build-manifest.mjs');

  it('--check passes on the repository', () => {
    const out = execFileSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    assert.match(out, /up to date/);
  });

  it('rejects an unknown option with exit code 2 and a clear message', () => {
    const r = spawnSync(process.execPath, [script, '--bogus'], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Unknown option: --bogus/);
  });
});
