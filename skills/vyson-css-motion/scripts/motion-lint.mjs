#!/usr/bin/env node
// motion-lint: a small checker for the motion rules in the vyson-css-motion skill.
//
// It reads .css files, <style> blocks inside .html files, .js/.mjs files and
// inline <script> blocks, and reports common motion problems: layout animation,
// "transition: all", missing reduced-motion handling, endless loops, very long
// durations, scroll-event listeners, hover movement on touch screens, tiny tap
// targets, broken aria-expanded wiring and content that is hidden by default.
//
// IT IS A STATIC CHECKER. It only reads text. It never opens a browser, so it
// cannot tell you how the page looks, how smooth it is, whether a rule really
// wins in the cascade, or whether a script does what it should. Passing it is
// NOT a browser test. The browser checks are described in
// references/verification.md.
//
// It has NO dependencies and works on its own, so it still works after the
// skill has been installed into a project. It cannot see inline style=""
// attributes, CSS that JavaScript creates at run time, or other file types.
//
// Usage:   node motion-lint.mjs <file-or-folder> [more paths] [--strict] [--json]
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  ML001: {
    severity: 'error',
    title: 'Transition on "all", or no property named',
    fix: 'Name the properties, for example "transition: transform 200ms, opacity 200ms".',
  },
  ML002: {
    severity: 'error',
    title: 'Animating a layout property',
    fix: 'Animate transform and opacity instead (translate, scale, fade). Layout properties make the browser re-measure the page on every frame.',
  },
  ML003: {
    severity: 'error',
    title: 'Motion without any prefers-reduced-motion handling',
    fix: 'Put the motion inside "@media (prefers-reduced-motion: no-preference) { ... }" or add a "reduce" block that removes it.',
  },
  ML004: {
    severity: 'warning',
    title: 'Endless animation with no reduced-motion switch-off',
    fix: 'Start loops only inside "@media (prefers-reduced-motion: no-preference)", or turn them off in a "reduce" block. Moving content that runs for more than 5 seconds also needs a pause control.',
  },
  ML005: {
    severity: 'warning',
    title: 'Too many will-change declarations',
    fix: 'Use will-change on at most 3 elements, and only on things that animate again and again. Remove the rest.',
  },
  ML006: {
    severity: 'warning',
    title: 'Very long duration',
    fix: 'Keep one-off transitions and entrances at 1000ms or less. Long motion feels slow and is harder to make accessible.',
  },
  ML007: {
    severity: 'warning',
    title: 'Smooth scrolling without a reduced-motion guard',
    fix: 'Set "scroll-behavior: smooth" only inside "@media (prefers-reduced-motion: no-preference)".',
  },
  ML008: {
    severity: 'warning',
    title: 'Scroll-driven animation without @supports',
    fix: 'Wrap "animation-timeline" in "@supports (animation-timeline: view())" so browsers without it still show the content normally.',
  },
  ML009: {
    severity: 'warning',
    title: 'Animating a paint-heavy property',
    fix: 'Prefer transform and opacity. If you need a glow or shadow change, fade a second layer with opacity instead.',
  },
  ML010: {
    severity: 'warning',
    title: 'Scroll-event listener',
    fix: 'Use an IntersectionObserver to react when something enters the screen, or CSS animation-timeline inside @supports. Scroll listeners run on the main thread while the user scrolls.',
  },
  ML011: {
    severity: 'warning',
    title: 'Hover movement not limited to devices that hover',
    fix: 'Put hover movement inside "@media (hover: hover) and (pointer: fine) { ... }". On a touch screen a hover effect can get stuck after a tap. Give touch users press feedback with :active instead.',
  },
  ML012: {
    severity: 'warning',
    title: 'Interactive element with a very small explicit size',
    fix: 'Give buttons, links and toggles a touch area of at least 44 by 44 CSS pixels on touch screens, and never below 24 by 24 (WCAG 2.2 level AA). Add padding or min-height instead of a tiny fixed size.',
  },
  ML013: {
    severity: 'warning',
    title: 'aria-expanded control is not wired up properly',
    fix: 'Use a real <button type="button"> (so Enter and Space work), give it aria-controls with the id of the panel it opens, and make sure that panel exists in the page.',
  },
  ML014: {
    severity: 'warning',
    title: 'Content hidden by default without a script gate',
    fix: 'Keep content visible by default. Hide it only under a class that the script adds after it has started (for example ".js-panels" or ".vy-js"), so the content is still readable if the script fails or is blocked.',
  },
};

