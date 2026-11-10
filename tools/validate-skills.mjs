#!/usr/bin/env node
// VYSON Skill Validator: command-line entry point.
//
// Usage:
//   node tools/validate-skills.mjs [paths...] [options]
//
// A path can be one skill folder (it contains SKILL.md) or a folder of skills
// such as skills/. With no path, the skills/ folder of this repository is checked.
//
// Exit codes: 0 = passed, 1 = validation errors, 2 = the tool was used incorrectly.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverSkillDirs } from './lib/discover.mjs';
import { validateSkill } from './lib/validate-skill.mjs';
import { formatText, formatJson, summarize } from './lib/report.mjs';

const HELP = `VYSON Skill Validator

Checks skills against the Agent Skills specification and the VYSON project rules.

Usage:
  node tools/validate-skills.mjs [paths...] [options]

Paths:
  A skill folder (contains SKILL.md) or a folder of skills (for example skills/).
  Default: the skills/ folder of this repository.

Options:
  --profile <spec|project>  spec    = Agent Skills specification rules + links only
                            project = spec rules + VYSON rules (default)
  --strict                  Treat warnings as errors
  --json                    Print a machine-readable JSON report
  --no-color                Turn off colors (also respects the NO_COLOR variable)
  --repo-root <folder>      Folder that contains examples/ and evals/
                            (default: this repository)
  -h, --help                Show this help

Exit codes: 0 passed, 1 validation errors, 2 incorrect usage.

Examples:
  node tools/validate-skills.mjs
  node tools/validate-skills.mjs skills/vyson-css-motion
  node tools/validate-skills.mjs templates/skill-template --profile spec
`;

class UsageError extends Error {}

function parseArgs(argv) {
  const opts = { paths: [], profile: 'project', strict: false, json: false, color: undefined, repoRoot: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-color') opts.color = false;
    else if (a === '--profile' || a === '--repo-root') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new UsageError(`${a} needs a value.`);
      i += 1;
      if (a === '--profile') {
        if (value !== 'spec' && value !== 'project') throw new UsageError(`--profile must be "spec" or "project" (got "${value}").`);
        opts.profile = value;
      } else {
        opts.repoRoot = value;
      }
    } else if (a.startsWith('-')) throw new UsageError(`Unknown option: ${a}`);
    else opts.paths.push(a);
  }
  return opts;
}

function main() {
  const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${e.message}\n\nRun with --help to see how to use this tool.`);
    return 2;
  }
  if (opts.help) {
    console.log(HELP);
    return 0;
  }

  const repoRoot = path.resolve(opts.repoRoot ?? defaultRoot);
  const usingDefault = opts.paths.length === 0;
  const targets = usingDefault ? [path.join(repoRoot, 'skills')] : opts.paths;

  const dirs = [];
  try {
    for (const t of targets) {
      const found = discoverSkillDirs(t);
      if (!usingDefault && found.dirs.length === 0) throw new UsageError(`No skills found in: ${t}`);
      dirs.push(...found.dirs);
    }
  } catch (e) {
    console.error(`${e.message}\n\nRun with --help to see how to use this tool.`);
    return 2;
  }

  const results = dirs.map((d) => validateSkill(d, { profile: opts.profile, repoRoot }));
  const color = opts.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const notes = [];
  if (usingDefault && results.length === 0) {
    notes.push('No skills found in skills/ yet. The project is pre-alpha, so this is expected.');
  }

  const report = { title: 'VYSON Skill Validator', subject: 'skill', profile: opts.profile, strict: opts.strict, color, baseDir: process.cwd(), notes };
  console.log(opts.json ? formatJson(results, report) : formatText(results, report));
  return summarize(results, opts.strict).ok ? 0 : 1;
}

process.exitCode = main();
