// Tests for the skill vyson-website-quality-engineering.
// They check that the skill passes our own validator, and that its pieces (documentation, the two
// tools, the example with its saved output, evals) agree with each other.
// They read text and run the static audit. They do not open a browser: the browser check has its own
// test file (browser-check.test.mjs), where the real-browser tests are marked as such.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers.mjs';
import { validateSkill } from '../lib/validate-skill.mjs';
import { listMarkdownFiles, readText } from '../lib/fs-utils.mjs';

const NAME = 'vyson-website-quality-engineering';
const SKILL_DIR = path.join(REPO_ROOT, 'skills', NAME);
const EXAMPLE_DIR = path.join(REPO_ROOT, 'examples', NAME);
const AUDIT = path.join(SKILL_DIR, 'scripts', 'site-audit.mjs');
const BROWSER = path.join(SKILL_DIR, 'scripts', 'browser-check.mjs');
const { RULES: AUDIT_RULES } = await import(pathToFileURL(AUDIT).href);
const { RULES: BROWSER_RULES } = await import(pathToFileURL(BROWSER).href);

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');
const normalise = (text) => text.replace(/\r\n/g, '\n');

function auditCli(target, ...extra) {
  const r = spawnSync(process.execPath, [AUDIT, target, '--json', ...extra], { encoding: 'utf8' });
  return { status: r.status, data: JSON.parse(r.stdout) };
}

describe(`${NAME}: validator`, () => {
  it('passes the VYSON project profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'project', repoRoot: REPO_ROOT }).issues, []);
  });

  it('passes the specification-only profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'spec', repoRoot: REPO_ROOT }).issues, []);
  });

  it('declares the quality pillar', () => {
    assert.match(read(SKILL_DIR, 'SKILL.md'), /vyson-pillar: "quality"/);
  });
});

describe(`${NAME}: the skill and its neighbours have clear boundaries`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const description = /^description: (.*)$/m.exec(skillMd)[1];

  it('the description says when to use it and names the skills for building', () => {
    assert.match(description, /Use when/);
    assert.ok(description.length <= 1024);
    for (const other of ['vyson-premium-website-design', 'vyson-css-motion', 'vyson-3d-interactive-web', 'vyson-frontend-development']) {
      assert.ok(description.includes(other), other);
    }
  });

  it('"When not to use" names the other four skills', () => {
    const notUse = skillMd.slice(skillMd.indexOf('## When not to use'), skillMd.indexOf('## The quality contract'));
    for (const other of ['vyson-premium-website-design', 'vyson-css-motion', 'vyson-3d-interactive-web', 'vyson-frontend-development']) {
      assert.ok(notUse.includes(other), other);
    }
    assert.match(notUse, /legal advice/);
  });

  it('does not link into another skill (a skill is installed on its own)', () => {
    for (const file of listMarkdownFiles(SKILL_DIR)) {
      assert.doesNotMatch(readText(file), /\]\([^)]*(?:vyson-css-motion|vyson-premium|vyson-3d|vyson-frontend)/, file);
    }
  });

  it('no skill document tells the agent to fetch instructions from the internet', () => {
    const everything = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    assert.doesNotMatch(everything, /\b(curl|wget|Invoke-WebRequest)\b/);
  });

  it('no personal paths in any public skill file', () => {
    for (const file of [...listMarkdownFiles(SKILL_DIR), AUDIT, BROWSER]) {
      assert.doesNotMatch(readText(file), /C:\\Users\\|\/Users\/|\/home\/[a-z]/i, file);
    }
  });
});

