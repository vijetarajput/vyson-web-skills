// Validates ONE skill folder against the Agent Skills specification
// (https://agentskills.io/specification) and, optionally, the VYSON project rules.
//
// Steps, in order:
//   1. Find SKILL.md (exact capital letters).
//   2. Read its header and check every field.
//   3. Check the instructions (length, not empty).
//   4. Check the folder structure.
//   5. Check Markdown links inside the skill folder.
//   6. Check content habits (no run-time downloads, no long reference chains).
//   7. With profile "project": check the VYSON rules.

import fs from 'node:fs';
import path from 'node:path';
import { issue } from './issues.mjs';
import { splitFrontmatter, parseHeader } from './frontmatter.mjs';
import { checkMarkdownLinks, extractLinks, isExternal } from './links.mjs';
import { listMarkdownFiles, readText, safeReadDir, isInside } from './fs-utils.mjs';
import { validateProjectRules } from './rules-project.mjs';

export const LIMITS = {
  nameMax: 64,
  descriptionMax: 1024,
  descriptionMin: 30,
  compatibilityMax: 500,
  skillMdMaxLines: 500,
  bodyTokenWarning: 5000,
};

const KNOWN_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const OPTIONAL_DIRS = ['scripts', 'references', 'assets'];

const isText = (v) => typeof v === 'string';
const charCount = (s) => [...s].length;

/**
 * @param {string} skillDir  absolute path of the skill folder
 * @param {object} [options]
 * @param {'spec'|'project'} [options.profile='project']
 * @param {string} [options.repoRoot=process.cwd()]  folder containing examples/ and evals/
 * @returns {{ name: string, path: string, issues: object[], stats: { markdownFiles: number, links: number } }}
 */
export function validateSkill(skillDir, options = {}) {
  const { profile = 'project', repoRoot = process.cwd() } = options;
  const dirName = path.basename(skillDir);
  const issues = [];
  const result = { name: dirName, path: skillDir, issues, stats: { markdownFiles: 0, links: 0 } };

  // --- 1. Find SKILL.md ------------------------------------------------------
  const entries = safeReadDir(skillDir);
  const exact = entries.find((e) => e.isFile() && e.name === 'SKILL.md');
  if (!exact) {
    const wrongCase = entries.find((e) => e.isFile() && e.name.toLowerCase() === 'skill.md');
    if (wrongCase) {
      issues.push(issue('VS002', `The file is called "${wrongCase.name}" but must be called "SKILL.md".`, { file: path.join(skillDir, wrongCase.name) }));
    } else {
      issues.push(issue('VS001', `No SKILL.md found in "${dirName}".`, { file: skillDir }));
    }
    return result;
  }
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const text = readText(skillMdPath);

  // --- 2. Header ------------------------------------------------------------
  const split = splitFrontmatter(text);
  if (split.status === 'missing') {
    issues.push(issue('VS003', 'The first line of SKILL.md must be "---".', { file: skillMdPath, line: 1 }));
    return finish(result, skillDir, skillMdPath, options);
  }
  if (split.status === 'unclosed') {
    issues.push(issue('VS004', 'No closing "---" line was found.', { file: skillMdPath, line: 1 }));
    return finish(result, skillDir, skillMdPath, options);
  }

  const { data, lineOf, plain, errors } = parseHeader(split.headerLines, split.headerStartLine);
  for (const e of errors) issues.push(issue('VS005', e.message, { file: skillMdPath, line: e.line }));
  const at = (key) => ({ file: skillMdPath, line: lineOf[key] });

  checkName(data, dirName, issues, at);
  checkDescription(data, issues, at);
  checkOptionalFields(data, plain, issues, at);

  // --- 3. Instructions ------------------------------------------------------
  const body = split.bodyLines.join('\n');
  if (body.trim() === '') {
    issues.push(issue('VS040', 'There is nothing below the header.', { file: skillMdPath, line: split.bodyStartLine }));
  }
  const lineCount = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n').length;
  if (lineCount > LIMITS.skillMdMaxLines) {
    issues.push(issue('VS041', `SKILL.md has ${lineCount} lines (limit ${LIMITS.skillMdMaxLines}).`, { file: skillMdPath }));
  }
  const estimatedTokens = Math.ceil(body.length / 4);
  if (estimatedTokens > LIMITS.bodyTokenWarning) {
    issues.push(issue('VS042', `The instructions are about ${estimatedTokens} tokens (estimate; recommended maximum ${LIMITS.bodyTokenWarning}).`, { file: skillMdPath }));
  }

  // --- 4-6. Structure, links, content habits ---------------------------------
  const extra = structureChecks(skillDir, skillMdPath, options);
  issues.push(...extra);

  return finish(result, skillDir, skillMdPath, options, { data, lineOf, body });
}

