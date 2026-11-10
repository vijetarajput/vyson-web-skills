// Checks relative links in Markdown files.
//
// For every link such as [text](references/guide.md#setup) we check:
//   1. The file exists                       (VL001)
//   2. The capital letters match the disk    (VL002) works on Windows, breaks on GitHub
//   3. It stays inside the allowed folder    (VL003) skills are installed on their own
//   4. The #heading exists in that file      (VL004) warning only
//   5. It does not start with "/"            (VL005) warning only
//
// Web links (https://...), mailto: links and similar are ignored. We do not
// call the internet: the validator must give the same answer offline.

import path from 'node:path';
import fs from 'node:fs';
import { issue } from './issues.mjs';
import { checkExactCase, isInside, readText } from './fs-utils.mjs';

/**
 * Blank out code (fenced blocks, inline code) and HTML comments, but keep every
 * line break, so that line numbers still match the original file.
 */
export function maskCode(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let fence = null; // { char, length } while inside a fenced code block
  for (const line of lines) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.char && fenceMatch[1].length >= fence.length && /^ {0,3}[`~]+\s*$/.test(line)) {
        fence = null;
      }
      out.push('');
      continue;
    }
    if (fenceMatch) {
      fence = { char: fenceMatch[1][0], length: fenceMatch[1].length };
      out.push('');
      continue;
    }
    // Inline code: replace the content with spaces.
    out.push(line.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (m) => ' '.repeat(m.length)));
  }
  // HTML comments (may span several lines): keep line breaks only.
  return out.join('\n').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Find every link in a Markdown text.
 * @returns {{ target: string, line: number }[]}
 */
export function extractLinks(markdown) {
  const masked = maskCode(markdown);
  const links = [];
  const lineAt = (index) => masked.slice(0, index).split('\n').length;

  // Inline links and images: [text](target "title") and ![alt](target)
  const inline = /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\(\s*(<[^>\n]*>|[^\s()]*(?:\([^\s()]*\)[^\s()]*)*)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  for (const m of masked.matchAll(inline)) {
    let target = m[1];
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    links.push({ target, line: lineAt(m.index) });
  }

  // Reference definitions: [id]: target
  const definitions = /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]*>|\S+)/gm;
  for (const m of masked.matchAll(definitions)) {
    let target = m[1];
    if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
    links.push({ target, line: lineAt(m.index) });
  }

  // HTML attributes: <a href="..."> and <img src="...">
  const html = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  for (const m of masked.matchAll(html)) {
    links.push({ target: m[1], line: lineAt(m.index) });
  }

  return links.filter((l) => l.target !== '');
}

/** True for web links, mail links and anything else that is not a file path. */
export function isExternal(target) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(target);
}

/**
 * Turn heading text into the "#anchor" GitHub would create for it.
 * Example: "Step 2: Set up `npm`!" -> "step-2-set-up-npm"
 */
export function slugifyHeading(text) {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/[`*_~]/g, (c) => (c === '_' ? '_' : '')) // remove formatting marks (keep underscores)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** All "#anchor" names a Markdown text provides (one per heading, GitHub style). */
export function collectHeadingSlugs(markdown) {
  const masked = maskCode(markdown);
  const seen = new Map();
  const slugs = new Set();
  for (const line of masked.split('\n')) {
    const m = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/.exec(line);
    if (!m) continue;
    const base = slugifyHeading(m[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  return slugs;
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/**
 * Check the links of ONE Markdown file.
 *
 * @param {string} file       absolute path of the Markdown file
 * @param {object} opts
 * @param {string} [opts.boundary]  if set, links may not leave this folder (VL003)
 * @param {string} opts.caseRoot    folder used for the exact-capitalisation check
 * @param {Map} [opts.dirCache]     shared cache of folder listings
 * @param {Map} [opts.slugCache]    shared cache of heading anchors per file
 * @returns {{ issues: object[], linkCount: number }}
 */
export function checkLinksInFile(file, opts) {
  const { boundary, caseRoot, dirCache = new Map(), slugCache = new Map() } = opts;
  const issues = [];
  const text = readText(file);
  const links = extractLinks(text);
  let checked = 0;

  const slugsFor = (mdFile) => {
    if (!slugCache.has(mdFile)) slugCache.set(mdFile, collectHeadingSlugs(readText(mdFile)));
    return slugCache.get(mdFile);
  };

  for (const { target, line } of links) {
    if (isExternal(target)) continue;
    checked += 1;
    const where = { file, line };
    const hashIndex = target.indexOf('#');
    const fragment = hashIndex >= 0 ? safeDecode(target.slice(hashIndex + 1)) : '';
    let pathPart = hashIndex >= 0 ? target.slice(0, hashIndex) : target;
    pathPart = safeDecode(pathPart.split('?')[0]);

    // Link to a heading in the same file: [text](#heading)
    if (pathPart === '') {
      if (fragment && !slugsFor(file).has(fragment.toLowerCase())) {
        issues.push(issue('VL004', `The heading "#${fragment}" was not found in this file.`, where));
      }
      continue;
    }

    if (pathPart.startsWith('/')) {
      issues.push(issue('VL005', `The link "${target}" starts with "/".`, where));
      continue;
    }

    const resolved = path.resolve(path.dirname(file), pathPart);

    if (boundary && !isInside(boundary, resolved)) {
      issues.push(issue('VL003', `The link "${target}" points outside the skill folder.`, where));
      continue;
    }

    const found = checkExactCase(resolved, caseRoot, dirCache);
    if (found.status === 'missing') {
      issues.push(issue('VL001', `The link "${target}" points to a file that does not exist.`, where));
      continue;
    }
    if (found.status === 'case') {
      issues.push(issue('VL002', `The link "${target}" has different capital letters from the real file "${found.actual}".`, where));
      continue;
    }

    if (fragment && /\.(md|markdown)$/i.test(resolved) && fs.statSync(resolved).isFile()) {
      if (!slugsFor(resolved).has(fragment.toLowerCase())) {
        issues.push(issue('VL004', `The heading "#${fragment}" was not found in "${pathPart}".`, where));
      }
    }
  }

  return { issues, linkCount: checked };
}

/**
 * Check the links of several Markdown files.
 * @returns {{ issues: object[], linkCount: number }}
 */
export function checkMarkdownLinks(files, opts) {
  const shared = { ...opts, dirCache: new Map(), slugCache: new Map() };
  const issues = [];
  let linkCount = 0;
  for (const f of files) {
    const r = checkLinksInFile(f, shared);
    issues.push(...r.issues);
    linkCount += r.linkCount;
  }
  return { issues, linkCount };
}