describe(`${NAME}: the quality contract is written down`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');

  it('SKILL.md states the four parts of the contract', () => {
    for (const part of ['Everything was looked at the right way', 'Findings are specific and fixable', 'Results are re-run after fixes', 'The report does not claim more than was tested']) {
      assert.ok(skillMd.includes(part), part);
    }
  });

  it('keeps static, browser and manual checks apart, and says what a static check is', () => {
    assert.match(skillMd, /\*\*This is a static check\.\*\*/);
    assert.match(skillMd, /\*\*This is one headless run on one computer\.\*\*/);
    assert.match(skillMd, /browser test: not performed/);
    assert.match(skillMd, /three lists/);
  });

  it('says its numbers are not measured results, and that it cannot certify compliance', () => {
    assert.match(skillMd, /VYSON defaults, not measured results/);
    assert.match(skillMd, /cannot certify/);
    assert.match(skillMd, /does not certify compliance/);
  });

  it('carries the tap-target decision (44 aim, 24 floor, WCAG 2.2 SC 2.5.8)', () => {
    assert.match(skillMd, /SC 2\.5\.8/);
    assert.match(skillMd, /never under 24 by 24/);
    assert.match(skillMd, /44 by 44/);
  });

  it('every reference file is linked from SKILL.md, and no reference links to another file', () => {
    const refs = fs.readdirSync(path.join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'));
    assert.equal(refs.length, 4);
    for (const ref of refs) {
      assert.ok(skillMd.includes(`(references/${ref})`), `${ref} is not linked from SKILL.md`);
      assert.doesNotMatch(read(SKILL_DIR, 'references', ref), /\]\([^)]*\.md/, `${ref} links to another file`);
    }
  });

  it('the report template names what was not tested and forbids vague claims', () => {
    const plan = read(SKILL_DIR, 'references', 'quality-plan.md');
    assert.match(plan, /Not tested at all/);
    assert.match(plan, /lab, one run/);
    assert.match(plan, /Never write "accessible"/);
    assert.match(plan, /## Report template/);
  });
});

describe(`${NAME}: documentation matches the two tools`, () => {
  const tools = normalise(read(SKILL_DIR, 'references', 'tools-and-automation.md'));
  const lines = tools.split('\n');

  it('every audit rule and every browser rule is in the table with the same severity and title', () => {
    for (const [code, rule] of [...Object.entries(AUDIT_RULES), ...Object.entries(BROWSER_RULES)]) {
      const row = lines.find((l) => l.startsWith(`| ${code} |`));
      assert.ok(row, `${code} is missing from tools-and-automation.md`);
      assert.match(row, new RegExp(`\\| ${rule.severity} \\|$`), `${code} should be marked "${rule.severity}"`);
      assert.ok(row.includes(rule.title), `${code} has a different title in the table`);
    }
  });

  it('every rule code mentioned anywhere in the skill documentation exists', () => {
    const files = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const mentioned = new Set(files.match(/\b(?:QA|BC)\d{3}\b/g) ?? []);
    assert.ok(mentioned.size > 20);
    for (const code of mentioned) assert.ok(AUDIT_RULES[code] || BROWSER_RULES[code], `${code} is mentioned but does not exist`);
  });

  it('SKILL.md states the right number of rules for each tool', () => {
    const skillMd = read(SKILL_DIR, 'SKILL.md');
    const qa = Object.keys(AUDIT_RULES).length;
    const bc = Object.keys(BROWSER_RULES).length;
    assert.match(skillMd, new RegExp(`${qa} rules, QA001 to QA${String(qa).padStart(3, '0')}`));
    assert.match(skillMd, new RegExp(`${bc} rules, BC001 to BC${String(bc).padStart(3, '0')}`));
  });

  it('the documented exit codes match the browser tool', () => {
    assert.match(tools, /3 the test could not be run/);
    assert.match(read(BROWSER), /3 = the browser test could not be run/);
  });

  it('the accessibility reference maps checks to real rule codes and asks for a screen reader pass', () => {
    const a11y = read(SKILL_DIR, 'references', 'accessibility-checks.md');
    for (const code of ['QA005', 'QA012', 'QA014', 'QA027', 'BC005', 'BC007', 'BC013']) assert.ok(a11y.includes(code), code);
    assert.match(a11y, /screen reader: not performed/);
    assert.match(a11y, /2\.5\.8|44 by 44/);
  });

  it('the performance reference quotes the published thresholds, says lab is not field, and does not promise results', () => {
    const perf = read(SKILL_DIR, 'references', 'performance-and-seo.md');
    assert.match(perf, /2\.5 seconds or less/);
    assert.match(perf, /200 milliseconds or less/);
    assert.match(perf, /0\.1 or less/);
    assert.match(perf, /75th percentile/);
    assert.match(perf, /web\.dev/);
    assert.match(perf, /not\*{0,2} field data/);
    assert.match(perf, /Do not promise "SEO results"/);
  });

  it('optional tools are listed with the licences recorded in THIRD_PARTY.md', () => {
    const third = read(REPO_ROOT, 'THIRD_PARTY.md');
    for (const [tool, licence] of [['Lighthouse', 'Apache-2.0'], ['axe-core', 'MPL-2.0'], ['Playwright', 'Apache-2.0']]) {
      assert.match(tools, new RegExp(`\\| ${tool} \\| ${licence} \\|`), tool);
      assert.match(third, new RegExp(tool));
    }
  });
});

