import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSkill } from '../lib/validate-skill.mjs';
import { validateEvalsData } from '../lib/rules-project.mjs';
import { makeProjectRepo, makeSkill, removeDir, writeFiles, validEvals, codesOf } from './helpers.mjs';

const project = (repo, dir = repo.skillDir) => validateSkill(dir, { profile: 'project', repoRoot: repo.root });

/** Run `fn` with a fresh temporary repository and always clean it up. */
function withRepo(fn, args = []) {
  const repo = makeProjectRepo(...args);
  try {
    fn(repo);
  } finally {
    removeDir(repo.root);
  }
}

describe('VYSON project rules', () => {
  it('accepts a complete project skill', () => {
    withRepo((repo) => assert.deepEqual(project(repo).issues, []));
  });

  it('does not apply project rules in the spec profile', () => {
    const repo = makeProjectRepo('not-vyson');
    try {
      const r = validateSkill(repo.skillDir, { profile: 'spec', repoRoot: repo.root });
      assert.deepEqual(codesOf(r).filter((c) => c.startsWith('VP')), []);
    } finally {
      removeDir(repo.root);
    }
  });

  it('requires the vyson- prefix (VP001)', () => {
    const repo = makeProjectRepo('css-motion');
    try {
      assert.ok(codesOf(project(repo), 'error').includes('VP001'));
    } finally {
      removeDir(repo.root);
    }
  });

  it('rejects names that are only the prefix or have bad characters (VP001)', () => {
    for (const bad of ['vyson-', 'vyson--x', 'Vyson-x']) {
      const repo = makeProjectRepo('vyson-ok');
      try {
        const dir = makeSkill(repo.skillsDir, bad, {
          extraHeader: 'metadata:\n  vyson-pillar: "design"\n  vyson-version: "0.1.0"',
        });
        assert.ok(codesOf(project(repo, dir), 'error').includes('VP001'), bad);
      } finally {
        removeDir(repo.root);
      }
    }
  });

  it('requires a valid pillar (VP002)', () => {
    withRepo((repo) => {
      const skill = path.join(repo.skillDir, 'SKILL.md');
      fs.writeFileSync(skill, fs.readFileSync(skill, 'utf8').replace('"design"', '"cooking"'));
      const r = project(repo);
      assert.ok(codesOf(r, 'error').includes('VP002'));
      assert.match(r.issues.find((i) => i.code === 'VP002').message, /design, motion, 3d, frontend, quality/);
    });
  });

  it('requires a version like 0.1.0 (VP003)', () => {
    for (const replacement of ['"1.0"', '"latest"']) {
      withRepo((repo) => {
        const skill = path.join(repo.skillDir, 'SKILL.md');
        fs.writeFileSync(skill, fs.readFileSync(skill, 'utf8').replace('"0.1.0"', replacement));
        assert.ok(codesOf(project(repo), 'error').includes('VP003'), replacement);
      });
    }
  });

  it('requires an example prompt (VP010)', () => {
    withRepo((repo) => {
      fs.rmSync(path.join(repo.root, 'examples'), { recursive: true });
      assert.deepEqual(codesOf(project(repo), 'error'), ['VP010']);
    });
  });

  it('requires an eval file (VP011)', () => {
    withRepo((repo) => {
      fs.rmSync(path.join(repo.root, 'evals'), { recursive: true });
      assert.deepEqual(codesOf(project(repo), 'error'), ['VP011']);
    });
  });

  it('rejects an eval file that is not valid JSON (VP012)', () => {
    withRepo((repo) => {
      writeFiles(repo.root, { [`evals/${repo.name}/evals.json`]: '{ "skill": ' });
      assert.deepEqual(codesOf(project(repo), 'error'), ['VP012']);
    });
  });

  it('rejects an eval file with the wrong structure (VP013)', () => {
    withRepo((repo) => {
      writeFiles(repo.root, { [`evals/${repo.name}/evals.json`]: JSON.stringify({ skill: 'other', cases: [] }) });
      assert.ok(codesOf(project(repo), 'error').includes('VP013'));
    });
  });

  it('requires a case where the skill should NOT activate (VP014)', () => {
    withRepo((repo) => {
      const data = validEvals(repo.name);
      data.cases = data.cases.filter((c) => c.should_activate);
      writeFiles(repo.root, { [`evals/${repo.name}/evals.json`]: JSON.stringify(data) });
      assert.deepEqual(codesOf(project(repo), 'error'), ['VP014']);
    });
  });

  describe('motion and 3D safety contract (VP020)', () => {
    const contract = '# Motion\n\n## Contract\n\nPerformance budget: transform and opacity only.\nWhen prefers-reduced-motion is set, disable movement.\nOn mobile, show a static image.\n';

    for (const pillar of ['motion', '3d']) {
      it(`fails a ${pillar} skill that has no contract`, () => {
        withRepo((repo) => {
          const r = project(repo);
          assert.ok(codesOf(r, 'error').includes('VP020'));
          assert.match(r.issues.find((i) => i.code === 'VP020').message, /performance budget.*reduced-motion.*mobile fallback/);
        }, ['vyson-test-skill', { pillar }]);
      });

      it(`passes a ${pillar} skill whose SKILL.md states the contract`, () => {
        withRepo((repo) => assert.deepEqual(project(repo).issues, []), ['vyson-test-skill', { pillar, body: contract }]);
      });
    }

    it('accepts a contract written in a references/ file', () => {
      withRepo((repo) => {
        writeFiles(repo.skillDir, { 'references/contract.md': contract });
        const skill = path.join(repo.skillDir, 'SKILL.md');
        fs.appendFileSync(skill, '\nSee [the contract](references/contract.md).\n');
        assert.deepEqual(project(repo).issues, []);
      }, ['vyson-test-skill', { pillar: 'motion' }]);
    });

    it('names only the missing parts', () => {
      withRepo((repo) => {
        const r = project(repo);
        const message = r.issues.find((i) => i.code === 'VP020').message;
        assert.match(message, /reduced-motion behavior/);
        assert.doesNotMatch(message, /performance budget/);
        assert.doesNotMatch(message, /mobile fallback/);
      }, ['vyson-test-skill', { pillar: 'motion', body: '# Motion\n\nStay within the budget. Mobile gets a poster image.\n' }]);
    });

    it('does not apply to other pillars', () => {
      withRepo((repo) => assert.deepEqual(project(repo).issues, []), ['vyson-test-skill', { pillar: 'quality' }]);
    });
  });
});

describe('validateEvalsData', () => {
  it('accepts the template structure', () => {
    assert.deepEqual(validateEvalsData(validEvals('x'), 'x'), []);
  });

  it('rejects non-objects', () => {
    assert.equal(validateEvalsData([], 'x')[0].code, 'VP013');
    assert.equal(validateEvalsData(null, 'x')[0].code, 'VP013');
  });

  it('checks every field of every case', () => {
    const data = validEvals('x');
    data.cases[0] = { id: 'one', prompt: '', should_activate: 'yes', must_be_true: [], must_not_happen: 'no' };
    const messages = validateEvalsData(data, 'x').map((p) => p.message).join('\n');
    for (const field of ['id', 'prompt', 'should_activate', 'must_be_true', 'must_not_happen']) {
      assert.match(messages, new RegExp(`cases\\[0\\]\\.${field}`));
    }
  });

  it('rejects duplicate case ids', () => {
    const data = validEvals('x');
    data.cases[1].id = 1;
    assert.match(validateEvalsData(data, 'x')[0].message, /more than once/);
  });

  it('rejects a skill name that does not match', () => {
    assert.match(validateEvalsData(validEvals('x'), 'y')[0].message, /"skill" must be "y"/);
  });
});
