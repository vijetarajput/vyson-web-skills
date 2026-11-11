#!/usr/bin/env node
// frontend-lint: a small checker for the basics in the vyson-frontend-development skill.
//
// It reads .html, .js, .mjs, .jsx, .ts, .tsx and .vue files (for .vue files it
// checks the <script> blocks and v-html; it does not check the template's
// labels or buttons) and reports common
// frontend problems: form controls without labels, HTML built from variables
// (a cross-site scripting risk), eval and javascript: links, secrets written
// into client code, network calls with no status check or error handling,
// click handlers on elements that cannot be reached with a keyboard, buttons
// with no name, render-blocking scripts, scripts from other websites,
// missing autocomplete hints, left-over debugging, tokens kept in
// localStorage, and password forms that would send the password in the address.
//
// IT IS A STATIC CHECKER. It only reads text. It never runs your code and never
// opens a browser, so it cannot tell you whether the app works, whether a form
// behaves, whether data is safe, or whether a component is accessible. Passing
// it is NOT a test of behaviour and NOT a security review. See references/quality-and-security.md.
//
// The checks are text patterns, so they can miss a problem and can flag code that
// is fine. To silence a finding you have reviewed, put a comment on the same line
// or the line above:   // vyson-ok: FD002 the text is escaped by escapeHtml()
// (the code must be in the comment, and a reason is expected).
//
// It has NO dependencies and works on its own, so it still works after the
// skill has been installed into a project.
//
// Usage:   node frontend-lint.mjs <file-or-folder> [more paths] [--strict] [--json]
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  FD001: {
    severity: 'error',
    title: 'Form control without a label',
    fix: 'Give every input, select and textarea a visible <label for="id"> (or wrap it in a <label>). Use aria-label only when a visible label is impossible. A placeholder is not a label.',
  },
  FD002: {
    severity: 'error',
    title: 'HTML is built from a variable',
    fix: 'Do not put variables into innerHTML, outerHTML, insertAdjacentHTML, document.write, dangerouslySetInnerHTML or v-html. Build elements with createElement and set textContent, or escape every value and add "// vyson-ok: FD002 <reason>" after reviewing it.',
  },
  FD003: {
    severity: 'error',
    title: 'eval, new Function or a javascript: link',
    fix: 'Remove eval, new Function and string arguments to setTimeout or setInterval, and use real functions. Replace javascript: links with a button and an event listener.',
  },
  FD004: {
    severity: 'error',
    title: 'A secret appears to be written into client code',
    fix: 'Anything in client code is public. Move the secret to a server or serverless function and read it there from an environment variable. Revoke a key that was ever committed.',
  },
  FD005: {
    severity: 'warning',
    title: 'fetch without a status check',
    fix: 'fetch only rejects on network failure. Check response.ok (or response.status) and handle 4xx and 5xx responses before reading the body.',
  },
  FD006: {
    severity: 'warning',
    title: 'fetch without error handling',
    fix: 'Add try/catch (or .catch) and show the visitor an error state with a retry option, not a blank area or an unhandled promise rejection.',
  },
  FD007: {
    severity: 'warning',
    title: 'Click handler on an element a keyboard cannot reach',
    fix: 'Use a <button> for actions and an <a href> for navigation. A div or span with onclick cannot be reached with Tab and has no role.',
  },
  FD008: {
    severity: 'warning',
    title: 'Inline event handler attribute',
    fix: 'Replace onclick="..." and similar attributes with addEventListener in a script file. Inline handlers mix behaviour into markup and block a strict Content Security Policy.',
  },
  FD009: {
    severity: 'warning',
    title: 'Button or link with no accessible name',
    fix: 'Put text inside the control, or add aria-label (for an icon-only button). Screen readers announce just "button" otherwise.',
  },
  FD010: {
    severity: 'warning',
    title: 'A script in the head blocks the page',
    fix: 'Add defer (or type="module", which defers by default) so the page can render while the script downloads.',
  },
  FD011: {
    severity: 'warning',
    title: 'A script is loaded from another website',
    fix: 'Prefer a pinned local copy (check its licence). If you must load it from elsewhere, add integrity="..." and crossorigin="anonymous", and know that the other site can change what your visitors run.',
  },
  FD012: {
    severity: 'warning',
    title: 'A personal-data field has no autocomplete hint',
    fix: 'Add autocomplete="email", "name", "tel", "current-password", "new-password" and so on. It helps password managers and people filling forms on a phone.',
  },
  FD013: {
    severity: 'warning',
    title: 'Debugging code left in',
    fix: 'Remove console.log and debugger statements before shipping, or route them through a logging helper that is off in production.',
  },
  FD014: {
    severity: 'warning',
    title: 'A token or password is stored in localStorage or sessionStorage',
    fix: 'Any script on the page can read these stores. Prefer an HttpOnly cookie set by the server for sessions.',
  },
  FD015: {
    severity: 'error',
    title: 'A password form does not use POST',
    fix: 'A form without method="post" sends its fields in the address bar, where they end up in history and logs. Add method="post".',
  },
};

