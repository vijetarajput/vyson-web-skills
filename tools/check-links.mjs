#!/usr/bin/env node
// VYSON Markdown link checker: command-line entry point.
//
// Checks every relative link in the Markdown files of the repository (or of the
// paths you give). Unlike the skill validator, links here may point anywhere
// inside the repository; they only must exist and use the exact capitalisation.
//
// Usage:
//   node tools/check-links.mjs [paths...] [--json] [--strict] [--no-color] [--repo-root <folder>]
//
// Exit codes: 0 = all links fine, 1 = broken links, 2 = the tool was used incorrectly.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMarkdownLinks } from './lib/links.mjs';
import { listMarkdownFiles } from './lib/fs-utils.mjs';
import { formatText, formatJson, summarize } from './lib/report.mjs';

const HELP = `VYSON Markdown Link Checker

Usage:
  node tools/check-links.mjs [paths...] [options]

Paths:
  Markdown files or folders. Default: the whole repository.
  (Test fixtures in tools/test/fixtures are skipped on purpose: they contain
  deliberately broken links.)

Options:
  --strict              Treat warnings as errors
  --json                Print a machine-readable JSON report
  --no-color            Turn off colors (also respects the NO_COLOR variable)
  --repo-root <folder>  The repository root (default: this repository)
  -h, --help            Show this help

Exit codes: 0 all links fine, 1 broken links, 2 incorrect usage.
`;

function parseArgs(argv) {
  const opts = { paths: [], strict: false, json: false, color: undefined, repoRoot: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--strict') opts.strict = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--no-color') opts.color = false;
    else if (a === '--repo-root') {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) throw new Error('--repo-root needs a value.');
      opts.repoRoot = value;
      i += 1;
    } else if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
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
  const targets = opts.paths.length ? opts.paths.map((p) => path.resolve(p)) : [repoRoot];
  const listOpts = { root: repoRoot, ignorePrefixes: ['tools/test/fixtures'] };

  const files = [];
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      console.error(`Path not found: ${t}\n\nRun with --help to see how to use this tool.`);
      return 2;
    }
    if (fs.statSync(t).isDirectory()) files.push(...listMarkdownFiles(t, listOpts));
    else files.push(t);
  }

  // One result per Markdown file, so the report shows exactly which file has a problem.
  const results = files.map((file) => {
    const r = checkMarkdownLinks([file], { caseRoot: repoRoot });
    return {
      name: path.relative(repoRoot, file).split(path.sep).join('/'),
      path: file,
      issues: r.issues,
      stats: { markdownFiles: 1, links: r.linkCount },
    };
  });

  const color = opts.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const report = { title: 'VYSON Markdown Link Checker', subject: 'Markdown file', strict: opts.strict, color, baseDir: process.cwd() };
  console.log(opts.json ? formatJson(results, report) : formatText(results, report));
  return summarize(results, opts.strict).ok ? 0 : 1;
}

process.exitCode = main();