const MAX_DURATION_MS = 1000;
const MIN_TARGET_PX = 24; // WCAG 2.2 level AA minimum (SC 2.5.8). The skill aims for 44 on touch screens.
const MAX_WILL_CHANGE = 3;

const LAYOUT_PROP =
  /^(width|height|min-width|min-height|max-width|max-height|top|left|right|bottom|inset(-[a-z]+)*|margin(-[a-z]+)*|padding(-[a-z]+)*|border(-[a-z]+)*-width|font-size|line-height|letter-spacing|flex-basis|gap|row-gap|column-gap|grid-template-columns)$/;
const PAINT_PROP = /^(box-shadow|filter|backdrop-filter|background-position)$/;
const TIMING_WORDS = new Set([
  'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end',
  'normal', 'reverse', 'alternate', 'alternate-reverse', 'infinite', 'none',
  'forwards', 'backwards', 'both', 'running', 'paused', 'allow-discrete', 'initial', 'inherit', 'unset',
]);

// ---------------------------------------------------------------------------
// 1. A tiny CSS reader
// ---------------------------------------------------------------------------

function blankComments(text) {
  // Replace comment characters by spaces but keep new lines, so line numbers stay correct.
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * Turn CSS text into a flat list of declarations.
 * Each declaration remembers the at-rules it sits inside (its "context").
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

function extractStyleBlocks(html) {
  // Returns CSS text per <style> block, padded with new lines so line numbers match the HTML file.
  const blocks = [];
  const pattern = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const before = html.slice(0, match.index + match[0].indexOf('>') + 1);
    const startLine = before.split('\n').length;
    blocks.push('\n'.repeat(startLine - 1) + match[1]);
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// 2. Small helpers
// ---------------------------------------------------------------------------

const inKeyframes = (ctx) => ctx.some((p) => /^@(-[a-z]+-)?keyframes\b/i.test(p));
const inReduce = (ctx) => ctx.some((p) => /^@media/i.test(p) && /prefers-reduced-motion\s*:\s*reduce/i.test(p));
const inNoPreference = (ctx) => ctx.some((p) => /^@media/i.test(p) && /prefers-reduced-motion\s*:\s*no-preference/i.test(p));
const inSupports = (ctx) => ctx.some((p) => /^@supports/i.test(p));
const inHoverGuard = (ctx) => ctx.some((p) => /^@media/i.test(p) && /\((any-)?hover\s*:\s*hover\)/i.test(p));
const inIgnoredAtRule = (ctx) => ctx.some((p) => /^@(starting-style|media[^{]*\bprint\b)/i.test(p));

/** The selector of a declaration: the last item of its context. */
const selectorOf = (ctx) => (ctx.length ? ctx[ctx.length - 1] : '');

const MOVEMENT_PROP = /^(transform|translate|scale|rotate)$/;
const SIZE_PROP = /^(height|min-height|width|min-width|block-size|inline-size|min-block-size|min-inline-size)$/;
const PSEUDO_ELEMENT = /::?(before|after|placeholder|marker|backdrop)\b/i;
const STATE_SELECTOR = /:(hover|focus|focus-visible|focus-within|active|checked|target|disabled|not\()|\[open\]|\[hidden\]|\[aria-hidden/i;
const SCRIPT_GATE = /\.(js|no-js|vy-js)(?![\w-])|\.js-[\w-]+/i;
const VISUALLY_HIDDEN = /sr-only|visually-hidden|screen-reader|skip-link|skip-to/i;

/** True when a selector looks like something people press or tap. */
function looksInteractive(selector) {
  return selector.split(',').some((part) => {
    const p = part.trim();
    return (
      /(^|[\s>+~])(a|button|input|select|textarea|summary)(?![\w-])/i.test(p) ||
      /\[role=["']?(button|link|tab|menuitem|switch|checkbox|radio)/i.test(p) ||
      /\.[\w-]*(btn|button|toggle|link|tab|chip|pill|close|tap)[\w-]*/i.test(p)
    );
  });
}

/** A plain length in CSS pixels, or null when it is not a simple px, rem or em value. */
function toPx(value) {
  const m = /^(\d*\.?\d+)(px|rem|em)$/i.exec(value.trim());
  if (!m) return null;
  return m[2].toLowerCase() === 'px' ? parseFloat(m[1]) : parseFloat(m[1]) * 16;
}

/** True when a declaration hides content (collapsed, transparent or invisible). */
function hidesContent(prop, value) {
  return (
    (prop === 'opacity' && /^0(\.0+)?$/.test(value)) ||
    (prop === 'visibility' && /^hidden$/i.test(value)) ||
    (prop === 'grid-template-rows' && /^0fr$/i.test(value)) ||
    ((prop === 'height' || prop === 'max-height') && /^0(px|rem|em)?$/i.test(value))
  );
}

function splitTopLevel(value, separator) {
  // Split on a separator but not inside parentheses, e.g. cubic-bezier(0.2, 0, 0, 1).
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === separator && depth === 0) { parts.push(current.trim()); current = ''; } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function resolveVars(value, vars, depth = 0) {
  if (depth > 4) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (all, name, fallback) => {
    if (vars.has(name)) return resolveVars(vars.get(name), vars, depth + 1);
    return fallback !== undefined ? fallback.trim() : all;
  });
}

function timeToMs(token) {
  const m = /^(-?\d*\.?\d+)(ms|s)$/i.exec(token);
  if (!m) return null;
  return m[2].toLowerCase() === 's' ? parseFloat(m[1]) * 1000 : parseFloat(m[1]);
}

/** Words of one shorthand part, keeping things like cubic-bezier(0.2, 0, 0, 1) in one piece. */
function words(part) {
  return splitTopLevel(part.replace(/\s+/g, ' '), ' ').filter(Boolean);
}

/** Properties named in a "transition" shorthand or "transition-property" value. */
function transitionProperties(prop, value) {
  if (prop === 'transition-property') return splitTopLevel(value, ',').map((p) => p.toLowerCase());
  return splitTopLevel(value, ',').map((part) => {
    const name = words(part).find(
      (w) => timeToMs(w) === null && !TIMING_WORDS.has(w.toLowerCase()) && !/^(cubic-bezier|steps|linear)\(/i.test(w),
    );
    return name ? name.toLowerCase() : 'all'; // no property named means "all"
  });
}

/** The first time value (the duration) of each comma-separated part of a shorthand. */
function shorthandParts(value) {
  return splitTopLevel(value, ',').map((part) => {
    const first = words(part).find((w) => timeToMs(w) !== null);
    return {
      ms: first === undefined ? null : timeToMs(first),
      looping: /\binfinite\b/i.test(part),
      none: /^none$/i.test(part.trim()),
    };
  });
}

// ---------------------------------------------------------------------------
// 3. The checks
// ---------------------------------------------------------------------------

function makeIssue(code, message, file, line) {
  const rule = RULES[code];
  return { code, severity: rule.severity, title: rule.title, message, fix: rule.fix, file, line };
}

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

  // Custom properties (CSS variables), so that "var(--motion-slow)" can be understood.
  const vars = new Map();
  for (const d of all) if (d.prop.startsWith('--')) vars.set(d.prop, d.value);

  const issues = [];
  const add = (code, message, d) => issues.push(makeIssue(code, message, d.file, d.line));

  let firstMotion = null;
  let hasReduceBlock = false;
  let hasNoPreferenceBlock = false;
  let reduceTouchesAnimation = false;
  let reduceTouchesScroll = false;
  const willChange = [];

  for (const d of all) {
    const ctx = d.context;
    if (inReduce(ctx)) {
      hasReduceBlock = true;
      if (/^animation(-|$)/.test(d.prop)) reduceTouchesAnimation = true;
      if (d.prop === 'scroll-behavior') reduceTouchesScroll = true;
      continue; // Rules inside a "reduce" block are there to remove motion, so they are not checked.
    }
    if (inNoPreference(ctx)) hasNoPreferenceBlock = true;
  }
  // A "reduce" block that has no declarations is still a block, so also look at the raw text.
  for (const { css } of sources) {
    if (/@media[^{]*prefers-reduced-motion\s*:\s*reduce/i.test(css)) hasReduceBlock = true;
    if (/@media[^{]*prefers-reduced-motion\s*:\s*no-preference/i.test(css)) hasNoPreferenceBlock = true;
  }

  for (const d of all) {
    const ctx = d.context;
    if (inReduce(ctx) || d.prop.startsWith('--')) continue;
    const value = resolveVars(d.value, vars);
    const keyframes = inKeyframes(ctx);

    // --- checks that are about layout and touch, not only about motion ---
    if (!keyframes && !inIgnoredAtRule(ctx)) {
      const selector = selectorOf(ctx);

      // Hover movement must be limited to devices that hover.
      if (MOVEMENT_PROP.test(d.prop) && /:hover/i.test(selector) && !/^none$/i.test(value) && !inHoverGuard(ctx)) {
        add('ML011', `"${selector}" sets ${d.prop} on hover outside a (hover: hover) media query.`, d);
      }

      // Tiny interactive targets, when the size is written out as a plain length.
      if (SIZE_PROP.test(d.prop) && looksInteractive(selector) && !PSEUDO_ELEMENT.test(selector)) {
        const px = toPx(value);
        if (px !== null && px > 0 && px < MIN_TARGET_PX) {
          add('ML012', `"${selector}" sets ${d.prop}: ${d.value} (about ${Math.round(px)}px; the floor is ${MIN_TARGET_PX}px).`, d);
        }
      }

      // Content hidden by default, with nothing to say a script will show it again.
      if (
        hidesContent(d.prop, value) &&
        !SCRIPT_GATE.test(ctx.join(' ')) &&
        !PSEUDO_ELEMENT.test(selector) &&
        !STATE_SELECTOR.test(selector) &&
        !VISUALLY_HIDDEN.test(selector)
      ) {
        add('ML014', `"${selector}" sets ${d.prop}: ${d.value} with no script-gate class in the selector.`, d);
      }
    }

    // --- keyframes content ---
    if (keyframes) {
      if (LAYOUT_PROP.test(d.prop)) add('ML002', `@keyframes animates "${d.prop}".`, d);
      else if (PAINT_PROP.test(d.prop)) add('ML009', `@keyframes animates "${d.prop}".`, d);
      continue;
    }

    // --- transitions ---
    if (d.prop === 'transition' || d.prop === 'transition-property') {
      if (d.prop === 'transition' && /^(none|initial|inherit|unset)$/i.test(value)) continue;
      for (const name of transitionProperties(d.prop, value)) {
        if (name === 'all') add('ML001', `${d.prop}: ${d.value}`, d);
        else if (LAYOUT_PROP.test(name)) add('ML002', `Transition on "${name}".`, d);
        else if (PAINT_PROP.test(name)) add('ML009', `Transition on "${name}".`, d);
      }
    }

    // --- durations, and remembering the first piece of real motion ---
    if (d.prop === 'transition' || d.prop === 'animation') {
      for (const { ms, looping, none } of shorthandParts(value)) {
        const moves = d.prop === 'animation' ? !none : ms !== null && ms > 0;
        if (moves && !firstMotion) firstMotion = d;
        if (ms !== null && ms > MAX_DURATION_MS && !looping) add('ML006', `${d.prop} runs for ${ms}ms.`, d);
      }
    } else if (d.prop === 'transition-duration' || d.prop === 'animation-duration') {
      for (const part of splitTopLevel(value, ',')) {
        const ms = timeToMs(part);
        if (ms !== null && ms > 0 && d.prop === 'transition-duration' && !firstMotion) firstMotion = d;
        // Only transitions are length-checked here. A separate "animation-duration" may belong to a
        // slow ambient loop, and this checker cannot tell which, so it stays quiet to avoid false alarms.
        if (ms !== null && ms > MAX_DURATION_MS && d.prop === 'transition-duration') add('ML006', `${d.prop} is ${ms}ms.`, d);
      }
    } else if (d.prop === 'animation-name' && !/^none$/i.test(value) && !firstMotion) {
      firstMotion = d;
    }

    // --- endless loops ---
    if ((d.prop === 'animation' || d.prop === 'animation-iteration-count') && /\binfinite\b/i.test(value)) {
      if (!inNoPreference(ctx) && !reduceTouchesAnimation) add('ML004', `${d.prop}: ${d.value}`, d);
    }

    // --- smooth scrolling ---
    if (d.prop === 'scroll-behavior' && /smooth/i.test(value) && !inNoPreference(ctx) && !reduceTouchesScroll) {
      add('ML007', 'scroll-behavior: smooth', d);
    }

    // --- scroll-driven animation ---
    if (d.prop === 'animation-timeline' && !inSupports(ctx)) add('ML008', `animation-timeline: ${d.value}`, d);

    // --- will-change ---
    if (d.prop === 'will-change' && !/^auto$/i.test(value)) willChange.push(d);
  }

  if (willChange.length > MAX_WILL_CHANGE) {
    add('ML005', `Found ${willChange.length} will-change declarations (limit ${MAX_WILL_CHANGE}).`, willChange[MAX_WILL_CHANGE]);
  }
  if (firstMotion && !hasReduceBlock && !hasNoPreferenceBlock) {
    add('ML003', 'No "prefers-reduced-motion" rule was found in the files that were checked.', firstMotion);
  }

  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return issues;
}

// ---------------------------------------------------------------------------
// 3b. Script and HTML checks (also static: they only read text)
// ---------------------------------------------------------------------------

function blankJsComments(text) {
  // Keep line breaks so line numbers stay correct.
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}(,])\/\/[^\n]*/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length));
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/**
 * ML010: scroll-event listeners in scripts.
 * @param {{ file: string, js: string, startLine?: number }[]} sources
 */
export function lintScripts(sources) {
  const issues = [];
  for (const { file, js, startLine = 1 } of sources) {
    const text = blankJsComments(js);
    const patterns = [
      /addEventListener\(\s*['"`]scroll['"`]/g,
      /\bonscroll\s*=/g,
    ];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        issues.push(makeIssue('ML010', 'A script listens for the scroll event.', file, startLine - 1 + lineAt(text, match.index)));
      }
    }
  }
  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return issues;
}

/** Inline <script> blocks (those without src) of an HTML file, with the line they start on. */
function extractInlineScripts(html) {
  const blocks = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    if (/\bsrc\s*=/i.test(match[1])) continue;
    const bodyStart = match.index + match[0].indexOf('>') + 1;
    blocks.push({ js: match[2], startLine: lineAt(html, bodyStart) });
  }
  return blocks;
}

/**
 * ML013: aria-expanded controls in HTML.
 * @param {{ file: string, html: string }[]} sources
 */
export function lintMarkup(sources) {
  const issues = [];
  for (const { file, html } of sources) {
    const visible = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
    const ids = new Set([...visible.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]));
    const tagPattern = /<([a-z][\w-]*)\b([^>]*\baria-expanded\b[^>]*)>/gi;
    let match;
    while ((match = tagPattern.exec(visible)) !== null) {
      const tag = match[1].toLowerCase();
      const attrs = match[2];
      const line = lineAt(visible, match.index);
      const controls = /\baria-controls\s*=\s*["']([^"']*)["']/i.exec(attrs);
      if (!['button', 'summary', 'a', 'input'].includes(tag)) {
        issues.push(makeIssue('ML013', `<${tag}> has aria-expanded but is not a button, so Enter and Space may not work.`, file, line));
      }
      if (tag !== 'summary' && !controls) {
        issues.push(makeIssue('ML013', `<${tag}> has aria-expanded but no aria-controls.`, file, line));
      } else if (controls && !controls[1].split(/\s+/).every((id) => ids.has(id))) {
        issues.push(makeIssue('ML013', `aria-controls="${controls[1]}" points to an id that is not in this file.`, file, line));
      }
      if (tag === 'button' && !/\btype\s*=/i.test(attrs)) {
        issues.push(makeIssue('ML013', '<button> with aria-expanded has no type attribute (inside a form it would submit the form).', file, line));
      }
    }
  }
  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return issues;
}

// ---------------------------------------------------------------------------
// 4. Files and the command line
// ---------------------------------------------------------------------------

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const found = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) found.push(...collectFiles(full));
    else if (/\.(css|html?|m?js)$/i.test(entry.name)) found.push(full);
  }
  return found.sort();
}

