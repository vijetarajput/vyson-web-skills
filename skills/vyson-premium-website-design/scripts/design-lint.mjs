#!/usr/bin/env node
// design-lint: a small checker for the basics in the vyson-premium-website-design skill.
//
// It reads .css files, <style> blocks and .html files and reports common
// problems that make a site look unfinished or hard to use: no language or
// viewport, images without alt text, a broken heading outline, removed focus
// outlines, tiny text, placeholder text, dead "#" links, too many fonts,
// files loaded from other websites, and text colours with too little contrast.
//
// IT IS A STATIC CHECKER. It only reads text. It never opens a browser, so it
// cannot tell you whether the page looks good, whether the hierarchy is clear,
// whether the layout works on a phone, or which CSS rule wins. Passing it is
// NOT a design review and NOT a browser test. See references/quality-checks.md.
//
// The contrast check (DL015) only covers the colour roles named in the
// starter file assets/design-tokens.css (--vd-text on --vd-bg, and so on) and
// only colours written as hex or rgb(). It cannot see the contrast of text on
// images, gradients or colours that are not in those tokens.
//
// It has NO dependencies and works on its own, so it still works after the
// skill has been installed into a project.
//
// Usage:   node design-lint.mjs <file-or-folder> [more paths] [--strict] [--json]
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  DL001: {
    severity: 'error',
    title: 'The page has no language',
    fix: 'Add a language to the opening tag, for example <html lang="en">. Screen readers and translation tools use it.',
  },
  DL002: {
    severity: 'error',
    title: 'No viewport meta tag',
    fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head>. Without it phones show a zoomed-out desktop page.',
  },
  DL003: {
    severity: 'error',
    title: 'The viewport blocks zooming',
    fix: 'Remove user-scalable=no and maximum-scale=1 from the viewport tag. People with low vision need to zoom.',
  },
  DL004: {
    severity: 'error',
    title: 'Image without an alt attribute',
    fix: 'Add alt="..." that describes what the image shows. Use alt="" (empty) only for purely decorative images.',
  },
  DL005: {
    severity: 'warning',
    title: 'Image without width and height',
    fix: 'Add width and height attributes (the real pixel size) so the browser can reserve space and the page does not jump while images load. Keep "height: auto" in the CSS.',
  },
  DL006: {
    severity: 'warning',
    title: 'The page has no title',
    fix: 'Add a short, specific <title> in the <head>. It is the page name in the browser tab, in search results and for screen readers.',
  },
  DL007: {
    severity: 'warning',
    title: 'No meta description',
    fix: 'Add <meta name="description" content="..."> with one or two plain sentences about the page.',
  },
  DL008: {
    severity: 'warning',
    title: 'The page does not have exactly one h1',
    fix: 'Use one <h1> for the main headline of the page, and <h2> to <h6> for the parts below it.',
  },
  DL009: {
    severity: 'warning',
    title: 'A heading level is skipped',
    fix: 'Do not jump from <h2> to <h4>. Choose the heading level for the outline, and use CSS for the size.',
  },
  DL010: {
    severity: 'warning',
    title: 'No <main> landmark',
    fix: 'Wrap the page content that is not the header or footer in <main>. It lets keyboard and screen reader users skip to the content.',
  },
  DL011: {
    severity: 'warning',
    title: 'Focus outline removed without a replacement',
    fix: 'Do not write "outline: none" unless a :focus-visible rule gives the element a visible outline or box-shadow. Keyboard users need to see where they are.',
  },
  DL012: {
    severity: 'warning',
    title: 'Very small text',
    fix: 'Keep text at 12px (0.75rem) or larger, and body text at 16px (1rem) or larger. Tiny text is a common reason a page looks cheap and is hard to read.',
  },
  DL013: {
    severity: 'warning',
    title: 'Placeholder text left in the page',
    fix: 'Replace "lorem ipsum" and similar filler with real or realistic copy that fits the brand. Filler hides hierarchy and length problems.',
  },
  DL014: {
    severity: 'warning',
    title: 'Link that goes nowhere ("#")',
    fix: 'Point the link at a real address or section id, or use a <button> if it triggers an action.',
  },
  DL015: {
    severity: 'error',
    title: 'Colour pair with too little contrast',
    fix: 'Change one of the two colours until normal text reaches at least 4.5:1 (WCAG 2.2 level AA, SC 1.4.3). Darken text or lighten the background, then run the checker again.',
  },
  DL016: {
    severity: 'warning',
    title: 'More than three font stacks',
    fix: 'Use at most three font stacks: one for headings, one for body text and, only if needed, one for code. More looks unplanned and loads more files.',
  },
  DL017: {
    severity: 'warning',
    title: 'File loaded from another website',
    fix: 'Prefer files that live in the project (fonts, images, scripts). A file loaded from another site can disappear, slow the page down, track visitors and have a licence you did not check.',
  },
  DL018: {
    severity: 'warning',
    title: '"width: 100vw" can cause sideways scrolling',
    fix: 'Use "width: 100%" or "inline-size: 100%". 100vw includes the width of the scrollbar and often makes the page scroll sideways.',
  },
};

