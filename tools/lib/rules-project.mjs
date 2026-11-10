// VYSON project rules. These go BEYOND the Agent Skills specification.
// They are only checked with --profile project (the default), and they come
// from CONTRIBUTING.md and docs/decisions.md.

import fs from 'node:fs';
import path from 'node:path';
import { issue } from './issues.mjs';
import { listMarkdownFiles, readText } from './fs-utils.mjs';

export const PILLARS = ['design', 'motion', '3d', 'frontend', 'quality'];

const PROJECT_NAME = /^vyson-[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * Check the structure of an evals.json file.
 * @param {any} data              parsed JSON
 * @param {string} expectedSkill  the skill name the file must refer to
 * @returns {{ code: string, message: string }[]}
 */
export function validateEvalsData(data, expectedSkill) {
  const problems = [];
  const bad = (message) => problems.push({ code: 'VP013', message });

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    bad('The file must contain one JSON object ({ ... }).');
    return problems;
  }
  if (data.skill !== expectedSkill) bad(`"skill" must be "${expectedSkill}" (found ${JSON.stringify(data.skill)}).`);
  if (data.schema_version !== 1) bad('"schema_version" must be the number 1.');
  if (!Array.isArray(data.cases) || data.cases.length === 0) {
    bad('"cases" must be a list with at least one test case.');
    return problems;
  }

  const ids = new Set();
  data.cases.forEach((c, index) => {
    const label = `cases[${index}]`;
    if (c === null || typeof c !== 'object' || Array.isArray(c)) { bad(`${label} must be an object.`); return; }
    if (!Number.isInteger(c.id)) bad(`${label}.id must be a whole number.`);
    else if (ids.has(c.id)) bad(`${label}.id (${c.id}) is used more than once.`);
    else ids.add(c.id);
    if (typeof c.prompt !== 'string' || c.prompt.trim() === '') bad(`${label}.prompt must be non-empty text.`);
    if (typeof c.should_activate !== 'boolean') bad(`${label}.should_activate must be true or false.`);
    if (!Array.isArray(c.must_be_true) || c.must_be_true.length === 0 || c.must_be_true.some((s) => typeof s !== 'string' || s.trim() === '')) {
      bad(`${label}.must_be_true must be a list of at least one non-empty sentence.`);
    }
    if (!Array.isArray(c.must_not_happen) || c.must_not_happen.some((s) => typeof s !== 'string')) {
      bad(`${label}.must_not_happen must be a list of text (it may be empty: []).`);
    }
  });

  if (!data.cases.some((c) => c && c.should_activate === false)) {
    problems.push({ code: 'VP014', message: 'No case has "should_activate": false.' });
  }
  return problems;
}

/**
 * Run the VYSON project rules for one skill.
 *
 * @param {object} ctx
 * @param {string} ctx.skillDir
 * @param {string} ctx.skillMdPath
 * @param {string} ctx.dirName
 * @param {Record<string, any>} ctx.data       parsed header
 * @param {Record<string, number>} ctx.lineOf  line numbers of header fields
 * @param {string} ctx.body                    text below the header
 * @param {string} ctx.repoRoot                folder that contains examples/ and evals/
 * @returns {object[]} issues
 */
export function validateProjectRules(ctx) {
  const { skillDir, skillMdPath, dirName, data, lineOf, body, repoRoot } = ctx;
  const issues = [];
  const headerFile = { file: skillMdPath };

  // VP001: naming
  const name = typeof data.name === 'string' && data.name !== '' ? data.name : dirName;
  if (!PROJECT_NAME.test(name)) {
    issues.push(issue('VP001', `"${name}" does not match the pattern vyson-<words-separated-by-hyphens>.`, { ...headerFile, line: lineOf.name }));
  }

  // VP002 / VP003: metadata
  const meta = data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata) ? data.metadata : {};
  const pillar = meta['vyson-pillar'];
  if (!PILLARS.includes(pillar)) {
    issues.push(issue('VP002', `vyson-pillar is ${pillar === undefined ? 'missing' : JSON.stringify(pillar)}. Allowed values: ${PILLARS.join(', ')}.`, { ...headerFile, line: lineOf['metadata.vyson-pillar'] ?? lineOf.metadata }));
  }
  const version = meta['vyson-version'];
  if (typeof version !== 'string' || !SEMVER.test(version)) {
    issues.push(issue('VP003', `vyson-version is ${version === undefined ? 'missing' : JSON.stringify(version)}. Expected something like "0.1.0".`, { ...headerFile, line: lineOf['metadata.vyson-version'] ?? lineOf.metadata }));
  }

  // VP010: example
  const examplePrompt = path.join(repoRoot, 'examples', dirName, 'prompt.md');
  if (!fs.existsSync(examplePrompt)) {
    issues.push(issue('VP010', `Expected a file at examples/${dirName}/prompt.md.`, headerFile));
  }

  // VP011-VP014: eval file
  const evalPath = path.join(repoRoot, 'evals', dirName, 'evals.json');
  if (!fs.existsSync(evalPath)) {
    issues.push(issue('VP011', `Expected a file at evals/${dirName}/evals.json.`, headerFile));
  } else {
    let parsed;
    try {
      parsed = JSON.parse(readText(evalPath));
    } catch (e) {
      issues.push(issue('VP012', `evals/${dirName}/evals.json: ${e.message}`, { file: evalPath }));
    }
    if (parsed !== undefined) {
      for (const p of validateEvalsData(parsed, dirName)) {
        issues.push(issue(p.code, p.message, { file: evalPath }));
      }
    }
  }

  // VP020: motion and 3D safety contract
  if (pillar === 'motion' || pillar === '3d') {
    const texts = [body, ...listMarkdownFiles(skillDir).filter((f) => f !== skillMdPath).map(readText)].join('\n');
    const missing = [];
    if (!/performance[ -]budget|\bbudget\b/i.test(texts)) missing.push('a performance budget');
    if (!/prefers-reduced-motion|reduced[ -]motion/i.test(texts)) missing.push('reduced-motion behavior');
    if (!/\bmobile\b/i.test(texts)) missing.push('a mobile fallback');
    if (missing.length) {
      issues.push(issue('VP020', `Could not find any mention of: ${missing.join(', ')}.`, headerFile));
    }
  }

  return issues;
}
