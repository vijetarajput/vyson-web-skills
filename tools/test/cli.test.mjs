import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { FIXTURES, TOOLS_DIR, makeTempDir, removeDir, makeSkill, makeProjectRepo, writeFiles } from './helpers.mjs';

const VALIDATE = path.join(TOOLS_DIR, 'validate-skills.mjs');
const LINKS = path.join(TOOLS_DIR, 'check-links.mjs');

function run(script, args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

describe('validate-skills command', () => {
  it('exits 0 and prints a success report for a valid skill', () => {
    const r = run(VALIDATE, [path.join(FIXTURES, 'spec', 'valid-minimal'), '--profile', 'spec']);
    assert.equal(r.code, 0);
    assert.match(r.out, /PASS\s+valid-minimal/);
    assert.match(r.out, /RESULT: PASSED\./);
  });

  it('exits 1 and prints errors, locations and fixes for invalid skills', () => {
    const r = run(VALIDATE, [path.join(FIXTURES, 'invalid'), '--profile', 'spec']);
    assert.equal(r.code, 1);
    assert.match(r.out, /FAIL\s+uppercase-name/);
    assert.match(r.out, /ERROR\s+VS013/);
    assert.match(r.out, /uppercase-name\/SKILL\.md:2/);
    assert.match(r.out, /How to fix:/);
    assert.match(r.out, /RESULT: FAILED\./);
  });

  it('prints a JSON report with --json', () => {
    const r = run(VALIDATE, [path.join(FIXTURES, 'invalid'), '--profile', 'spec', '--json']);
    assert.equal(r.code, 1);
    const report = JSON.parse(r.out);
    assert.equal(report.tool, 'vyson-validator');
    assert.equal(report.summary.ok, false);
    assert.ok(report.summary.failed > 0);
    const first = report.results.find((x) => x.name === 'name-mismatch');
    assert.equal(first.passed, false);
    assert.equal(first.issues[0].code, 'VS016');
    assert.ok(!first.issues[0].file.includes('\\'), 'paths use forward slashes');
  });

  it('can validate several paths in one run', () => {
    const r = run(VALIDATE, [path.join(FIXTURES, 'spec'), '--profile', 'spec']);
    assert.equal(r.code, 0);
    assert.match(r.out, /Checked: 2 skills/);
  });

  describe('warnings and --strict', () => {
    let tmp;
    let skill;
    before(() => {
      tmp = makeTempDir('vyson-cli-');
      skill = makeSkill(tmp, 'warn-only', { extraHeader: 'user-invocable: false' });
    });
    after(() => removeDir(tmp));

    it('passes (exit 0) with warnings by default', () => {
      const r = run(VALIDATE, [skill, '--profile', 'spec']);
      assert.equal(r.code, 0);
      assert.match(r.out, /WARN\s+warn-only/);
      assert.match(r.out, /RESULT: PASSED with 1 warning\./);
    });

    it('fails (exit 1) with --strict', () => {
      const r = run(VALIDATE, [skill, '--profile', 'spec', '--strict']);
      assert.equal(r.code, 1);
      assert.match(r.out, /RESULT: FAILED\./);
    });
  });

  describe('default folder and --repo-root', () => {
    it('passes with a note when skills/ exists but is empty', () => {
      const root = makeTempDir('vyson-cli-empty-');
      try {
        writeFiles(root, { 'skills/README.md': '# Skills\n' });
        const r = run(VALIDATE, ['--repo-root', root]);
        assert.equal(r.code, 0);
        assert.match(r.out, /No skills found in skills\/ yet/);
      } finally {
        removeDir(root);
      }
    });

    it('validates the skills/ folder of the given repository', () => {
      const repo = makeProjectRepo();
      try {
        const r = run(VALIDATE, ['--repo-root', repo.root]);
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /PASS\s+vyson-test-skill/);
      } finally {
        removeDir(repo.root);
      }
    });

    it('applies the project profile by default', () => {
      const repo = makeProjectRepo('plain-name');
      try {
        const r = run(VALIDATE, ['--repo-root', repo.root]);
        assert.equal(r.code, 1);
        assert.match(r.out, /VP001/);
      } finally {
        removeDir(repo.root);
      }
    });
  });

  describe('incorrect usage (exit 2)', () => {
    it('rejects an unknown option', () => {
      const r = run(VALIDATE, ['--nope']);
      assert.equal(r.code, 2);
      assert.match(r.err, /Unknown option: --nope/);
    });

    it('rejects an unknown profile', () => {
      const r = run(VALIDATE, ['--profile', 'wild']);
      assert.equal(r.code, 2);
      assert.match(r.err, /--profile must be/);
    });

    it('rejects an option that is missing its value', () => {
      assert.equal(run(VALIDATE, ['--profile']).code, 2);
    });

    it('rejects a path that does not exist', () => {
      const r = run(VALIDATE, [path.join(FIXTURES, 'does-not-exist')]);
      assert.equal(r.code, 2);
      assert.match(r.err, /Path not found/);
    });

    it('rejects an explicit folder that contains no skills', () => {
      const tmp = makeTempDir('vyson-cli-nothing-');
      try {
        const r = run(VALIDATE, [tmp]);
        assert.equal(r.code, 2);
        assert.match(r.err, /No skills found/);
      } finally {
        removeDir(tmp);
      }
    });
  });

  it('shows help and exits 0', () => {
    const r = run(VALIDATE, ['--help']);
    assert.equal(r.code, 0);
    assert.match(r.out, /Usage:/);
    assert.match(r.out, /--profile/);
  });
});

describe('check-links command', () => {
  let root;
  before(() => {
    root = makeTempDir('vyson-cli-links-');
    writeFiles(root, {
      'README.md': '[docs](docs/a.md) [web](https://example.com)\n',
      'docs/a.md': '[home](../README.md)\n',
    });
  });
  after(() => removeDir(root));

  it('exits 0 when all links work', () => {
    const r = run(LINKS, ['--repo-root', root]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /RESULT: PASSED\./);
    assert.match(r.out, /2 Markdown files checked/);
  });

  it('exits 1 and names the file and line of a broken link', () => {
    writeFiles(root, { 'docs/b.md': 'text\n[bad](missing.md)\n' });
    const r = run(LINKS, ['--repo-root', root]);
    assert.equal(r.code, 1);
    assert.match(r.out, /FAIL\s+docs\/b\.md/);
    assert.match(r.out, /VL001/);
    assert.match(r.out, /docs\/b\.md:2/);
  });

  it('skips tools/test/fixtures, which contains broken links on purpose', () => {
    const repo = makeTempDir('vyson-cli-fixtures-');
    try {
      writeFiles(repo, {
        'README.md': '# Fine\n',
        'tools/test/fixtures/bad.md': '[broken](nowhere.md)\n',
      });
      const r = run(LINKS, ['--repo-root', repo]);
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /1 Markdown file checked/);
    } finally {
      removeDir(repo);
    }
  });

  it('exits 2 for a path that does not exist', () => {
    const r = run(LINKS, [path.join(FIXTURES, 'does-not-exist')]);
    assert.equal(r.code, 2);
  });

  it('rejects unknown options', () => {
    assert.equal(run(LINKS, ['--nope']).code, 2);
  });
});
