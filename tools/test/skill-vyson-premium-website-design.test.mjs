// Tests for the skill vyson-premium-website-design.
// They check that the skill passes our own validator and checker, and that its
// pieces (documentation, starter tokens, example, evals) agree with each other.
// They read text only. They are static tests, not browser tests.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers.mjs';
import { validateSkill } from '../lib/validate-skill.mjs';
import { listMarkdownFiles, readText } from '../lib/fs-utils.mjs';

const NAME = 'vyson-premium-website-design';
const SKILL_DIR = path.join(REPO_ROOT, 'skills', NAME);
const EXAMPLE_DIR = path.join(REPO_ROOT, 'examples', NAME);
const LINT = path.join(SKILL_DIR, 'scripts', 'design-lint.mjs');
const MOTION_LINT = path.join(REPO_ROOT, 'skills', 'vyson-css-motion', 'scripts', 'motion-lint.mjs');
const { RULES, contrastRatio, parseColor } = await import(pathToFileURL(LINT).href);

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

function lintCli(script, target) {
  const r = spawnSync(process.execPath, [script, target, '--strict', '--json'], { encoding: 'utf8' });
  return { status: r.status, data: JSON.parse(r.stdout) };
}

describe(`${NAME}: validator`, () => {
  it('passes the VYSON project profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'project', repoRoot: REPO_ROOT }).issues, []);
  });

  it('passes the specification-only profile with no issues at all', () => {
    assert.deepEqual(validateSkill(SKILL_DIR, { profile: 'spec', repoRoot: REPO_ROOT }).issues, []);
  });

  it('declares the design pillar', () => {
    assert.match(read(SKILL_DIR, 'SKILL.md'), /vyson-pillar: "design"/);
  });
});

describe(`${NAME}: the skill and its neighbour have clear boundaries`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const description = /^description: (.*)$/m.exec(skillMd)[1];

  it('the description says when to use it and points motion requests to vyson-css-motion', () => {
    assert.match(description, /Use when/);
    assert.match(description, /vyson-css-motion/);
    assert.ok(description.length <= 1024);
  });

  it('SKILL.md has "When to use" and "When not to use" sections that name the motion skill', () => {
    assert.match(skillMd, /^## When to use$/m);
    const notUse = skillMd.slice(skillMd.indexOf('## When not to use'), skillMd.indexOf('## The design contract'));
    assert.match(notUse, /vyson-css-motion/);
    assert.match(notUse, /3D/);
  });

  it('adds no animation of its own: no transition, animation or keyframes in the starter file or the example', () => {
    const files = [
      read(SKILL_DIR, 'assets', 'design-tokens.css'),
      read(EXAMPLE_DIR, 'result', 'styles.css'),
      read(EXAMPLE_DIR, 'result', 'index.html'),
    ].join('\n');
    // Comments may talk about motion; the code must not contain it.
    const code = files.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(code, /\btransition\s*:|\banimation\s*:|@keyframes|\banimation-name\s*:|scroll-behavior\s*:\s*smooth/);
  });

  it('does not link into another skill (a skill is installed on its own)', () => {
    for (const file of listMarkdownFiles(SKILL_DIR)) {
      assert.doesNotMatch(readText(file), /\]\([^)]*vyson-css-motion/, file);
    }
  });
});

describe(`${NAME}: the design contract is written down`, () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');

  it('SKILL.md states the four parts of the contract', () => {
    for (const part of ['A decided direction', 'A system, not one-off values', 'Real content and honest assets', 'Accessible by default']) {
      assert.ok(skillMd.includes(part), part);
    }
  });

  it('SKILL.md says its numbers are not measured results, and asks for honest reporting', () => {
    assert.match(skillMd, /VYSON design defaults, not measured results/);
    assert.match(skillMd, /three separate lists/);
    assert.match(skillMd, /\*\*This is a static check\.\*\*/);
  });

  it('SKILL.md carries the contrast, tap-target and focus rules in its acceptance checks', () => {
    assert.match(skillMd, /\[ \] All text pairs reach 4\.5:1/);
    assert.match(skillMd, /\[ \] Touch targets of 44 by 44 CSS pixels, never under 24 by 24/);
    assert.match(skillMd, /focus is visible/);
  });

  it('every reference file is linked from SKILL.md, and no reference links to another reference', () => {
    const refs = fs.readdirSync(path.join(SKILL_DIR, 'references')).filter((f) => f.endsWith('.md'));
    assert.ok(refs.length >= 5);
    for (const ref of refs) {
      assert.ok(skillMd.includes(`(references/${ref})`), `${ref} is not linked from SKILL.md`);
      assert.doesNotMatch(read(SKILL_DIR, 'references', ref), /\]\([^)]*\.md/, `${ref} links to another file`);
    }
  });

  it('the tap-target rule matches the project decision (44 aim, 24 floor, WCAG 2.2 SC 2.5.8)', () => {
    const details = read(SKILL_DIR, 'references', 'responsive-and-details.md');
    assert.match(details, /44 by 44 CSS pixels/);
    assert.match(details, /24 by 24/);
    assert.match(details, /2\.5\.8/);
  });

  it('the contrast numbers are the WCAG 2.2 ones (4.5:1 text, 3:1 large text and components)', () => {
    const colour = read(SKILL_DIR, 'references', 'color-and-imagery.md');
    assert.match(colour, /\| Normal text \(SC 1\.4\.3\) \| 4\.5:1 \|/);
    assert.match(colour, /3:1/);
    assert.match(colour, /SC 1\.4\.11/);
  });

  it('the typography reference tells agents to verify and record font licences, and not to hotlink fonts', () => {
    const type = read(SKILL_DIR, 'references', 'typography-and-spacing.md');
    assert.match(type, /licence/i);
    assert.match(type, /Self-host/);
    assert.match(type, /another website/);
  });

  it('no skill document tells the agent to fetch instructions from the internet', () => {
    const everything = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    assert.doesNotMatch(everything, /\b(curl|wget|Invoke-WebRequest)\b/);
  });
});

