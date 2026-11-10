// Turns validation results into reports a human (or a program) can read.
//
// A "result" is: { name, path, issues: [...], stats?: {...} }
// An "issue" is created by issue() in issues.mjs.

import path from 'node:path';
import { toPosix } from './fs-utils.mjs';

/** Severity of an issue after applying --strict (warnings become errors). */
export function effectiveSeverity(item, strict) {
  return strict && item.severity === 'warning' ? 'error' : item.severity;
}

/** Count errors and warnings of one result. */
export function countIssues(result, strict = false) {
  let errors = 0;
  let warnings = 0;
  for (const i of result.issues) {
    if (effectiveSeverity(i, strict) === 'error') errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}

/** Overall totals for a list of results. */
export function summarize(results, strict = false) {
  let errors = 0;
  let warnings = 0;
  let failed = 0;
  for (const r of results) {
    const c = countIssues(r, strict);
    errors += c.errors;
    warnings += c.warnings;
    if (c.errors > 0) failed += 1;
  }
  return { total: results.length, failed, passed: results.length - failed, errors, warnings, ok: errors === 0 };
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function makeColors(enabled) {
  const wrap = (code) => (s) => (enabled ? `\u001b[${code}m${s}\u001b[0m` : s);
  return { red: wrap('31'), yellow: wrap('33'), green: wrap('32'), bold: wrap('1'), dim: wrap('2') };
}

function location(item, baseDir) {
  if (!item.file) return '';
  const rel = toPosix(path.relative(baseDir, item.file)) || '.';
  return item.line ? `${rel}:${item.line}` : rel;
}

/**
 * Human-readable report.
 * @param {object[]} results
 * @param {{ title: string, subject: string, profile?: string, strict?: boolean, color?: boolean, baseDir?: string, notes?: string[] }} opts
 */
export function formatText(results, opts) {
  const { title, subject, profile, strict = false, color = false, baseDir = process.cwd(), notes = [] } = opts;
  const c = makeColors(color);
  const out = [];
  out.push(c.bold(title));
  const meta = [`Checked: ${plural(results.length, subject)}`];
  if (profile) meta.unshift(`Profile: ${profile}`);
  if (strict) meta.push('Strict mode: warnings count as errors');
  out.push(c.dim(meta.join('   ')));
  out.push('');

  for (const r of results) {
    const { errors, warnings } = countIssues(r, strict);
    const stats = r.stats ? c.dim(`  (${plural(r.stats.markdownFiles, 'Markdown file')}, ${plural(r.stats.links, 'relative link')} checked)`) : '';
    if (errors === 0 && warnings === 0) {
      out.push(`${c.green('PASS')}  ${r.name}${stats}`);
      continue;
    }
    const counts = [errors ? plural(errors, 'error') : null, warnings ? plural(warnings, 'warning') : null].filter(Boolean).join(', ');
    out.push(`${errors ? c.red('FAIL') : c.yellow('WARN')}  ${r.name}  ${c.dim(`(${counts})`)}`);
    for (const i of r.issues) {
      const sev = effectiveSeverity(i, strict);
      const tag = sev === 'error' ? c.red('ERROR  ') : c.yellow('WARNING');
      const where = location(i, baseDir);
      out.push(`  ${tag} ${c.bold(i.code)}  ${i.title}${where ? c.dim(`  [${where}]`) : ''}`);
      out.push(`           ${i.message}`);
      out.push(`           ${c.dim(`How to fix: ${i.fix}`)}`);
    }
  }

  for (const n of notes) out.push(c.dim(n));

  const s = summarize(results, strict);
  out.push('');
  if (s.ok) {
    const warn = s.warnings ? ` with ${plural(s.warnings, 'warning')}` : '';
    out.push(c.green(c.bold(`RESULT: PASSED${warn}.`)) + ` ${plural(s.passed, subject)} checked, no errors.`);
  } else {
    out.push(c.red(c.bold('RESULT: FAILED.')) + ` ${plural(s.errors, 'error')} and ${plural(s.warnings, 'warning')} in ${s.failed} of ${plural(s.total, subject)}.`);
  }
  return out.join('\n');
}

/** Machine-readable report (for CI and other tools). */
export function formatJson(results, opts) {
  const { profile, strict = false, baseDir = process.cwd() } = opts;
  const summary = summarize(results, strict);
  return JSON.stringify(
    {
      tool: 'vyson-validator',
      profile: profile ?? null,
      strict,
      summary,
      results: results.map((r) => ({
        name: r.name,
        path: toPosix(path.relative(baseDir, r.path)) || '.',
        passed: countIssues(r, strict).errors === 0,
        stats: r.stats ?? null,
        issues: r.issues.map((i) => ({
          code: i.code,
          severity: effectiveSeverity(i, strict),
          title: i.title,
          message: i.message,
          fix: i.fix,
          file: i.file ? toPosix(path.relative(baseDir, i.file)) : null,
          line: i.line,
        })),
      })),
    },
    null,
    2,
  );
}