describe(`${NAME}: the static audit run on the repository's own examples`, () => {
  it('finds no errors on the repaired example site, even in strict mode', () => {
    const { status, data } = auditCli(path.join(EXAMPLE_DIR, 'site-after'), '--strict');
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
    assert.equal(data.pages, 3);
  });

  it('finds the problems the flawed example site was built to have', () => {
    const { status, data } = auditCli(path.join(EXAMPLE_DIR, 'site-before'));
    assert.equal(status, 1);
    const found = new Set(data.issues.map((i) => i.code));
    for (const code of ['QA001', 'QA002', 'QA004', 'QA005', 'QA006', 'QA012', 'QA014', 'QA022', 'QA024', 'QA027', 'QA028']) {
      assert.ok(found.has(code), `${code} was not reported`);
    }
    assert.equal(data.issues.filter((i) => i.severity === 'error').length, 10);
  });

  it('finds no errors on the four other examples in the repository', () => {
    for (const other of ['vyson-css-motion', 'vyson-premium-website-design', 'vyson-3d-interactive-web', 'vyson-frontend-development']) {
      const { status, data } = auditCli(path.join(REPO_ROOT, 'examples', other, 'result'));
      assert.equal(status, 0, `${other}: ${JSON.stringify(data.issues.filter((i) => i.severity === 'error'))}`);
    }
  });
});