describe(`${NAME}: own checker is satisfied by the skill's own files`, () => {
  it('the starter CSS has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(LINT, path.join(SKILL_DIR, 'assets'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
    assert.equal(data.filesChecked, 1);
  });

  it('the example site has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(LINT, path.join(EXAMPLE_DIR, 'result'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
    assert.ok(data.filesChecked >= 3);
  });

  it('the example also passes the motion checker in strict mode (no unsafe motion was added)', () => {
    const { status, data } = lintCli(MOTION_LINT, path.join(EXAMPLE_DIR, 'result'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the example uses an exact copy of the starter CSS', () => {
    assert.equal(read(EXAMPLE_DIR, 'result', 'design-tokens.css'), read(SKILL_DIR, 'assets', 'design-tokens.css'));
  });
});

describe(`${NAME}: checker documentation matches the checker`, () => {
  const quality = read(SKILL_DIR, 'references', 'quality-checks.md');

  it('every rule code is in the table of quality-checks.md with the same severity', () => {
    for (const [code, rule] of Object.entries(RULES)) {
      const row = quality.split(/\r?\n/).find((l) => l.startsWith(`| ${code} |`));
      assert.ok(row, `${code} is missing from quality-checks.md`);
      assert.match(row, new RegExp(`\\| ${rule.severity} \\|$`), `${code} should be marked "${rule.severity}"`);
    }
  });

  it('every rule code mentioned anywhere in the skill documentation exists', () => {
    const files = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const mentioned = new Set(files.match(/\bDL\d{3}\b/g) ?? []);
    assert.ok(mentioned.size > 0);
    for (const code of mentioned) assert.ok(RULES[code], `${code} is mentioned but does not exist`);
  });

  it('SKILL.md states the right number of rules', () => {
    const count = Object.keys(RULES).length;
    assert.match(read(SKILL_DIR, 'SKILL.md'), new RegExp(`${count} rules, DL001 to DL${String(count).padStart(3, '0')}`));
  });

  it('quality-checks.md keeps static checks, design review and browser tests apart', () => {
    assert.match(quality, /\*\*Static check\*\*/);
    assert.match(quality, /\*\*Design review\*\*/);
    assert.match(quality, /\*\*Browser test\*\*/);
    assert.match(quality, /browser test: not performed/);
    assert.match(quality, /## How to report/);
  });

  it('the checker says it is a static check, has no dependencies and uses no network', () => {
    const script = read(LINT);
    assert.match(script, /IT IS A STATIC CHECKER/);
    assert.doesNotMatch(script, /node:(http|https|net|dgram|child_process)|fetch\(|XMLHttpRequest/);
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, `${spec} is not a Node built-in`);
  });
});

describe(`${NAME}: starter tokens`, () => {
  const css = read(SKILL_DIR, 'assets', 'design-tokens.css');
  const defined = (text) => new Set([...text.matchAll(/^\s*(--vd-[a-z0-9-]+):/gm)].map((m) => m[1]));
  const tokens = defined(css);

  it('every --vd- token named in the skill documentation or used by the example exists', () => {
    const docs = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const exampleCss = read(EXAMPLE_DIR, 'result', 'styles.css');
    const allowed = new Set([...tokens, ...defined(exampleCss)]);
    const usedInDocs = new Set((docs.match(/--vd-[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []));
    const usedInExample = new Set((exampleCss.match(/--vd-[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? []));
    for (const token of [...usedInDocs, ...usedInExample]) {
      // "--vd-" is the prefix mentioned in prose, and "--vd-text" etc. must exist.
      if (token === '--vd-') continue;
      assert.ok(allowed.has(token), `${token} is used but not defined`);
    }
  });

  it('the colour roles used by the checker exist in the starter file', () => {
    for (const role of ['--vd-text', '--vd-bg', '--vd-surface', '--vd-muted', '--vd-link', '--vd-accent', '--vd-accent-contrast', '--vd-focus']) {
      assert.ok(tokens.has(role), role);
    }
  });

  it('the starter palette meets 4.5:1 for every text pair and 3:1 for the focus ring', () => {
    const value = (name) => parseColor(new RegExp(`${name}:\\s*(#[0-9a-f]{3,6})`, 'i').exec(css)[1]);
    for (const [fg, bg] of [['--vd-text', '--vd-bg'], ['--vd-text', '--vd-surface'], ['--vd-muted', '--vd-bg'], ['--vd-muted', '--vd-surface'], ['--vd-link', '--vd-bg'], ['--vd-accent-contrast', '--vd-accent']]) {
      assert.ok(contrastRatio(value(fg), value(bg)) >= 4.5, `${fg} on ${bg}`);
    }
    assert.ok(contrastRatio(value('--vd-focus'), value('--vd-bg')) >= 3);
  });

  it('the body size is at least 16px, the button is 44px tall and focus has a visible outline', () => {
    const base = /--vd-text-base:\s*([\d.]+)rem/.exec(css);
    assert.ok(parseFloat(base[1]) * 16 >= 16);
    assert.match(css, /\.vd-button\s*\{[^}]*min-height:\s*2\.75rem/);
    assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*3px solid/);
  });

  it('hover styles are limited to devices that hover', () => {
    assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.vd-button:hover/);
    assert.doesNotMatch(css.replace(/@media \(hover: hover\)[\s\S]*$/, ''), /:hover/);
  });
});

describe(`${NAME}: the example`, () => {
  const html = read(EXAMPLE_DIR, 'result', 'index.html');

  it('has the files an example needs', () => {
    for (const file of ['prompt.md', 'README.md', 'CREDITS.md', 'preview.png', 'result/index.html', 'result/styles.css', 'result/design-tokens.css']) {
      assert.ok(fs.existsSync(path.join(EXAMPLE_DIR, file)), file);
    }
  });

  it('the prompt names the skill and the made-up brand', () => {
    const prompt = read(EXAMPLE_DIR, 'prompt.md');
    assert.match(prompt, /vyson-premium-website-design/);
    assert.match(prompt, /Marrowfield Studio/);
  });

  it('the page has one h1, a skip link that points at main, labelled landmarks and no inline style', () => {
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
    assert.match(html, /<a class="skip-link" href="#main">/);
    assert.match(html, /<main id="main">/);
    assert.match(html, /<nav aria-label="Main">/);
    assert.doesNotMatch(html, /\sstyle=/);
  });

  it('every in-page link points at an id that exists', () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const targets = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
    assert.ok(targets.length >= 6);
    for (const target of targets) assert.ok(ids.has(target), `#${target} has no matching id`);
  });

  it('loads nothing from another website and uses no script', () => {
    assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//);
    assert.doesNotMatch(html, /<script\b/i);
  });

  it('says clearly that the studio and its projects are made up', () => {
    assert.match(html, /made-up name for a demo site/);
    assert.match(html, /invented for this demo/);
    assert.match(read(EXAMPLE_DIR, 'CREDITS.md'), /Made-up names for a demo/);
  });

  it('the example README is honest: it says what was not checked and that it is not an independent test', () => {
    const readme = read(EXAMPLE_DIR, 'README.md');
    assert.match(readme, /## What was not checked/);
    assert.match(readme, /not an independent test/);
    assert.match(readme, /A real phone/);
  });
});

describe(`${NAME}: eval file`, () => {
  const evals = JSON.parse(read(REPO_ROOT, 'evals', NAME, 'evals.json'));

  it('has both "should activate" and "should not activate" cases', () => {
    assert.ok(evals.cases.filter((c) => c.should_activate).length >= 4);
    assert.ok(evals.cases.filter((c) => !c.should_activate).length >= 3);
  });

  it('includes the cases that mark the boundary with motion, 3D and logic-only work', () => {
    const prompts = evals.cases.filter((c) => !c.should_activate).map((c) => c.prompt).join('\n');
    assert.match(prompts, /scroll-triggered fade-in animations/);
    assert.match(prompts, /3D sneaker/);
    assert.match(prompts, /bug in the JavaScript/);
  });

  it('every case has checkable statements', () => {
    for (const c of evals.cases) {
      assert.ok(c.must_be_true.length >= 1, `case ${c.id}`);
    }
  });
});
