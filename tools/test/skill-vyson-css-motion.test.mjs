// Tests for the first real skill, vyson-css-motion.
// They check that the skill passes our own validator and checker, and that its
// pieces (recipes, starter file, example, evals, documentation) agree with each other.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { REPO_ROOT } from './helpers.mjs';
import { validateSkill } from '../lib/validate-skill.mjs';
import { listMarkdownFiles, readText } from '../lib/fs-utils.mjs';

const NAME = 'vyson-css-motion';
const SKILL_DIR = path.join(REPO_ROOT, 'skills', NAME);
const EXAMPLE_DIR = path.join(REPO_ROOT, 'examples', NAME);
const LINT = path.join(SKILL_DIR, 'scripts', 'motion-lint.mjs');
const { RULES, parseDeclarations } = await import(pathToFileURL(LINT).href);

const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');

function lintCli(target) {
  const r = spawnSync(process.execPath, [LINT, target, '--strict', '--json'], { encoding: 'utf8' });
  return { status: r.status, data: JSON.parse(r.stdout) };
}

describe('vyson-css-motion: validator', () => {
  it('passes the VYSON project profile with no issues at all', () => {
    const result = validateSkill(SKILL_DIR, { profile: 'project', repoRoot: REPO_ROOT });
    assert.deepEqual(result.issues, []);
  });

  it('passes the specification-only profile with no issues at all', () => {
    const result = validateSkill(SKILL_DIR, { profile: 'spec', repoRoot: REPO_ROOT });
    assert.deepEqual(result.issues, []);
  });

  it('declares the motion pillar', () => {
    assert.match(read(SKILL_DIR, 'SKILL.md'), /vyson-pillar: "motion"/);
  });
});

describe('vyson-css-motion: own checker is satisfied by the skill\'s own files', () => {
  it('the starter CSS has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(SKILL_DIR, 'assets'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
  });

  it('the example site has no errors and no warnings, even in strict mode', () => {
    const { status, data } = lintCli(path.join(EXAMPLE_DIR, 'result'));
    assert.equal(status, 0);
    assert.equal(data.issues.length, 0);
    assert.ok(data.filesChecked >= 3);
  });

  it('the example uses an exact copy of the starter CSS', () => {
    assert.equal(
      read(EXAMPLE_DIR, 'result', 'motion-base.css'),
      read(SKILL_DIR, 'assets', 'motion-base.css'),
    );
  });
});