describe(`${NAME}: the example`, () => {
  it('has the files an example needs', () => {
    for (const file of ['prompt.md', 'README.md', 'CREDITS.md', 'REPORT.md', 'preview.png', 'before-390.png', 'after-390.png', 'audit-before.txt', 'audit-after.txt', 'browser-before.txt', 'browser-after.txt', 'site-before/index.html', 'site-before/menu.html', 'site-after/index.html', 'site-after/menu.html', 'site-after/about.html']) {
      assert.ok(fs.existsSync(path.join(EXAMPLE_DIR, file)), file);
    }
  });

  it('the prompt names the skill and the made-up bakery', () => {
    const prompt = read(EXAMPLE_DIR, 'prompt.md');
    assert.match(prompt, /vyson-website-quality-engineering/);
    assert.match(prompt, /Pinewick Bakery/);
  });

  it('the saved audit output lists the same findings the audit reports now', () => {
    for (const site of ['before', 'after']) {
      const saved = normalise(read(EXAMPLE_DIR, `audit-${site}.txt`));
      const { data } = auditCli(path.join(EXAMPLE_DIR, `site-${site}`));
      const savedCodes = [...saved.matchAll(/^(?:FAIL|WARN)\s+\S+:\d+\s+(QA\d{3})/gm)].map((m) => m[1]).sort();
      assert.deepEqual(savedCodes, data.issues.map((i) => i.code).sort(), `audit-${site}.txt is out of date`);
    }
  });

  it('the saved outputs are in the README and the report with the same result lines', () => {
    const readme = read(EXAMPLE_DIR, 'README.md');
    const report = read(EXAMPLE_DIR, 'REPORT.md');
    for (const name of ['audit-before', 'audit-after', 'browser-before', 'browser-after']) {
      const line = /^RESULT: (.*)$/m.exec(read(EXAMPLE_DIR, `${name}.txt`))[1];
      const short = line.replace(/\.$/, '');
      const compact = short.replace(/^(FAILED|PASSED)\./, '$1.');
      assert.ok(readme.includes(compact) || report.includes(compact), `${name}: "${compact}" is not in the README or the report`);
    }
  });

  it('the saved browser output says which browser and that it is one run, and shows the planted problems', () => {
    const before = read(EXAMPLE_DIR, 'browser-before.txt');
    const after = read(EXAMPLE_DIR, 'browser-after.txt');
    for (const text of [before, after]) {
      assert.match(text, /Browser: (?:Chrome|Edg)/);
      assert.match(text, /one headless run/);
    }
    for (const code of ['BC004', 'BC005', 'BC007', 'BC013']) assert.match(before, new RegExp(code));
    assert.match(after, /RESULT: PASSED\. 0 errors, 0 warnings\./);
  });

  it('no saved output or example file contains a personal path', () => {
    const files = ['README.md', 'REPORT.md', 'CREDITS.md', 'prompt.md', 'audit-before.txt', 'audit-after.txt', 'browser-before.txt', 'browser-after.txt'];
    for (const file of files) assert.doesNotMatch(read(EXAMPLE_DIR, file), /C:\\Users\\|\/Users\/|\/home\/[a-z]|AppData/i, file);
  });

  it('the repaired site loads nothing from another website and keeps the made-up notice', () => {
    for (const page of ['index.html', 'menu.html', 'about.html']) {
      const html = read(EXAMPLE_DIR, 'site-after', page);
      assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//, page);
      assert.match(html, /made-up|does not exist/i, page);
    }
    assert.match(read(EXAMPLE_DIR, 'CREDITS.md'), /made-up name for a demo/i);
  });

  it('the flawed and the repaired site share the same images', () => {
    for (const image of ['loaf.svg', 'croissant.svg']) {
      assert.equal(read(EXAMPLE_DIR, 'site-before', 'images', image), read(EXAMPLE_DIR, 'site-after', 'images', image));
    }
  });

  it('the example README is honest: it says what was not checked and that it is not an independent test', () => {
    const readme = read(EXAMPLE_DIR, 'README.md');
    assert.match(readme, /## What was not checked/);
    assert.match(readme, /not an independent test/);
    assert.match(readme, /A real phone/);
    assert.match(readme, /A screen reader/);
    assert.match(readme, /have not been run with an agent/);
  });

  it('the report keeps the three kinds of check apart and lists what was not tested', () => {
    const report = read(EXAMPLE_DIR, 'REPORT.md');
    assert.match(report, /## Static audit/);
    assert.match(report, /## Browser test/);
    assert.match(report, /## Manual checks/);
    assert.match(report, /## Not tested at all/);
    assert.doesNotMatch(report, /fully accessible|WCAG compliant|mobile-friendly|passes Core Web Vitals/i);
  });
});

describe(`${NAME}: eval file`, () => {
  const evals = JSON.parse(read(REPO_ROOT, 'evals', NAME, 'evals.json'));

  it('has both "should activate" and "should not activate" cases', () => {
    assert.ok(evals.cases.filter((c) => c.should_activate).length >= 4);
    assert.ok(evals.cases.filter((c) => !c.should_activate).length >= 4);
  });

  it('includes the cases that mark the boundary with design, motion, 3D and form logic', () => {
    const prompts = evals.cases.filter((c) => !c.should_activate).map((c) => c.prompt).join('\n');
    assert.match(prompts, /premium-looking/);
    assert.match(prompts, /fade-in animation/);
    assert.match(prompts, /Three\.js/);
    assert.match(prompts, /contact form/);
  });

  it('every case has checkable statements, and the activating cases forbid over-claiming', () => {
    for (const c of evals.cases) assert.ok(c.must_be_true.length >= 1, `case ${c.id}`);
    const claims = evals.cases.filter((c) => c.should_activate).flatMap((c) => c.must_not_happen).join('\n');
    assert.match(claims, /accessible|Core Web Vitals|mobile-friendly/);
  });
});
