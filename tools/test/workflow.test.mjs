// Tests for the "ready to use" workflow: every skill runs in one pass, ships its
// own prompt and hand-off format, and the five prompts match the documentation.
// These tests read text. They check structure, not what an agent does with it.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, makeTempDir, removeDir } from './helpers.mjs';
import { installSkills, PROMPT_ORDER, readSkillPrompt, compareHashMaps, hashTree } from '../lib/install-skills.mjs';

const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const read = (...p) => fs.readFileSync(path.join(REPO_ROOT, ...p), 'utf8').replace(/\r\n/g, '\n');

const SECTION_BY_SKILL = {
  'vyson-premium-website-design': 'Design',
  'vyson-frontend-development': 'Frontend',
  'vyson-3d-interactive-web': '3D',
  'vyson-css-motion': 'Motion',
  'vyson-website-quality-engineering': 'Quality',
};

const SKILLS = PROMPT_ORDER;

// Wording that made the skills stop and wait. It must not come back.
const FRICTION = [
  /ask at most three questions/i,
  /wait for a yes before building/i,
  /show the (note|user the short list)[^.]*before building/i,
  /ask (first )?before adding (scripts|a dependency)/i,
  /ask before adding it/i,
  /and ask first\./i,
  /Should the motion feel calm and subtle/i,
  /explicitly accepted by the user/i,
];

describe('the five skills run in one pass', () => {
  it('lists the five skills in the documented order', () => {
    assert.deepEqual(SKILLS, Object.keys(SECTION_BY_SKILL));
    for (const s of SKILLS) assert.ok(fs.existsSync(path.join(SKILLS_DIR, s, 'SKILL.md')), s);
  });

  for (const skill of SKILLS) {
    describe(skill, () => {
      const skillMd = read('skills', skill, 'SKILL.md');
      const workflow = read('skills', skill, 'references', 'workflow.md');

      it('SKILL.md states the default workflow, the lane, and when to ask', () => {
        assert.match(skillMd, /## How this skill runs/);
        assert.match(skillMd, /understand, plan internally, implement, verify, present/i);
        assert.match(skillMd, /\*\*Your lane\.\*\*/);
        assert.match(skillMd, /\*\*Ask only when blocked\*\*/);
        assert.match(skillMd, /\*\*Ask first only for\*\*/);
        assert.match(skillMd, /committing, pushing, deploying/);
      });

      it('SKILL.md links the workflow and the prompt, and names the hand-off file', () => {
        assert.match(skillMd, /\]\(references\/workflow\.md\)/);
        assert.match(skillMd, /\]\(references\/prompt\.md\)/);
        assert.match(skillMd, /VYSON-NOTES\.md/);
      });

      it('SKILL.md has an acceptance check that the work is built, not only advised', () => {
        assert.match(skillMd, /- \[ \] [^\n]*(built|implemented|fixed in the project|builds)[^\n]*no approval was requested/i);
      });

      it('has no wording that makes the agent stop and wait', () => {
        const files = [path.join(SKILLS_DIR, skill, 'SKILL.md')];
        for (const f of fs.readdirSync(path.join(SKILLS_DIR, skill, 'references'))) {
          files.push(path.join(SKILLS_DIR, skill, 'references', f));
        }
        for (const f of files) {
          const text = fs.readFileSync(f, 'utf8');
          for (const re of FRICTION) {
            assert.doesNotMatch(text, re, `${path.relative(REPO_ROOT, f)} matches ${re}`);
          }
        }
      });

      it('workflow.md has phases, defaults, blocked rule, safeguards and a hand-off format', () => {
        for (const heading of [
          '## The five phases',
          '## Decisions you make alone',
          '## When you are really blocked',
          '## Safeguards (these still apply)',
          '## The hand-off section',
          '## Worked example',
        ]) {
          assert.ok(workflow.includes(heading), `${skill} workflow.md is missing "${heading}"`);
        }
        assert.match(workflow, /Do not commit, push, deploy or publish\./);
        assert.match(workflow, /`VYSON-NOTES\.md`/);
        assert.match(workflow, new RegExp(`## ${SECTION_BY_SKILL[skill].replace('+', '\\+')} \\(${skill}\\)`));
        assert.match(workflow, /invented walk-through of the method, not a record of a real run/);
      });

      it('workflow.md covers plain HTML, React, Next.js and Vue', () => {
        for (const word of ['Plain HTML', 'React', 'Next.js', 'Vue']) {
          assert.ok(workflow.includes(word), `${skill} workflow.md does not mention ${word}`);
        }
      });

      it('workflow.md does not link to another reference file', () => {
        assert.doesNotMatch(workflow, /\]\([^)]*\.md[^)]*\)/);
      });
    });
  }

  it('each skill writes a different section of the same hand-off file', () => {
    const names = SKILLS.map((s) => SECTION_BY_SKILL[s]);
    assert.equal(new Set(names).size, 5);
    for (const s of SKILLS) {
      const workflow = read('skills', s, 'references', 'workflow.md');
      assert.match(workflow, /Edit only your own section\. Never delete another skill's section\./);
    }
  });
});