const JS_EXT = /\.(?:m?js|cjs|jsx|tsx?)$/i;
const blank = (text) => text.replace(/[^\n]/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

function stripJsComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\"'`])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
}

/** Keep only the bodies of inline <script> blocks (same line numbers as the original). */
function inlineScriptView(html) {
  const out = [];
  let cursor = 0;
  for (const m of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi)) {
    out.push(blank(html.slice(cursor, m.index + m[1].length)));
    out.push(/\bsrc\s*=/i.test(m[1]) ? blank(m[2]) : m[2]);
    cursor = m.index + m[1].length + m[2].length;
  }
  out.push(blank(html.slice(cursor)));
  return out.join('');
}

function markupView(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, inside, close) => open + blank(inside) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, inside, close) => open + blank(inside) + close);
}

const hasAttr = (tag, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/|>|$)`, 'i').test(tag.replace(/^<\w+/, ' ').replace(/"[^"]*"|'[^']*'/g, '""'));
const attrValue = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag.replace(/^<\w+/, ' '));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

const NON_INTERACTIVE = new Set(['div', 'span', 'li', 'p', 'img', 'td', 'tr', 'section', 'article', 'header', 'footer', 'main', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'svg', 'i', 'b', 'strong', 'em']);
const PERSONAL_NAME = /^(?:name|full-?name|first-?name|last-?name|given-?name|family-?name|email|e-?mail|tel|phone|address|street|city|postal|postcode|zip|country|username|user|password|new-?password|current-?password)$/i;

/** Is this JavaScript expression text a plain string with nothing variable in it? */
function isPlainString(expression) {
  const text = expression.trim().replace(/;$/, '').trim();
  if (text === '') return true;
  const m = /^(['"`])([\s\S]*)\1$/.exec(text);
  if (!m) return false;
  if (m[1] === '`' && m[2].includes('${')) return false;
  return !new RegExp(`(?<!\\\\)${m[1] === '`' ? '`' : m[1]}`).test(m[2]);
}

/**
 * Check a set of files.
 * @param {{ file: string, text: string }[]} sources .html and script files
 * @returns {object[]} issues
 */