describe('vyson-css-motion: pieces agree with each other', () => {
  const skillMd = read(SKILL_DIR, 'SKILL.md');
  const recipes = read(SKILL_DIR, 'references', 'recipes.md');

  it('every recipe number used in the SKILL.md table has a matching heading', () => {
    const headings = new Set([...recipes.matchAll(/^## (\d+)\. /gm)].map((m) => Number(m[1])));
    // Rows of the trigger table end with the recipe numbers, for example "| ... | 4, 6 |".
    const used = new Set();
    for (const line of skillMd.split(/\r?\n/)) {
      const match = /\| (\d+(?:, \d+)*) \|$/.exec(line);
      if (match) match[1].split(', ').forEach((n) => used.add(Number(n)));
    }
    assert.ok(used.size >= 8, 'expected the trigger table to use most recipes');
    for (const n of used) assert.ok(headings.has(n), `recipe ${n} is used in SKILL.md but has no heading`);
    assert.equal(headings.size, 10, 'recipes.md should contain recipes 1 to 10');
  });

  it('every checker rule code mentioned in the documentation exists', () => {
    const files = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    const mentioned = new Set(files.match(/\bML\d{3}\b/g) ?? []);
    assert.ok(mentioned.size > 0);
    for (const code of mentioned) assert.ok(RULES[code], `${code} is mentioned but does not exist`);
  });

  it('the performance budget document covers every rule the checker has a limit for', () => {
    const budget = read(SKILL_DIR, 'references', 'performance-budget.md');
    for (const code of ['ML002', 'ML004', 'ML005', 'ML006', 'ML009']) {
      assert.ok(budget.includes(code), `${code} is not explained in performance-budget.md`);
    }
  });

  it('SKILL.md states the three parts of the motion contract', () => {
    assert.match(skillMd, /Performance budget/);
    assert.match(skillMd, /Reduced motion/);
    assert.match(skillMd, /Mobile fallback/);
  });

  it('the starter CSS tokens used by the recipes all exist in the starter CSS', () => {
    const css = read(SKILL_DIR, 'assets', 'motion-base.css');
    // A token must not be followed by "-", a letter or "*", so the prose placeholders "--vy-duration-*" and "--vy-ease-*" are skipped.
    const tokenPattern = '--vy-[a-z]+(?:-[a-z]+)*(?![-a-z*])';
    const defined = new Set([...css.matchAll(new RegExp(`^\\s*(${tokenPattern}):`, 'gm'))].map((m) => m[1]));
    const used = new Set(recipes.match(new RegExp(tokenPattern, 'g')) ?? []);
    used.delete('--vy-i'); // set per element in the HTML, not in the starter file
    for (const token of used) assert.ok(defined.has(token), `${token} is used in recipes.md but not defined`);
  });
});

describe('vyson-css-motion: eval file', () => {
  const evals = JSON.parse(read(REPO_ROOT, 'evals', NAME, 'evals.json'));

  it('has both "should activate" and "should not activate" cases', () => {
    assert.ok(evals.cases.filter((c) => c.should_activate).length >= 3);
    assert.ok(evals.cases.filter((c) => !c.should_activate).length >= 2);
  });

  it('the example prompt names the skill and the task', () => {
    const prompt = read(EXAMPLE_DIR, 'prompt.md');
    assert.match(prompt, /Build a one-page website for Northlight Coffee/);
    assert.match(prompt, /vyson-css-motion/);
  });
});

describe('vyson-css-motion: no remote instructions and no third-party code', () => {
  it('has no script that downloads anything or uses the network', () => {
    const script = read(SKILL_DIR, 'scripts', 'motion-lint.mjs');
    assert.doesNotMatch(script, /node:(http|https|net|dgram|child_process)|fetch\(|XMLHttpRequest/);
  });

  it('has no dependencies in the checker (only Node built-ins)', () => {
    const script = read(SKILL_DIR, 'scripts', 'motion-lint.mjs');
    const imports = [...script.matchAll(/^import .* from '([^']+)'/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0);
    for (const spec of imports) assert.match(spec, /^node:/, `${spec} is not a Node built-in`);
  });
});

// ---------------------------------------------------------------------------
// Accordion: only one panel expanded at a time, and keyboard use.
// These tests run the recipe's script and the example's script against a small
// FAKE page made of plain objects. They are simulated tests, not browser tests:
// they show the logic is right, not that a real browser behaves the same.
// ---------------------------------------------------------------------------

function fakePage(count) {
  const classes = new Set();
  const frames = [];
  const state = { focused: null };
  const panels = Array.from({ length: count }, () => {
    const button = {
      attrs: {},
      handlers: {},
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name]; },
      addEventListener(type, fn) { (this.handlers[type] ??= []).push(fn); },
      focus() { state.focused = this; },
    };
    const inner = { inert: false };
    const panel = {
      dataset: {},
      querySelector(selector) {
        if (selector === '.panel-button') return button;
        if (selector === '.panel-inner') return inner;
        return null;
      },
    };
    return { panel, button, inner };
  });
  const document = {
    querySelectorAll: (selector) => (selector === '.panel' ? panels.map((p) => p.panel) : []),
    documentElement: { classList: { add: (name) => classes.add(name) } },
  };
  const requestAnimationFrame = (fn) => { frames.push(fn); };
  const runFrames = () => { while (frames.length) frames.shift()(); };
  const click = (i) => panels[i].button.handlers.click.forEach((fn) => fn({}));
  const key = (i, name) => {
    const event = { key: name, prevented: false, preventDefault() { this.prevented = true; } };
    (panels[i].button.handlers.keydown ?? []).forEach((fn) => fn(event));
    return event;
  };
  const expanded = () => panels.map((p) => p.button.getAttribute('aria-expanded') === 'true');
  const focusedIndex = () => panels.findIndex((p) => p.button === state.focused);
  return { document, requestAnimationFrame, panels, classes, runFrames, click, key, expanded, focusedIndex };
}

function runScript(code, page) {
  new Function('document', 'requestAnimationFrame', code)(page.document, page.requestAnimationFrame);
}

function recipePanelScript() {
  const recipes = read(SKILL_DIR, 'references', 'recipes.md').replace(/\r\n/g, '\n');
  const match = /```js\n(\/\/ panel\.js:[\s\S]*?)```/.exec(recipes);
  assert.ok(match, 'recipe 7 should contain the panel.js script');
  return match[1];
}

const accordionSources = {
  'recipe 7 script': recipePanelScript,
  'example panel.js': () => read(EXAMPLE_DIR, 'result', 'panel.js'),
};

for (const [label, getCode] of Object.entries(accordionSources)) {
  describe(`accordion (${label}): only one panel expanded, keyboard friendly [simulated, not a browser]`, () => {
    const setup = (count = 4) => {
      const page = fakePage(count);
      runScript(getCode(), page);
      page.runFrames();
      return page;
    };

    it('starts with exactly one panel open (the first) and closed panels are inert', () => {
      const page = setup();
      assert.deepEqual(page.expanded(), [true, false, false, false]);
      assert.deepEqual(page.panels.map((p) => p.inner.inert), [false, true, true, true]);
      assert.deepEqual(page.panels.map((p) => p.panel.dataset.open), ['true', 'false', 'false', 'false']);
    });

    it('opening another panel closes the one that was open', () => {
      const page = setup();
      page.click(2);
      assert.deepEqual(page.expanded(), [false, false, true, false]);
      page.click(1);
      assert.deepEqual(page.expanded(), [false, true, false, false]);
    });

    it('never has more than one panel expanded, whatever is clicked', () => {
      const page = setup(5);
      for (const i of [3, 0, 4, 4, 1, 2, 2, 0, 3]) {
        page.click(i);
        assert.ok(page.expanded().filter(Boolean).length <= 1, `after clicking ${i}`);
      }
    });

    it('clicking the open panel closes it, so zero open is allowed', () => {
      const page = setup();
      page.click(0);
      assert.deepEqual(page.expanded(), [false, false, false, false]);
      page.click(0);
      assert.deepEqual(page.expanded(), [true, false, false, false]);
    });

    it('keeps aria-expanded, data-open and inert in agreement', () => {
      const page = setup();
      page.click(3);
      page.panels.forEach(({ button, panel, inner }) => {
        const open = button.getAttribute('aria-expanded') === 'true';
        assert.equal(panel.dataset.open, String(open));
        assert.equal(inner.inert, !open);
      });
    });

    it('adds js-panels, and adds panels-animate only after two animation frames', () => {
      const page = fakePage(3);
      runScript(getCode(), page);
      assert.ok(page.classes.has('js-panels'));
      assert.ok(!page.classes.has('panels-animate'), 'the transition must not be on during the first frame');
      page.runFrames();
      assert.ok(page.classes.has('panels-animate'));
    });

    it('arrow keys, Home and End move focus (wrapping) and open nothing', () => {
      const page = setup(4);
      const before = page.expanded();
      assert.ok(page.key(0, 'ArrowDown').prevented);
      assert.equal(page.focusedIndex(), 1);
      page.key(1, 'ArrowUp');
      assert.equal(page.focusedIndex(), 0);
      page.key(0, 'ArrowUp');
      assert.equal(page.focusedIndex(), 3, 'ArrowUp on the first wraps to the last');
      page.key(3, 'ArrowDown');
      assert.equal(page.focusedIndex(), 0, 'ArrowDown on the last wraps to the first');
      page.key(0, 'End');
      assert.equal(page.focusedIndex(), 3);
      page.key(3, 'Home');
      assert.equal(page.focusedIndex(), 0);
      assert.deepEqual(page.expanded(), before, 'moving focus must not change which panel is open');
    });

    it('leaves other keys alone (Tab, Enter and Space keep their normal behaviour)', () => {
      const page = setup();
      for (const name of ['Tab', 'Enter', ' ', 'a']) {
        assert.equal(page.key(0, name).prevented, false, name);
      }
      assert.equal(page.focusedIndex(), -1);
    });

    it('does nothing and does not crash when the page has no panels', () => {
      const page = fakePage(0);
      assert.doesNotThrow(() => runScript(getCode(), page));
    });
  });
}

describe('accordion: markup, recipe text and example agree', () => {
  const recipes = read(SKILL_DIR, 'references', 'recipes.md').replace(/\r\n/g, '\n');
  const recipe7 = recipes.slice(recipes.indexOf('## 7. '), recipes.indexOf('## 8. '));
  const html = read(EXAMPLE_DIR, 'result', 'index.html');

  it('recipe 7 states the one-open rule and the keyboard behaviour', () => {
    assert.match(recipe7, /only one panel may be expanded at a time/i);
    assert.match(recipe7, /Opening a panel closes the one that was open/);
    for (const word of ['Tab', 'Enter', 'Space', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'inert', 'aria-expanded', 'aria-controls']) {
      assert.ok(recipe7.includes(word), `recipe 7 should mention ${word}`);
    }
  });

  it('no skill document still uses the old, unclear wording "one panel at a time"', () => {
    const everything = listMarkdownFiles(SKILL_DIR).map(readText).join('\n');
    assert.doesNotMatch(everything, /one panel at a time/i);
    const budget = read(SKILL_DIR, 'references', 'performance-budget.md');
    assert.match(budget, /Only one panel may be expanded at a time/);
    assert.match(budget, /opening a panel closes the one that was open/);
  });

  it('SKILL.md lists the accordion in its acceptance checks', () => {
    assert.match(skillText(), /only one panel can be expanded at a time/);
  });

  it('every FAQ question in the example is a real button inside a heading, wired to its answer', () => {
    const questions = [...html.matchAll(/<h3><button type="button" class="panel-button" aria-expanded="true" aria-controls="([\w-]+)">/g)];
    assert.equal(questions.length, 3);
    for (const [, id] of questions) assert.ok(html.includes(`id="${id}"`), `${id} has no answer`);
    assert.equal((html.match(/<div class="panel">/g) ?? []).length, 3);
  });
});

function skillText() {
  return read(SKILL_DIR, 'SKILL.md');
}

// ---------------------------------------------------------------------------
// Tap targets. These read the CSS text, so they are static tests: they check
// that the rules are written down. The real rendered sizes are measured in a
// browser (see the example's README).
// ---------------------------------------------------------------------------

describe('tap targets: the criterion is written down and the example follows it [static]', () => {
  const css = read(EXAMPLE_DIR, 'result', 'styles.css');
  const starter = read(SKILL_DIR, 'assets', 'motion-base.css');
  const decls = parseDeclarations(css);
  const px = (value) => {
    const m = /^(\d*\.?\d+)(px|rem)$/.exec(value.trim());
    return m ? parseFloat(m[1]) * (m[2] === 'rem' ? 16 : 1) : NaN;
  };
  const find = (selector, prop, media = null) => decls.find((d) => {
    const at = d.context.slice(0, -1).join(' ');
    return d.context.at(-1) === selector && d.prop === prop && (media === null ? at === '' : /pointer: coarse/.test(at) && /max-width: 640px/.test(at));
  });

  it('verification.md states the 44px aim, the 24px floor and the WCAG 2.2 criterion', () => {
    const doc = read(SKILL_DIR, 'references', 'verification.md');
    assert.match(doc, /44 by 44 CSS pixels/);
    assert.match(doc, /24 by 24 CSS pixels/);
    assert.match(doc, /2\.5\.8/);
    assert.match(doc, /inside a sentence/);
  });

  it('SKILL.md carries the tap-target rule in the contract, the mobile pass and the acceptance checks', () => {
    const text = skillText();
    assert.match(text, /at least 44 by 44 CSS pixels on touch screens/);
    assert.match(text, /\*\*Tap targets\.\*\*/);
    assert.match(text, /\[ \] Buttons, navigation links and toggles are at least 44 by 44/);
  });

  it('the starter file has a .vy-tap helper of at least 44 by 44 for touch and narrow screens', () => {
    const helper = parseDeclarations(starter).filter((d) => d.context.at(-1) === '.vy-tap');
    assert.ok(helper.length > 0, '.vy-tap is missing');
    assert.ok(helper.every((d) => /pointer: coarse/.test(d.context.join(' '))));
    assert.ok(px(helper.find((d) => d.prop === 'min-height').value) >= 44);
    assert.ok(px(helper.find((d) => d.prop === 'min-width').value) >= 44);
  });

  it('the example button is at least 44px tall at every width', () => {
    assert.ok(px(find('.button', 'min-height').value) >= 44);
  });

  it('the example FAQ question buttons are at least 44px tall', () => {
    assert.ok(px(find('.panel-button', 'min-height').value) >= 44);
  });

  it('the example navigation links get enough padding on touch and narrow screens for 44px', () => {
    const padding = px(find('.link', 'padding-block', 'touch').value);
    const lineHeight = 1.6 * 16; // body line-height is 1.6 and the font is the 16px default
    assert.ok(lineHeight + 2 * padding >= 44, `link height would be ${lineHeight + 2 * padding}px`);
    assert.ok(px(find('.link', 'min-width', 'touch').value) >= 44, 'a short word must still be 44px wide');
    assert.ok(find('.link::after', 'bottom', 'touch'), 'the underline must move with the padding');
  });

  it('the example brand link uses the .vy-tap helper', () => {
    assert.match(read(EXAMPLE_DIR, 'result', 'index.html'), /class="brand vy-tap"/);
  });

  it('recipes 4 and 6 give the same tap-target advice', () => {
    const recipes = read(SKILL_DIR, 'references', 'recipes.md');
    assert.match(recipes, /min-height: 44px/);
    assert.match(recipes, /padding-block: 0\.75rem/);
  });
});

describe('verification.md: static checks and browser tests are kept apart [static]', () => {
  const doc = read(SKILL_DIR, 'references', 'verification.md');

  it('lists every checker rule exactly in its table', () => {
    for (const code of Object.keys(RULES)) assert.ok(doc.includes(`| ${code} |`), `${code} is missing from verification.md`);
  });

  it('defines static check and browser test, and has the manual steps', () => {
    assert.match(doc, /\*\*Static check\*\*/);
    assert.match(doc, /\*\*Browser test\*\*/);
    assert.match(doc, /## Manual browser steps/);
    assert.match(doc, /## The accordion test/);
    assert.match(doc, /browser test: not performed/);
  });

  it('is linked from SKILL.md, and SKILL.md says the checker is static', () => {
    const text = skillText();
    assert.match(text, /\(references\/verification\.md\)/);
    assert.match(text, /\*\*This is a static check\.\*\*/);
  });

  it('the checker script says it is a static check and not a browser test', () => {
    const script = read(SKILL_DIR, 'scripts', 'motion-lint.mjs');
    assert.match(script, /IT IS A STATIC CHECKER/);
  });
});