export function lintPaths(targets) {
  const files = [...new Set(targets.flatMap(collectFiles))];
  const sources = [];
  const scripts = [];
  const markup = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/\.css$/i.test(file)) sources.push({ file, css: text });
    else if (/\.m?js$/i.test(file)) scripts.push({ file, js: text });
    else {
      for (const css of extractStyleBlocks(text)) sources.push({ file, css });
      for (const block of extractInlineScripts(text)) scripts.push({ file, ...block });
      markup.push({ file, html: text });
    }
  }
  const issues = [...lintSources(sources), ...lintScripts(scripts), ...lintMarkup(markup)];
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
      'Usage: node motion-lint.mjs <file-or-folder> [more paths] [--strict] [--json]',
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
      tool: 'vyson-motion-lint',
      kind: 'static',
      note: 'Static text checks only. No browser was opened.',
      filesChecked: result.files.length,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON motion lint (static checks only: no browser was opened)');
  console.log(`Checked: ${result.files.length} file${result.files.length === 1 ? '' : 's'}\n`);
  if (result.files.length === 0) console.log('No .css, .html or .js files were found in the paths you gave.\n');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${path.relative(process.cwd(), i.file) || i.file}:${i.line}  ${i.code}  ${i.title}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Static checks only. Passing does not replace the browser checks in references/verification.md.');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
