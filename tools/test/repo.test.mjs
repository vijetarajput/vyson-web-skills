// Tests about THIS repository: the skill template, the eval template and the
// rule documentation must stay valid and in sync with the validator.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSkill } from '../lib/validate-skill.mjs';
import { validateEvalsData } from '../lib/rules-project.mjs';
import { RULE_CODES, RULES } from '../lib/issues.mjs';
import { REPO_ROOT } from './helpers.mjs';

describe('skill template', () => {
  it('passes the Agent Skills specification rules with no errors and no warnings', () => {
    const r = validateSkill(path.join(REPO_ROOT, 'templates', 'skill-template'), { profile: 'spec', repoRoot: REPO_ROOT });
    assert.deepEqual(r.issues, []);
  });

  it('is deliberately NOT a finished project skill', () => {
    const r = validateSkill(path.join(REPO_ROOT, 'templates', 'skill-template'), { profile: 'project', repoRoot: REPO_ROOT });
    const codes = r.issues.map((i) => i.code);
    assert.ok(codes.includes('VP001'), 'its name does not start with vyson-');
    assert.ok(codes.includes('VP010') && codes.includes('VP011'), 'it has no example and no eval file');
  });
});

describe('eval template', () => {
  it('matches the structure the validator expects', () => {
    const data = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'templates', 'evals.template.json'), 'utf8'));
    assert.deepEqual(validateEvalsData(data, data.skill), []);
  });
});

describe('rule documentation', () => {
  const doc = fs.readFileSync(path.join(REPO_ROOT, 'docs', 'validator-rules.md'), 'utf8');

  it('documents every rule code', () => {
    const missing = RULE_CODES.filter((code) => !new RegExp(`\\b${code}\\b`).test(doc));
    assert.deepEqual(missing, [], `Add these rules to docs/validator-rules.md: ${missing.join(', ')}`);
  });

  it('does not document rule codes that do not exist', () => {
    const documented = [...new Set(doc.match(/\bV[SLP]\d{3}\b/g) ?? [])];
    const unknown = documented.filter((code) => !RULES[code]);
    assert.deepEqual(unknown, [], `Remove or fix: ${unknown.join(', ')}`);
  });

  it('states the same severity as the code', () => {
    for (const code of RULE_CODES) {
      const row = doc.split('\n').find((l) => l.startsWith(`| ${code} `));
      assert.ok(row, `${code} needs its own table row`);
      assert.match(row.toLowerCase(), new RegExp(`\\| ${RULES[code].severity} \\|`), `${code} should be marked "${RULES[code].severity}"`);
    }
  });
});
