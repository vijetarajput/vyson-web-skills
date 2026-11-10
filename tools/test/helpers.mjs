// Helpers for the validator tests.
// Most tests build small skills in a temporary folder, so they can create
// exactly the problem they want to check, and nothing is left behind.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.join(TEST_DIR, 'fixtures');
export const REPO_ROOT = path.resolve(TEST_DIR, '..', '..');
export const TOOLS_DIR = path.resolve(TEST_DIR, '..');

/** Create an empty temporary folder. */
export function makeTempDir(prefix = 'vyson-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Remove a temporary folder. */
export function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Write files below `root`. `files` maps a relative path to its text. */
export function writeFiles(root, files) {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
}

const DEFAULT_DESCRIPTION = 'A test skill. Use when the validator tests need a small skill.';

/**
 * Create a skill folder.
 * @param {string} root   folder that will contain the skill folder
 * @param {string} dirName
 * @param {object} [o]
 * @param {string} [o.header]  full text between the --- lines (overrides name/description)
 * @param {string} [o.name]
 * @param {string} [o.description]
 * @param {string} [o.extraHeader]  extra header lines (already formatted)
 * @param {string} [o.body]
 * @param {Record<string,string>} [o.files]  extra files, relative to the skill folder
 * @returns {string} absolute path of the skill folder
 */
export function makeSkill(root, dirName, o = {}) {
  const dir = path.join(root, dirName);
  fs.mkdirSync(dir, { recursive: true });
  const header =
    o.header ??
    [`name: ${o.name ?? dirName}`, `description: ${o.description ?? DEFAULT_DESCRIPTION}`, o.extraHeader ?? '']
      .filter((l) => l !== '')
      .join('\n');
  const body = o.body ?? '# Test skill\n\nSome instructions.\n';
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${header}\n---\n\n${body}`);
  if (o.files) writeFiles(dir, o.files);
  return dir;
}

/** The list of issue codes in a validation result, optionally filtered by severity. */
export function codesOf(result, severity) {
  return result.issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);
}

/** A valid eval file for the given skill. */
export function validEvals(skill) {
  return {
    skill,
    schema_version: 1,
    cases: [
      { id: 1, prompt: 'Build a landing page.', should_activate: true, must_be_true: ['It works.'], must_not_happen: [] },
      { id: 2, prompt: 'Fix a typo in my README.', should_activate: false, must_be_true: ['The skill is not used.'], must_not_happen: [] },
    ],
  };
}

/**
 * Create a temporary repository layout (skills/, examples/, evals/) containing
 * one project-valid skill. Returns paths and the skill folder.
 */
export function makeProjectRepo(name = 'vyson-test-skill', { pillar = 'design', body } = {}) {
  const root = makeTempDir('vyson-repo-');
  const skillsDir = path.join(root, 'skills');
  const skillDir = makeSkill(skillsDir, name, {
    extraHeader: `metadata:\n  vyson-pillar: "${pillar}"\n  vyson-version: "0.1.0"`,
    body,
  });
  writeFiles(root, {
    [`examples/${name}/prompt.md`]: '# Prompt\n\nBuild something.\n',
    [`evals/${name}/evals.json`]: `${JSON.stringify(validEvals(name), null, 2)}\n`,
  });
  return { root, skillsDir, skillDir, name };
}
