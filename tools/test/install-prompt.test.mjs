// Tests for the install prompt in docs/install.md and the README: that the two
// copies match, that the prompt asks for the safe steps, that it uses the same
// folders as the code, and that the documents do not claim more than was tested.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { AGENTS } from '../lib/agents.mjs';
import { PROMPT_ORDER } from '../lib/install-skills.mjs';
import { RAW_BASE_URL, REPOSITORY_URL } from '../lib/manifest.mjs';
import { REPO_ROOT } from './helpers.mjs';

const read = (...p) => fs.readFileSync(path.join(REPO_ROOT, ...p), 'utf8').replace(/\r\n/g, '\n');
const installDoc = read('docs', 'install.md');
const readme = read('README.md');

function promptIn(text) {
  const blocks = [...text.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  return blocks;
}

const prompt = promptIn(installDoc)[0];

describe('the install prompt', () => {
  it('is the only text block in docs/install.md and is short enough to paste', () => {
    assert.equal(promptIn(installDoc).length, 1);
    assert.ok(prompt.length > 500 && prompt.length < 3500, `length ${prompt.length}`);
  });

  it('is identical in the README and in docs/install.md', () => {
    assert.equal(promptIn(readme).filter((b) => b.startsWith('Install the VYSON skill')).length, 1);
    assert.ok(readme.includes(prompt), 'the README copy differs from docs/install.md');
  });

  it('names the official repository and downloads the manifest first', () => {
    assert.ok(prompt.includes(REPOSITORY_URL));
    assert.ok(prompt.includes(`${RAW_BASE_URL}/main/skills-manifest.json`));
    assert.ok(prompt.includes(`${RAW_BASE_URL}/main/skills/<skill>/<path>`));
    assert.ok(prompt.indexOf('skills-manifest.json') < prompt.indexOf('<skill>/<path>'));
  });

  it('asks the agent to do everything itself, with no user commands', () => {
    assert.match(prompt, /Do the whole install yourself/);
    assert.match(prompt, /I will not run commands, clone anything or install Node\.js/);
    assert.doesNotMatch(prompt, /\bnpm\b|git clone|npx|powershell -|node tools/i);
  });

  it('downloads byte-exact with a terminal, to a temporary folder, and verifies before installing', () => {
    assert.match(prompt, /terminal \(curl, or PowerShell Invoke-WebRequest\)/);
    assert.match(prompt, /byte-exact/);
    assert.match(prompt, /temporary folder outside my project/);
    assert.match(prompt, /size and sha256/);
    const download = prompt.indexOf('into a temporary folder');
    const copy = prompt.indexOf('Copy each verified skill');
    assert.ok(download > 0 && copy > download, 'verification must come before the copy');
  });

  it('stops and installs nothing when a file is missing or does not match, or the name is unknown', () => {
    assert.match(prompt, /If I named one that is not in the manifest, stop, list the names that exist and install nothing/);
    assert.match(prompt, /If any file is missing or does not match, stop, say which file and install nothing/);
  });

  it('never overwrites, changes nothing else, and does not run what it downloaded', () => {
    assert.match(prompt, /Never overwrite/);
    assert.match(prompt, /leave it untouched, tell me, and ask/);
    assert.match(prompt, /Change nothing else in my project/);
    assert.match(prompt, /Do not run anything you downloaded/);
  });

  it('uses the same project folder as the code for every supported agent', () => {
    const named = {
      cursor: 'Cursor .cursor/skills',
      'claude-code': 'Claude Code .claude/skills',
      codex: 'Codex .agents/skills',
      antigravity: 'Antigravity .agents/skills',
    };
    for (const [id, text] of Object.entries(named)) {
      assert.ok(prompt.includes(text), `${id}: "${text}" not in the prompt`);
      assert.equal(`${AGENTS[id].name} ${AGENTS[id].projectDir}`, text);
    }
    assert.match(prompt, /If you are another agent, stop and tell me where your documentation says project skills go/);
  });

  it('asks for an honest report and does not let the agent call a skill loaded without evidence', () => {
    assert.match(prompt, /installed, already installed, or not installed, with its path and file count/);
    assert.match(prompt, /Do not say a skill is "loaded" unless it appears in your own skill list/);
    assert.match(prompt, /Never say the install worked when it did not/);
  });

  it('reads the installed SKILL.md and continues in the same chat, in the manifest order', () => {
    assert.match(prompt, /SKILL\.md, follow it for my request in this same chat/);
    assert.match(prompt, /Do not ask me to paste another prompt/);
    assert.match(prompt, /in the order the manifest lists them/);
    assert.match(prompt, /If I only asked to install, stop after the report/);
  });

  it('says what to do when downloading or writing is not possible', () => {
    assert.match(prompt, /If you cannot download files or write into this project/);
  });

  it('tells the agent not to use a page-to-text tool (byte-exact files)', () => {
    assert.match(prompt, /Do not use a tool that turns pages into text/);
  });
});

describe('docs/install.md', () => {
  it('lists the five real skill names, which exist in skills/', () => {
    for (const name of PROMPT_ORDER) {
      assert.ok(installDoc.includes(`\`${name}\``), `${name} missing from the skill names table`);
      assert.ok(fs.existsSync(path.join(REPO_ROOT, 'skills', name, 'SKILL.md')));
    }
  });

  it('keeps the manual fallback, the troubleshooting table and the developer install', () => {
    assert.match(installDoc, /## Manual fallback \(no commands at all\)/);
    assert.match(installDoc, /## What can go wrong/);
    assert.match(installDoc, /## Developer install \(separate from the above\)/);
    assert.match(installDoc, /Download ZIP/);
  });

  it('states what was not tested instead of claiming agent support', () => {
    assert.match(installDoc, /\*\*Not tested\.\*\* The manifest has to be pushed to GitHub first/);
    assert.match(installDoc, /Cursor, Claude Code, Codex, Antigravity following the prompt \| \*\*Not tested\.\*\*/);
    assert.match(installDoc, /\*\*Nothing\*\* has been tested in Antigravity/);
    assert.doesNotMatch(installDoc, /\b(fully|officially) (supports?|supported|compatible)\b/i);
    assert.doesNotMatch(installDoc, /guarantee[sd]?\b(?! a result)/i);
  });

  it('says the install prompt is not one of the five workflow prompts', () => {
    assert.match(installDoc, /not\*\* one of the five workflow prompts/);
    assert.match(read('docs', 'five-prompts.md'), /install\.md/);
  });

  it('keeps developer commands out of the user prompt section', () => {
    const userPart = installDoc.slice(0, installDoc.indexOf('## Developer install'));
    assert.doesNotMatch(userPart, /git clone|node tools\/install-skills/);
  });

  it('records decision 15, separate from the five prompts of decision 14', () => {
    const decisions = read('docs', 'decisions.md');
    assert.match(decisions, /\| 15 \| How end users install \|/);
    assert.match(decisions, /does \*\*not\*\* count as one of the five workflow prompts of decision 14/);
  });
});

describe('the README install journey', () => {
  const installSection = readme.slice(readme.indexOf('## Installation'), readme.indexOf('## Use the five skills'));

  it('puts the no-terminal prompt before any developer command', () => {
    const promptAt = installSection.indexOf('Install the VYSON skill');
    const developerAt = installSection.indexOf('### For developers: install from a clone');
    const cloneAt = installSection.indexOf('git clone');
    assert.ok(promptAt > 0 && developerAt > promptAt);
    assert.ok(cloneAt > developerAt, 'git clone appears before the developer section');
  });

  it('keeps contributor install instructions in their own section', () => {
    assert.match(installSection, /### For developers: install from a clone/);
    assert.match(installSection, /--from-github/);
  });

  it('lists all four agent folders and marks Antigravity as untested', () => {
    assert.match(installSection, /\| Antigravity \| `\.agents\/skills\/` \(untested by VYSON\) \|/);
    for (const id of ['cursor', 'claude-code', 'codex']) assert.ok(installSection.includes(`\`${AGENTS[id].projectDir}/\``));
  });

  it('says the prompt has not been run by an agent against the published repository', () => {
    assert.match(installSection, /Not tested yet:\*\* no agent has run this prompt against the published repository/);
    assert.match(readme, /No real agent has run the prompt against the published repository yet/);
  });

  it('links the install guide', () => {
    assert.match(installSection, /\]\(docs\/install\.md/);
  });
});

describe('Antigravity is documented honestly', () => {
  const guide = read('integrations', 'antigravity.md');

  it('is in the agent table as documented-only and unverified', () => {
    assert.equal(AGENTS.antigravity.filePlacement, 'documented-only');
    assert.equal(AGENTS.antigravity.catalogLoad, 'unverified');
    assert.equal(AGENTS.antigravity.projectDir, '.agents/skills');
    assert.equal(AGENTS.antigravity.globalDir, '.gemini/config/skills');
  });

  it('says VYSON has not tested it', () => {
    assert.match(guide, /\*\*Antigravity has not been tested by VYSON at all\.\*\*/);
    assert.match(AGENTS.antigravity.notes, /has not tested Antigravity at all/);
  });

  it('is linked from the integrations index and the agent table', () => {
    assert.match(read('integrations', 'README.md'), /antigravity\.md/);
    assert.match(read('integrations', 'agents.md'), /antigravity\.md/);
  });

  it('is not claimed as verified anywhere in the user documents', () => {
    for (const text of [readme, installDoc, guide, read('integrations', 'agents.md')]) {
      assert.doesNotMatch(text, /Antigravity[^.\n]{0,40}\b(verified|tested and works|confirmed working)\b/i);
    }
  });
});
