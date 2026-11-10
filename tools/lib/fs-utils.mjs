// Small file-system helpers shared by the validator modules.

import fs from 'node:fs';
import path from 'node:path';

/** Convert a path to forward slashes (so reports look the same on every OS). */
export function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Read a UTF-8 text file. */
export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

/** Read a directory, returning [] if it does not exist or is not a directory. */
export function safeReadDir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * List every file below `dir` (recursively), as absolute paths.
 * @param {string} dir
 * @param {{ ignoreDirNames?: string[], ignorePrefixes?: string[], root?: string }} [opts]
 *   ignoreDirNames: directory names to skip anywhere (for example "node_modules")
 *   ignorePrefixes: posix paths, relative to `root`, to skip (for example "tools/test/fixtures")
 */
export function walkFiles(dir, opts = {}) {
  const { ignoreDirNames = ['.git', 'node_modules'], ignorePrefixes = [], root = dir } = opts;
  const out = [];
  for (const entry of safeReadDir(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirNames.includes(entry.name)) continue;
      const rel = toPosix(path.relative(root, full));
      if (ignorePrefixes.some((p) => rel === p || rel.startsWith(`${p}/`))) continue;
      out.push(...walkFiles(full, opts));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out.sort();
}

/** All Markdown files below `dir`. */
export function listMarkdownFiles(dir, opts = {}) {
  return walkFiles(dir, opts).filter((f) => /\.(md|markdown)$/i.test(f));
}

/** Is `child` inside (or equal to) `parent`? Both must be absolute. */
export function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * Look up a path below `caseRoot` and compare it with the real names on disk,
 * letter for letter. We do this because Windows treats "Guide.md" and
 * "guide.md" as the same file, but GitHub, Linux and macOS do not. A link that
 * "works on my computer" can therefore break after publishing.
 *
 * @returns {{status: 'ok'} | {status: 'missing'} | {status: 'case', actual: string}}
 */
export function checkExactCase(target, caseRoot, dirCache = new Map()) {
  if (!isInside(caseRoot, target)) {
    return fs.existsSync(target) ? { status: 'ok' } : { status: 'missing' };
  }
  const segments = path.relative(caseRoot, target).split(path.sep).filter(Boolean);
  let current = caseRoot;
  const actualParts = [];
  let caseMismatch = false;
  for (const segment of segments) {
    let names = dirCache.get(current);
    if (!names) {
      names = safeReadDir(current).map((e) => e.name);
      dirCache.set(current, names);
    }
    if (names.includes(segment)) {
      actualParts.push(segment);
      current = path.join(current, segment);
      continue;
    }
    const insensitive = names.find((n) => n.toLowerCase() === segment.toLowerCase());
    if (!insensitive) return { status: 'missing' };
    caseMismatch = true;
    actualParts.push(insensitive);
    current = path.join(current, insensitive);
  }
  return caseMismatch ? { status: 'case', actual: actualParts.join('/') } : { status: 'ok' };
}