const MIN_FONT_PX = 12;
const MAX_FONT_STACKS = 3;
const TEXT_CONTRAST = 4.5; // WCAG 2.2 level AA for normal text (SC 1.4.3)

// Pairs of tokens from assets/design-tokens.css that are used as text on a background.
const CONTRAST_PAIRS = [
  ['--vd-text', '--vd-bg'],
  ['--vd-text', '--vd-surface'],
  ['--vd-muted', '--vd-bg'],
  ['--vd-muted', '--vd-surface'],
  ['--vd-link', '--vd-bg'],
  ['--vd-accent-contrast', '--vd-accent'],
];

// ---------------------------------------------------------------------------
// 1. Colour maths (WCAG 2.x relative luminance and contrast ratio)
// ---------------------------------------------------------------------------

/** Read #rgb, #rrggbb or rgb(r, g, b). Returns [r, g, b] (0 to 255), or null if it cannot be read or is see-through. */
export function parseColor(value) {
  const v = String(value).trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(v);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (alpha < 1) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])].map((n) => Math.min(255, n));
  }
  return null;
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two [r, g, b] colours, from 1 (same) to 21 (black on white). */
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// ---------------------------------------------------------------------------
// 2. A tiny CSS reader
// ---------------------------------------------------------------------------

function blankComments(text) {
  // Replace comment characters by spaces but keep new lines, so line numbers stay correct.
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Turn CSS text into a flat list of declarations.
 * Each declaration remembers the rules it sits inside (its "context").
 * @returns {{ prop: string, value: string, line: number, context: string[] }[]}
 */
export function parseDeclarations(source) {
  const text = blankComments(source);
  const decls = [];
  const stack = [];
  let buffer = '';
  let bufferLine = 1;
  let line = 1;
  let parens = 0;
  let quote = null;

  const flush = () => {
    const raw = buffer.trim();
    const startLine = bufferLine;
    buffer = '';
    if (!raw || stack.length === 0) return;
    const colon = raw.indexOf(':');
    if (colon <= 0) return;
    decls.push({
      prop: raw.slice(0, colon).trim().toLowerCase(),
      value: raw.slice(colon + 1).trim(),
      line: startLine,
      context: stack.slice(),
    });
  };

  const append = (ch) => {
    if (buffer.trim() === '' && ch.trim() !== '') bufferLine = line;
    buffer += ch;
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '\n') line += 1;

    if (quote) {
      append(ch);
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; append(ch); continue; }
    if (ch === '(') { parens += 1; append(ch); continue; }
    if (ch === ')') { parens = Math.max(0, parens - 1); append(ch); continue; }
    if (parens > 0) { append(ch); continue; }

    if (ch === '{') {
      stack.push(buffer.trim().replace(/\s+/g, ' '));
      buffer = '';
    } else if (ch === '}') {
      flush();
      stack.pop();
    } else if (ch === ';') {
      flush();
    } else {
      append(ch);
    }
  }
  flush();
  return decls;
}