describe('the five prompts', () => {
  SKILLS.forEach((skill, index) => {
    describe(`prompt ${index + 1}: ${skill}`, () => {
      const raw = read('skills', skill, 'references', 'prompt.md');
      const prompt = readSkillPrompt(SKILLS_DIR, skill);

      it('is one fenced text block', () => {
        assert.equal((raw.match(/```text\n/g) ?? []).length, 1);
        assert.ok(prompt, 'no ```text block found');
      });

      it('names its skill and its step, and reads the hand-off file', () => {
        assert.ok(prompt.includes(`Use the ${skill} skill on this project.`));
        assert.ok(prompt.includes(`This is step ${index + 1} of 5 for this site.`));
        assert.match(prompt, /VYSON-NOTES\.md/);
        assert.match(prompt, new RegExp(`"${SECTION_BY_SKILL[skill]}" section of VYSON-NOTES\\.md`));
      });

      it('states scope, expected result, preservation and the report', () => {
        assert.match(prompt, /What to do:/);
        assert.match(prompt, /Result I expect:/);
        assert.match(prompt, /Keep: /);
        assert.match(prompt, /Finish with a short report|Finish with a report/);
      });

      it('asks for implementation, not approval', () => {
        assert.match(prompt, /Do the whole job now instead of planning it\./);
        assert.match(prompt, /Do not stop to ask me to approve/);
        assert.match(prompt, /Ask a question only if you cannot continue at all\./);
      });

      it('keeps the safeguards', () => {
        assert.match(prompt, /Do not commit, push[^.]*deploy/);
        assert.match(prompt, /delete nothing important/);
      });

      it('tells the agent what to do if the skill is not listed', () => {
        assert.match(prompt, /If you cannot see the skill in your skill list/);
        assert.match(prompt, /\.cursor\/skills, \.claude\/skills or \.agents\/skills/);
        assert.match(prompt, /not loaded automatically/);
      });

      it('is short enough to paste (under 3500 characters)', () => {
        assert.ok(prompt.length < 3500, `${prompt.length} characters`);
      });

      it('mentions no remote instruction and no result that was not measured', () => {
        assert.doesNotMatch(prompt, /https?:\/\//);
        assert.doesNotMatch(prompt, /\b\d+\s?fps\b|\bLighthouse score of\b/i);
      });
    });
  });

  it('docs/five-prompts.md holds the same five prompts, in order', () => {
    const doc = read('docs', 'five-prompts.md');
    const blocks = [...doc.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
    assert.equal(blocks.length, 5);
    SKILLS.forEach((skill, i) => {
      assert.equal(blocks[i], readSkillPrompt(SKILLS_DIR, skill), `prompt ${i + 1} (${skill}) differs from the skill's copy`);
    });
  });

  it('the README links the prompts and says they have not been run end to end', () => {
    const readme = read('README.md');
    assert.match(readme, /docs\/five-prompts\.md/);
    assert.match(readme, /no agent has yet followed all five prompts/i);
  });
});

describe('the installer prints the real prompt', () => {
  it('installs the five skills and lists the five prompt files in order', () => {
    const target = makeTempDir('vyson-wf-install-');
    try {
      const result = installSkills({
        sourceSkillsDir: SKILLS_DIR,
        targetDir: target,
        agentId: 'cursor',
        skillNames: '*',
      });
      assert.equal(result.ok, true);
      assert.equal(result.counts.copied, 5);
      assert.match(result.usagePrompt, /Prompt 1 of 5/);
      assert.ok(result.usagePrompt.includes(readSkillPrompt(SKILLS_DIR, SKILLS[0])));
      const order = [...result.usagePrompt.matchAll(/\.cursor\/skills\/(vyson-[a-z0-9-]+)\/references\/prompt\.md/g)].map((m) => m[1]);
      assert.deepEqual(order, SKILLS);
      assert.equal(result.discovery.status, 'pending');
    } finally {
      removeDir(target);
    }
  });

  it('every installed skill carries its prompt and workflow files unchanged', () => {
    const target = makeTempDir('vyson-wf-files-');
    try {
      installSkills({ sourceSkillsDir: SKILLS_DIR, targetDir: target, agentId: 'claude-code', skillNames: '*' });
      for (const skill of SKILLS) {
        const dest = path.join(target, '.claude', 'skills', skill);
        for (const file of ['references/prompt.md', 'references/workflow.md', 'SKILL.md']) {
          assert.ok(fs.existsSync(path.join(dest, file)), `${skill}/${file} was not installed`);
        }
        assert.equal(compareHashMaps(hashTree(path.join(SKILLS_DIR, skill)), hashTree(dest)), 'identical', skill);
      }
    } finally {
      removeDir(target);
    }
  });

  it('prints the prompt of the one skill that was installed', () => {
    const target = makeTempDir('vyson-wf-one-');
    try {
      const result = installSkills({
        sourceSkillsDir: SKILLS_DIR,
        targetDir: target,
        agentId: 'codex',
        skillNames: ['vyson-css-motion'],
      });
      assert.equal(result.ok, true);
      assert.match(result.usagePrompt, /Prompt 4 of 5/);
      assert.ok(result.usagePrompt.includes('Use the vyson-css-motion skill on this project.'));
    } finally {
      removeDir(target);
    }
  });
});