export function lintSources(sources) {
  const issues = [];

  for (const { file, text } of sources) {
    const isHtml = /\.html?$/i.test(file);
    const original = text.split('\n');
    const isVue = /\.vue$/i.test(file);
    const code = stripJsComments(isHtml || isVue ? inlineScriptView(text) : text);
    const markup = isHtml ? markupView(text) : '';

    const suppressed = (code_, lineNumber) => {
      const here = original[lineNumber - 1] ?? '';
      const above = original[lineNumber - 2] ?? '';
      const re = new RegExp(`vyson-ok:?\\s+[^\\n]*\\b${code_}\\b`, 'i');
      return re.test(here) || re.test(above);
    };
    const add = (ruleCode, message, index, source = text) => {
      const line = lineAt(source, index);
      if (suppressed(ruleCode, line)) return;
      const rule = RULES[ruleCode];
      issues.push({ code: ruleCode, severity: rule.severity, title: rule.title, fix: rule.fix, message, file, line });
    };

    // --- script checks ---------------------------------------------------
    for (const m of code.matchAll(/\.(innerHTML|outerHTML)\s*(\+?=)(?!=)\s*([^;\n]*)/g)) {
      if (!isPlainString(m[3])) add('FD002', `${m[1]} is set from something that is not a plain string.`, m.index, code);
    }
    for (const m of code.matchAll(/\binsertAdjacentHTML\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*([^;\n]*?)\)\s*;?\s*(?:\n|$)/g)) {
      if (!isPlainString(m[2])) add('FD002', 'insertAdjacentHTML is called with something that is not a plain string.', m.index, code);
    }
    for (const m of code.matchAll(/\bdocument\.write(?:ln)?\s*\(/g)) add('FD002', 'document.write() writes HTML from code.', m.index, code); // vyson-ok: FD002 this line is the checker's own pattern
    for (const m of code.matchAll(/\bdangerouslySetInnerHTML\b/g)) add('FD002', 'dangerouslySetInnerHTML inserts raw HTML.', m.index, code); // vyson-ok: FD002 this line is the checker's own pattern

    for (const m of code.matchAll(/\beval\s*\(|\bnew\s+Function\s*\(|\bset(?:Timeout|Interval)\s*\(\s*['"`]/g)) {
      add('FD003', `Found "${m[0].replace(/\s+/g, ' ')}".`, m.index, code);
    }
    for (const m of text.matchAll(/(?:href|src|action|formaction)\s*=\s*["']\s*javascript:/gi)) add('FD003', 'A javascript: address is used.', m.index);

    const secretNamed = /(?:api[_-]?key|secret|token|passw(?:or)?d|private[_-]?key|access[_-]?key|auth)\w*['"]?\s*[:=]\s*['"]([A-Za-z0-9_\-./+=]{16,})['"]/gi;
    for (const m of text.matchAll(secretNamed)) add('FD004', `A long string is assigned to a secret-looking name (starts "${m[1].slice(0, 3)}...", ${m[1].length} characters).`, m.index);
    for (const m of text.matchAll(/\bsk_live_[A-Za-z0-9]{10,}|\bAKIA[0-9A-Z]{16}\b|\bghp_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g)) {
      add('FD004', `A string that looks like a real credential was found (starts "${m[0].slice(0, 4)}...").`, m.index);
    }

    if (/\bfetch\s*\(/.test(code)) {
      const first = /\bfetch\s*\(/.exec(code);
      if (!/\.ok\b|\.status\b/.test(code)) add('FD005', 'fetch( is used, but neither ".ok" nor ".status" appears in this file.', first.index, code);
      if (!/\bcatch\b/.test(code)) add('FD006', 'fetch( is used, but this file has no catch or try/catch.', first.index, code);
    }

    // Command-line scripts (they start with a "#!" line) print on purpose.
    if (!text.startsWith('#!')) {
      for (const m of code.matchAll(/\bconsole\.log\s*\(|\bdebugger\b/g)) add('FD013', `Found "${m[0].replace(/\s+/g, '')}".`, m.index, code);
    }

    for (const m of code.matchAll(/\b(?:local|session)Storage\.setItem\s*\(\s*['"`][^'"`]*(?:token|jwt|passw|secret|session)[^'"`]*['"`]|\b(?:local|session)Storage\.(?:token|jwt|password|secret)\s*=/gi)) {
      add('FD014', 'Browser storage is used for something that looks like a token or password.', m.index, code);
    }

    if (isVue) {
      for (const m of text.matchAll(/\bv-html\s*=/g)) add('FD002', 'v-html inserts raw HTML.', m.index); // vyson-ok: FD002 this line is the checker's own pattern
    }

    // --- markup checks ---------------------------------------------------
    if (!isHtml) continue;

    const labelRanges = [...markup.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((m) => [m.index, m.index + m[0].length]);
    const labelFor = new Set([...markup.matchAll(/<label\b[^>]*>/gi)].map((m) => attrValue(m[0], 'for')).filter(Boolean));
    for (const m of markup.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
      const tag = m[0];
      const type = (attrValue(tag, 'type') ?? 'text').toLowerCase();
      if (m[1].toLowerCase() === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
      const id = attrValue(tag, 'id');
      const named = (attrValue(tag, 'aria-label') ?? '').trim() !== '' || hasAttr(tag, 'aria-labelledby');
      const wrapped = labelRanges.some(([start, end]) => m.index > start && m.index < end);
      if (!named && !wrapped && !(id && labelFor.has(id))) add('FD001', `A <${m[1].toLowerCase()}> has no label.`, m.index);

      const name = attrValue(tag, 'name') ?? '';
      const needsHint = m[1].toLowerCase() === 'input' && (['email', 'tel', 'password'].includes(type) || PERSONAL_NAME.test(name) || PERSONAL_NAME.test(id ?? ''));
      if (needsHint && !hasAttr(tag, 'autocomplete')) add('FD012', `An input of type "${type}"${name ? ` named "${name}"` : ''} has no autocomplete attribute.`, m.index);
    }

    for (const m of markup.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)) {
      const open = /<form\b[^>]*>/i.exec(m[0])[0];
      const method = (attrValue(open, 'method') ?? 'get').toLowerCase();
      if (/<input\b[^>]*type\s*=\s*["']?password/i.test(m[0]) && method !== 'post') add('FD015', 'A form with a password field does not have method="post".', m.index);
    }

    for (const m of markup.matchAll(/<([a-z][a-z0-9]*)\b[^>]*\son[a-z]+\s*=[^>]*>/gi)) {
      const tag = m[0];
      const name = m[1].toLowerCase();
      if (/\sonclick\s*=/i.test(tag) && NON_INTERACTIVE.has(name) && !(hasAttr(tag, 'role') && hasAttr(tag, 'tabindex'))) {
        add('FD007', `A <${name}> has an onclick handler but no role and tabindex.`, m.index);
      } else {
        add('FD008', `A <${name}> uses an inline event handler attribute.`, m.index);
      }
    }

    for (const m of markup.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const tag = /^<[^>]*>/.exec(m[0])[0];
      if (m[1].toLowerCase() === 'a' && !hasAttr(tag, 'href')) continue;
      const inner = m[2]
        .replace(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi, ' $1 ')
        .replace(/<title\b[^>]*>([\s\S]*?)<\/title>/gi, ' $1 ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .trim();
      const named = (attrValue(tag, 'aria-label') ?? '').trim() !== '' || hasAttr(tag, 'aria-labelledby') || (attrValue(tag, 'title') ?? '').trim() !== '';
      if (!inner && !named) add('FD009', `A <${m[1].toLowerCase()}> has no text and no aria-label.`, m.index);
    }

    const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(markup);
    if (head) {
      const headStart = head.index + head[0].indexOf(head[1]);
      for (const m of head[1].matchAll(/<script\b[^>]*>/gi)) {
        const tag = m[0];
        if (hasAttr(tag, 'src') && !hasAttr(tag, 'defer') && !hasAttr(tag, 'async') && (attrValue(tag, 'type') ?? '').toLowerCase() !== 'module') {
          add('FD010', 'A <script src> in the <head> has no defer, async or type="module".', headStart + m.index);
        }
      }
    }

    for (const m of markup.matchAll(/<script\b[^>]*>/gi)) {
      const src = attrValue(m[0], 'src') ?? '';
      if (/^(?:https?:)?\/\//i.test(src) && !hasAttr(m[0], 'integrity')) add('FD011', `A script is loaded from ${src}.`, m.index);
    }
  }

  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return issues;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build']);

function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const found = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) found.push(...collect(full));
    else if (/\.(?:html?|vue)$/i.test(entry.name) || JS_EXT.test(entry.name)) found.push(full);
  }
  return found.sort();
}

export function lintPaths(targets) {
  const files = [...new Set(targets.flatMap(collect))];
  const sources = files.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
  return { files, issues: lintSources(sources) };
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const targets = argv.filter((a) => !a.startsWith('--'));
  const known = new Set(['--strict', '--json', '--help']);
  const unknown = [...flags].filter((f) => !known.has(f));

  if (flags.has('--help') || targets.length === 0 || unknown.length) {
    const lines = [
      unknown.length ? `Unknown option: ${unknown.join(', ')}` : '',
      'Usage: node frontend-lint.mjs <file-or-folder> [more paths] [--strict] [--json]',
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
      tool: 'vyson-frontend-lint',
      kind: 'static',
      note: 'Static text checks only. No code was run, no browser was opened and no security review was done.',
      filesChecked: result.files.length,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON frontend lint (static checks only: no code was run, no browser was opened, not a security review)');
  console.log(`Checked: ${result.files.length} file${result.files.length === 1 ? '' : 's'}\n`);
  if (result.files.length === 0) console.log('No .html or script files were found in the paths you gave.\n');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${path.relative(process.cwd(), i.file) || i.file}:${i.line}  ${i.code}  ${i.title}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Static checks only. Passing does not replace running the app and the checks in references/quality-and-security.md.');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