/** CSS text of every <style> block, padded with new lines so line numbers match the HTML file. */
function extractStyleBlocks(html) {
  const blocks = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const before = html.slice(0, match.index + match[0].indexOf('>') + 1);
    blocks.push('\n'.repeat(before.split('\n').length - 1) + match[1]);
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// 3. Small helpers
// ---------------------------------------------------------------------------

const VISUALLY_HIDDEN = /sr-only|visually-hidden|screen-reader/i;
const GENERIC_FAMILIES = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji', 'fangsong']);

const selectorOf = (ctx) => (ctx.length ? ctx[ctx.length - 1] : '');
const inPrint = (ctx) => ctx.some((p) => /^@media[^{]*\bprint\b/i.test(p));

function makeIssue(code, message, file, line) {
  const rule = RULES[code];
  return { code, severity: rule.severity, title: rule.title, message, fix: rule.fix, file, line };
}

function splitTopLevel(value, separator) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const ch of value) {
    if (quote) { current += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === separator && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Replace one level of var(--name, fallback) with the known value. */
function resolveVar(value, vars) {
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (all, name, fallback) => vars.get(name) ?? fallback ?? all);
}

function toPx(value) {
  const m = /^(\d*\.?\d+)(px|rem|em)$/.exec(value.trim());
  if (!m) return NaN;
  return parseFloat(m[1]) * (m[2] === 'px' ? 1 : 16); // em is treated as 16px: an estimate
}

// ---------------------------------------------------------------------------
// 4. CSS checks
// ---------------------------------------------------------------------------

/**
 * Check CSS from one or more sources together.
 * @param {{ file: string, css: string }[]} sources
 * @returns {object[]} issues
 */
export function lintSources(sources) {
  const all = [];
  for (const { file, css } of sources) {
    for (const d of parseDeclarations(css)) all.push({ ...d, file });
  }
  const issues = [];
  const add = (code, message, d) => issues.push(makeIssue(code, message, d.file, d.line));

  const vars = new Map();
  for (const d of all) if (d.prop.startsWith('--')) vars.set(d.prop, d.value);

  // DL011: "outline: none" is only fine when a :focus-visible rule gives another visible indicator.
  const hasFocusIndicator = all.some((d) => /:focus-visible/i.test(selectorOf(d.context))
    && !/:not\(\s*:focus-visible/i.test(selectorOf(d.context))
    && (d.prop === 'box-shadow' || (d.prop === 'outline' && !/^(none|0)\b/i.test(d.value))
      || d.prop === 'outline-color' || d.prop === 'outline-width' || d.prop === 'border' || d.prop === 'border-color'));

  const stacks = new Map(); // normalised font stack -> first declaration
  const seenExternal = new Set();

  for (const d of all) {
    const selector = selectorOf(d.context);
    const value = resolveVar(d.value, vars);

    if (d.prop === 'outline' || d.prop === 'outline-style') {
      const removed = d.prop === 'outline' ? /^(none|0)(\s|$)/i.test(value.trim()) : /^none$/i.test(value.trim());
      if (removed && !hasFocusIndicator && !/:not\(\s*:focus-visible/i.test(selector) && !inPrint(d.context)) {
        add('DL011', `"${d.prop}: ${d.value}" on "${selector}" and no :focus-visible rule gives a replacement.`, d);
      }
    }

    if (d.prop === 'font-size' && !VISUALLY_HIDDEN.test(selector)) {
      const px = toPx(value);
      if (!Number.isNaN(px) && px > 0 && px < MIN_FONT_PX) add('DL012', `font-size ${d.value} on "${selector}" is about ${Math.round(px * 10) / 10}px.`, d);
    }

    // A "font stack" is a font-family list, or a custom property such as --vd-font-display that holds one.
    if (d.prop === 'font-family' || (d.prop.startsWith('--') && /font/.test(d.prop) && !/size|weight|leading|style|feature/.test(d.prop))) {
      const stack = value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (stack && !/^(inherit|initial|unset|revert)$/.test(stack) && !/var\(/.test(stack) && !stacks.has(stack)) stacks.set(stack, d);
    }

    if (d.prop === 'width' && /^100vw$/i.test(value.trim())) {
      add('DL018', `width: 100vw on "${selector}".`, d);
    }

    for (const m of d.value.matchAll(/url\(\s*["']?\s*((?:https?:)?\/\/[^"')\s]+)/gi)) {
      const key = `${d.file}:${d.line}:${m[1]}`;
      if (!seenExternal.has(key)) { seenExternal.add(key); add('DL017', `CSS loads ${m[1]} from another website.`, d); }
    }
  }

  // DL017 also for "@import" lines, which sit outside any rule and are not declarations.
  for (const { file, css } of sources) {
    const text = blankComments(css);
    for (const m of text.matchAll(/@import\s+(?:url\(\s*)?["']?\s*((?:https?:)?\/\/[^"')\s;]+)/gi)) {
      issues.push(makeIssue('DL017', `CSS imports ${m[1]} from another website.`, file, lineAt(text, m.index)));
    }
  }

  // DL016
  if (stacks.size > MAX_FONT_STACKS) {
    const list = [...stacks.values()];
    add('DL016', `${stacks.size} different font stacks are defined (the limit is ${MAX_FONT_STACKS}).`, list[MAX_FONT_STACKS]);
  }

  // DL015: contrast of the token pairs, once per group of declarations (the base :root, and any theme block).
  // The base palette comes from :root, html and body rules in all files (a later file wins, as it
  // would if it were linked later). Any other rule that sets these tokens (a dark theme, a
  // [data-theme] block, a media query) is checked on top of the base palette.
  const base = new Map();
  const themes = new Map();
  for (const d of all) {
    if (!CONTRAST_PAIRS.flat().includes(d.prop)) continue;
    const key = d.context.join(' > ');
    if (/^(:root|html|body)$/i.test(key)) {
      base.set(d.prop, d);
    } else {
      if (!themes.has(key)) themes.set(key, new Map());
      themes.get(key).set(d.prop, d);
    }
  }
  const checkPalette = (palette, changed) => {
    for (const [fgName, bgName] of CONTRAST_PAIRS) {
      if (changed && !changed.has(fgName) && !changed.has(bgName)) continue; // nothing new in this theme
      const fg = palette.get(fgName);
      const bg = palette.get(bgName);
      if (!fg || !bg) continue;
      const a = parseColor(resolveVar(fg.value, vars));
      const b = parseColor(resolveVar(bg.value, vars));
      if (!a || !b) continue; // not hex or rgb(), or see-through: not checked
      const ratio = contrastRatio(a, b);
      if (ratio < TEXT_CONTRAST) {
        const shown = (Math.floor(ratio * 100) / 100).toFixed(2);
        add('DL015', `${fgName} (${fg.value.trim()}) on ${bgName} (${bg.value.trim()}) is ${shown}:1. Normal text needs at least ${TEXT_CONTRAST}:1.`, changed?.get(fgName) ?? changed?.get(bgName) ?? fg);
      }
    }
  };
  checkPalette(base, null);
  for (const tokens of themes.values()) checkPalette(new Map([...base, ...tokens]), tokens);

  return issues;
}

// ---------------------------------------------------------------------------
// 5. Markup checks
// ---------------------------------------------------------------------------

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Blank out comments, scripts and style blocks (keeping new lines) so they cannot cause false matches. */
function blankNonMarkup(html) {
  const blank = (m) => m.replace(/[^\n]/g, ' ');
  // Keep the opening tag (a script's src attribute still matters) and blank only what is inside it.
  const blankInside = (m, open, inside, close) => open + blank(inside) + close;
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, blankInside)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, blankInside);
}

// Attribute helpers. Quoted values are emptied first, so words inside a value (title="an alt text") do not count as attributes.
const hasAttr = (tag, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/|>|$)`, 'i').test(tag.replace(/^<\w+/, ' ').replace(/"[^"]*"|'[^']*'/g, '""'));
const attrValue = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag.replace(/^<\w+/, ' '));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

/**
 * Check HTML documents or fragments.
 * @param {{ file: string, html: string }[]} sources
 */
export function lintMarkup(sources) {
  const issues = [];
  for (const { file, html: original } of sources) {
    const html = blankNonMarkup(original);
    const add = (code, message, index) => issues.push(makeIssue(code, message, file, lineAt(original, index)));
    const isDocument = /<html[\s>]/i.test(html);

    if (isDocument) {
      const htmlTag = /<html\b[^>]*>/i.exec(html);
      const lang = attrValue(htmlTag[0], 'lang');
      if (!lang || !lang.trim()) add('DL001', 'The <html> tag has no lang attribute.', htmlTag.index);

      const viewport = [...html.matchAll(/<meta\b[^>]*>/gi)].find((m) => /^viewport$/i.test(attrValue(m[0], 'name') ?? ''));
      if (!viewport) {
        add('DL002', 'No <meta name="viewport"> was found.', htmlTag.index);
      } else {
        const content = attrValue(viewport[0], 'content') ?? '';
        const noScale = /user-scalable\s*=\s*(no|0)\b/i.test(content);
        const maxScale = /maximum-scale\s*=\s*([\d.]+)/i.exec(content);
        if (noScale || (maxScale && parseFloat(maxScale[1]) < 2)) add('DL003', `The viewport content "${content}" blocks zooming.`, viewport.index);
      }

      const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      if (!title || !title[1].trim()) add('DL006', 'There is no <title>, or it is empty.', title ? title.index : htmlTag.index);

      const description = [...html.matchAll(/<meta\b[^>]*>/gi)].find((m) => /^description$/i.test(attrValue(m[0], 'name') ?? '') && (attrValue(m[0], 'content') ?? '').trim());
      if (!description) add('DL007', 'There is no <meta name="description"> with content.', htmlTag.index);

      if (!/<main[\s>]/i.test(html)) add('DL010', 'There is no <main> element.', htmlTag.index);

      const h1s = [...html.matchAll(/<h1\b/gi)];
      if (h1s.length !== 1) add('DL008', `Found ${h1s.length} <h1> elements; expected exactly 1.`, h1s[1]?.index ?? htmlTag.index);
    }

    let previous = 0;
    for (const m of html.matchAll(/<h([1-6])\b/gi)) {
      const level = Number(m[1]);
      if (previous > 0 && level > previous + 1) add('DL009', `A <h${level}> follows a <h${previous}>, so level ${previous + 1} is skipped.`, m.index);
      previous = level;
    }

    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!hasAttr(m[0], 'alt')) add('DL004', 'An <img> has no alt attribute.', m.index);
      if (!hasAttr(m[0], 'width') || !hasAttr(m[0], 'height')) add('DL005', 'An <img> is missing width or height.', m.index);
    }

    const placeholder = /lorem ipsum|dolor sit amet|\byour (?:text|headline|title|company|logo|tagline) here\b|\binsert (?:text|image|headline|logo)\b|\bcompany name\b/i;
    const textOnly = html.replace(/<[^>]*>/g, (tag) => tag.replace(/[^\n]/g, ' ')); // keep text, drop tags and attributes
    for (const line of textOnly.split('\n').entries()) {
      const found = placeholder.exec(line[1]);
      if (found) issues.push(makeIssue('DL013', `Found "${found[0]}".`, file, line[0] + 1));
    }
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const alt = attrValue(m[0], 'alt') ?? '';
      const found = placeholder.exec(alt);
      if (found) add('DL013', `An image alt text contains "${found[0]}".`, m.index);
    }

    for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
      if ((attrValue(m[0], 'href') ?? '').trim() === '#') add('DL014', 'An <a> has href="#".', m.index);
    }

    for (const m of html.matchAll(/<(img|script|source|video|audio|iframe|link)\b[^>]*>/gi)) {
      const tag = m[0];
      const isLink = /^<link/i.test(tag);
      const attr = isLink ? 'href' : 'src';
      const target = attrValue(tag, attr) ?? '';
      if (!/^(?:https?:)?\/\//i.test(target)) continue;
      if (isLink && /canonical|alternate|author|me|dns-prefetch/i.test(attrValue(tag, 'rel') ?? '')) continue;
      add('DL017', `<${m[1].toLowerCase()}> loads ${target} from another website.`, m.index);
    }
  }
  return issues;
}

// ---------------------------------------------------------------------------
// 6. Files and the command line
// ---------------------------------------------------------------------------

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const found = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) found.push(...collectFiles(full));
    else if (/\.(css|html?)$/i.test(entry.name)) found.push(full);
  }
  return found.sort();
}

export function lintPaths(targets) {
  const files = [...new Set(targets.flatMap(collectFiles))];
  const sources = [];
  const markup = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/\.css$/i.test(file)) {
      sources.push({ file, css: text });
    } else {
      for (const css of extractStyleBlocks(text)) sources.push({ file, css });
      markup.push({ file, html: text });
    }
  }
  const issues = [...lintSources(sources), ...lintMarkup(markup)];
  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return { files, issues };
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const targets = argv.filter((a) => !a.startsWith('--'));
  const known = new Set(['--strict', '--json', '--help']);
  const unknown = [...flags].filter((f) => !known.has(f));

  if (flags.has('--help') || targets.length === 0 || unknown.length) {
    const lines = [
      unknown.length ? `Unknown option: ${unknown.join(', ')}` : '',
      'Usage: node design-lint.mjs <file-or-folder> [more paths] [--strict] [--json]',
      '  --strict  treat warnings as errors',
      '  --json    machine-readable output',
    ].filter(Boolean);
    (flags.has('--help') ? console.log : console.error)(lines.join('\n'));
    return flags.has('--help') ? 0 : 2;
  }

  let result;
  try {
    result = lintPaths(targets);
  } catch (error) {
    console.error(`Could not read the files: ${error.message}`);
    return 2;
  }

  const strict = flags.has('--strict');
  const severityOf = (i) => (strict && i.severity === 'warning' ? 'error' : i.severity);
  const errors = result.issues.filter((i) => severityOf(i) === 'error').length;
  const warnings = result.issues.length - errors;

  if (flags.has('--json')) {
    console.log(JSON.stringify({
      tool: 'vyson-design-lint',
      kind: 'static',
      note: 'Static text checks only. No browser was opened and no design review was done.',
      filesChecked: result.files.length,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON design lint (static checks only: no browser was opened, no design review was done)');
  console.log(`Checked: ${result.files.length} file${result.files.length === 1 ? '' : 's'}\n`);
  if (result.files.length === 0) console.log('No .css or .html files were found in the paths you gave.\n');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${path.relative(process.cwd(), i.file) || i.file}:${i.line}  ${i.code}  ${i.title}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Static checks only. Passing does not replace the design review and browser checks in references/quality-checks.md.');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