/** Shared tail: links + content habits (+ project rules when the header was readable). */
function finish(result, skillDir, skillMdPath, options, parsed) {
  const { profile = 'project', repoRoot = process.cwd() } = options;
  const { issues } = result;

  const mdFiles = listMarkdownFiles(skillDir);
  const linkResult = checkMarkdownLinks(mdFiles, { boundary: skillDir, caseRoot: skillDir });
  issues.push(...linkResult.issues);
  result.stats = { markdownFiles: mdFiles.length, links: linkResult.linkCount };

  if (parsed) {
    issues.push(...contentHabitChecks(skillDir, mdFiles));
    if (profile === 'project') {
      issues.push(...validateProjectRules({
        skillDir,
        skillMdPath,
        dirName: path.basename(skillDir),
        data: parsed.data,
        lineOf: parsed.lineOf,
        body: parsed.body,
        repoRoot,
      }));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Field checks
// ---------------------------------------------------------------------------

function checkName(data, dirName, issues, at) {
  if (!('name' in data)) {
    issues.push(issue('VS010', 'The header has no "name" line.', at('name')));
    return;
  }
  const name = data.name;
  if (!isText(name) || name.trim() === '') {
    issues.push(issue('VS011', 'name has no value.', at('name')));
    return;
  }
  if (charCount(name) > LIMITS.nameMax) {
    issues.push(issue('VS012', `name has ${charCount(name)} characters (limit ${LIMITS.nameMax}).`, at('name')));
  }
  if (!/^[\p{Ll}\p{Nd}-]+$/u.test(name)) {
    const hints = [];
    if (/[A-Z]/.test(name)) hints.push('capital letters');
    if (/\s/.test(name)) hints.push('spaces');
    if (/_/.test(name)) hints.push('underscores');
    const detail = hints.length ? ` It contains ${hints.join(', ')}.` : '';
    issues.push(issue('VS013', `"${name}" must use only lowercase letters, numbers and hyphens.${detail}`, at('name')));
  }
  if (name.startsWith('-') || name.endsWith('-')) {
    issues.push(issue('VS014', `"${name}" starts or ends with a hyphen.`, at('name')));
  }
  if (name.includes('--')) {
    issues.push(issue('VS015', `"${name}" contains "--".`, at('name')));
  }
  if (name !== dirName) {
    issues.push(issue('VS016', `name is "${name}" but the folder is called "${dirName}".`, at('name')));
  }
}

function checkDescription(data, issues, at) {
  if (!('description' in data)) {
    issues.push(issue('VS020', 'The header has no "description" line.', at('description')));
    return;
  }
  const d = data.description;
  if (!isText(d) || d.trim() === '') {
    issues.push(issue('VS021', 'description has no value.', at('description')));
    return;
  }
  const length = charCount(d);
  if (length > LIMITS.descriptionMax) {
    issues.push(issue('VS022', `description has ${length} characters (limit ${LIMITS.descriptionMax}).`, at('description')));
  }
  if (length < LIMITS.descriptionMin) {
    issues.push(issue('VS024', `description has only ${length} characters.`, at('description')));
  }
  if (!/\b(when|use|used|using)\b/i.test(d)) {
    issues.push(issue('VS023', 'The description does not contain a phrase such as "Use when ...".', at('description')));
  }
}

function checkOptionalFields(data, plain, issues, at) {
  if ('license' in data && (!isText(data.license) || data.license.trim() === '')) {
    issues.push(issue('VS030', 'license is empty or not text.', at('license')));
  }
  if ('compatibility' in data) {
    const c = data.compatibility;
    if (!isText(c) || c.trim() === '') {
      issues.push(issue('VS031', 'compatibility is empty or not text.', at('compatibility')));
    } else if (charCount(c) > LIMITS.compatibilityMax) {
      issues.push(issue('VS031', `compatibility has ${charCount(c)} characters (limit ${LIMITS.compatibilityMax}).`, at('compatibility')));
    }
  }
  if ('metadata' in data) {
    const m = data.metadata;
    if (m === null || typeof m !== 'object' || Array.isArray(m)) {
      issues.push(issue('VS032', 'metadata must contain indented "key: value" lines.', at('metadata')));
    } else {
      for (const [k, v] of Object.entries(m)) {
        if (!isText(v)) {
          issues.push(issue('VS033', `metadata.${k} is not plain text.`, at(`metadata.${k}`)));
        } else if (plain.has(`metadata.${k}`) && /^(true|false|yes|no|on|off|null|~|[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?)$/i.test(v)) {
          issues.push(issue('VS034', `metadata.${k} is ${v} without quotes.`, at(`metadata.${k}`)));
        }
      }
    }
  }
  if ('allowed-tools' in data && (!isText(data['allowed-tools']) || data['allowed-tools'].trim() === '')) {
    issues.push(issue('VS035', 'allowed-tools is empty or is not one line of text.', at('allowed-tools')));
  }
  for (const key of Object.keys(data)) {
    if (!KNOWN_FIELDS.has(key)) {
      issues.push(issue('VS036', `The field "${key}" is not in the Agent Skills specification.`, at(key)));
    }
  }
}

// ---------------------------------------------------------------------------
// Structure and content habits
// ---------------------------------------------------------------------------

function structureChecks(skillDir) {
  const issues = [];
  for (const dirName of OPTIONAL_DIRS) {
    const dir = path.join(skillDir, dirName);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory() && safeReadDir(dir).length === 0) {
      issues.push(issue('VS050', `The folder "${dirName}/" is empty.`, { file: dir }));
    }
  }
  return issues;
}

function contentHabitChecks(skillDir, mdFiles) {
  const issues = [];
  const referencesDir = path.join(skillDir, 'references');

  for (const file of mdFiles) {
    const content = readText(file);

    // VS051: a reference file linking to another reference file.
    if (isInside(referencesDir, file) && file !== referencesDir) {
      for (const { target, line } of extractLinks(content)) {
        if (isExternal(target) || target.startsWith('#') || target.startsWith('/')) continue;
        const resolved = path.resolve(path.dirname(file), decodeURI(target.split('#')[0].split('?')[0]));
        if (resolved !== file && isInside(referencesDir, resolved) && /\.(md|markdown)$/i.test(resolved)) {
          issues.push(issue('VS051', `This file links to "${target}".`, { file, line }));
        }
      }
    }

    // VS052: "fetch/download ... <URL>" instructions.
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      if (!/\b(webfetch|fetch|download|curl|wget)\b/i.test(line)) return;
      if (/\b(do not|don't|never|must not|mustn't|no)\b/i.test(line)) return;
      const windowText = lines.slice(i, i + 4).join('\n');
      if (/https?:\/\/\S+/i.test(windowText)) {
        issues.push(issue('VS052', `This line mentions "${line.trim().slice(0, 80)}" near a web address.`, { file, line: i + 1 }));
      }
    });
  }
  return issues;
}
