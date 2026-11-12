import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, TOOLS_DIR, makeTempDir, removeDir, makeSkill, writeFiles } from './helpers.mjs';
import { AGENTS, AGENT_IDS, detectAgent, getAgent, otherKnownSkillDirs } from '../lib/agents.mjs';
import { compareHashMaps, hashTree, installSkills, isVysonSkillsRepo, listSkillNames } from '../lib/install-skills.mjs';

const INSTALL = path.join(TOOLS_DIR, 'install-skills.mjs');

function run(args, extra = {}) {
  const r = spawnSync(process.execPath, [INSTALL, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...(extra.env ?? {}) },
    cwd: extra.cwd ?? REPO_ROOT,
    input: extra.input,
  });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

function fakeSkillsRepo() {
  const root = makeTempDir('vyson-install-src-');
  makeSkill(path.join(root, 'skills'), 'vyson-alpha', {
    extraHeader: 'metadata:\n  vyson-pillar: "design"\n  vyson-version: "0.1.0"',
    files: { 'references/a.md': '# A\n', 'NOTICE.md': 'MIT notice\n' },
  });
  makeSkill(path.join(root, 'skills'), 'vyson-beta', {
    extraHeader: 'metadata:\n  vyson-pillar: "motion"\n  vyson-version: "0.1.0"',
    files: { 'scripts/check.mjs': 'export {}\n', 'assets/x.css': 'body{}\n' },
  });
  return root;
}

describe('agent mapping', () => {
  it('maps every supported agent to a documented project path', () => {
    assert.equal(AGENTS.cursor.projectDir, '.cursor/skills');
    assert.equal(AGENTS['claude-code'].projectDir, '.claude/skills');
    assert.equal(AGENTS.codex.projectDir, '.agents/skills');
    assert.equal(AGENTS.antigravity.projectDir, '.agents/skills');
    assert.deepEqual([...AGENT_IDS].sort(), ['antigravity', 'claude-code', 'codex', 'cursor']);
  });

  it('marks Antigravity as documented only (never tested by VYSON)', () => {
    assert.equal(AGENTS.antigravity.filePlacement, 'documented-only');
    assert.equal(AGENTS.antigravity.globalDir, '.gemini/config/skills');
  });

  it('does not list a folder shared with the chosen agent as "also found"', () => {
    assert.deepEqual(otherKnownSkillDirs('codex'), ['.cursor/skills', '.claude/skills']);
    assert.deepEqual(otherKnownSkillDirs('antigravity'), ['.cursor/skills', '.claude/skills']);
    assert.deepEqual(otherKnownSkillDirs('cursor'), ['.claude/skills', '.agents/skills']);
  });

  it('does not treat .agents/skills as Cursor\'s install path', () => {
    assert.notEqual(AGENTS.cursor.projectDir, '.agents/skills');
  });

  it('keeps documentation on the same paths as the mapping', () => {
    const agentsMd = fs.readFileSync(path.join(REPO_ROOT, 'integrations', 'agents.md'), 'utf8');
    for (const id of AGENT_IDS) {
      assert.match(agentsMd, new RegExp(AGENTS[id].projectDir.replaceAll('.', '\\.')));
    }
  });

  it('looks up agents by id and common aliases', () => {
    assert.equal(getAgent('Cursor').id, 'cursor');
    assert.equal(getAgent('claude').id, 'claude-code');
    assert.equal(getAgent('unknown'), null);
    assert.equal(getAgent('Antigravity').id, 'antigravity');
    assert.equal(getAgent('agy').id, 'antigravity');
  });

  it('never guesses Antigravity from the environment', () => {
    assert.equal(detectAgent({ ANTIGRAVITY: '1' }).id, null);
  });

  it('detects a single reliable signal', () => {
    assert.equal(detectAgent({ CURSOR_TRACE_ID: 'abc' }).id, 'cursor');
    assert.equal(detectAgent({ CLAUDECODE: '1' }).id, 'claude-code');
    assert.equal(detectAgent({ CODEX_HOME: 'C:\\codex' }).id, 'codex');
  });

  it('stays undecided when there is no signal or more than one', () => {
    assert.equal(detectAgent({}).id, null);
    const both = detectAgent({ CURSOR_AGENT: '1', CLAUDECODE: '1' });
    assert.equal(both.id, null);
    assert.ok(both.candidates.includes('cursor'));
    assert.ok(both.candidates.includes('claude-code'));
  });
});

describe('installSkills library', () => {
  let sourceRoot;
  before(() => {
    sourceRoot = fakeSkillsRepo();
  });
  after(() => removeDir(sourceRoot));

  it('creates a missing agent directory and copies all skills', () => {
    const target = makeTempDir('vyson-install-tgt-');
    try {
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
      });
      assert.equal(result.ok, true);
      assert.equal(result.discovery.status, 'pending');
      assert.equal(result.counts.copied, 2);
      assert.ok(fs.existsSync(path.join(target, '.cursor', 'skills', 'vyson-alpha', 'SKILL.md')));
      assert.ok(fs.existsSync(path.join(target, '.cursor', 'skills', 'vyson-alpha', 'NOTICE.md')));
      assert.ok(fs.existsSync(path.join(target, '.cursor', 'skills', 'vyson-beta', 'scripts', 'check.mjs')));
      const src = hashTree(path.join(sourceRoot, 'skills', 'vyson-alpha'));
      const dest = hashTree(path.join(target, '.cursor', 'skills', 'vyson-alpha'));
      assert.equal(compareHashMaps(src, dest), 'identical');
    } finally {
      removeDir(target);
    }
  });

  it('installs into each verified agent path', () => {
    for (const id of AGENT_IDS) {
      const target = makeTempDir('vyson-install-agent-');
      try {
        const result = installSkills({
          sourceSkillsDir: path.join(sourceRoot, 'skills'),
          targetDir: target,
          agentId: id,
          skillNames: ['vyson-alpha'],
        });
        assert.equal(result.ok, true, id);
        const dest = path.join(target, AGENTS[id].projectDir, 'vyson-alpha', 'SKILL.md');
        assert.equal(fs.existsSync(dest), true, dest);
      } finally {
        removeDir(target);
      }
    }
  });

  it('installs one selected skill and leaves the other uncopied', () => {
    const target = makeTempDir('vyson-install-one-');
    try {
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'claude-code',
        skillNames: ['vyson-beta'],
      });
      assert.equal(result.ok, true);
      assert.equal(result.skills.length, 1);
      assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'vyson-beta', 'SKILL.md')));
      assert.equal(fs.existsSync(path.join(target, '.claude', 'skills', 'vyson-alpha')), false);
    } finally {
      removeDir(target);
    }
  });

  it('skips an identical existing installation and does not overwrite', () => {
    const target = makeTempDir('vyson-install-dup-');
    try {
      const first = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'codex',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(first.counts.copied, 1);
      const second = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'codex',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(second.ok, true);
      assert.equal(second.skills[0].status, 'already-identical');
      assert.equal(second.counts.copied, 0);
    } finally {
      removeDir(target);
    }
  });

  it('refuses to overwrite a different existing skill', () => {
    const target = makeTempDir('vyson-install-conflict-');
    try {
      writeFiles(target, {
        '.cursor/skills/vyson-alpha/SKILL.md': '---\nname: vyson-alpha\ndescription: user edited\n---\n\nChanged.\n',
      });
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(result.ok, false);
      assert.equal(result.skills[0].status, 'conflict');
      const kept = fs.readFileSync(path.join(target, '.cursor', 'skills', 'vyson-alpha', 'SKILL.md'), 'utf8');
      assert.match(kept, /user edited/);
    } finally {
      removeDir(target);
    }
  });

  it('reports a copy in another agent folder without changing it', () => {
    const target = makeTempDir('vyson-install-extra-');
    try {
      writeFiles(target, {
        '.agents/skills/vyson-alpha/SKILL.md': '---\nname: vyson-alpha\ndescription: leftover CLI copy.\n---\n\nOld.\n',
      });
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(result.ok, true);
      assert.equal(result.skills[0].status, 'installed');
      assert.ok(result.skills[0].extras.some((p) => p.includes('.agents/skills/vyson-alpha')));
      const leftover = fs.readFileSync(path.join(target, '.agents', 'skills', 'vyson-alpha', 'SKILL.md'), 'utf8');
      assert.match(leftover, /leftover CLI copy/);
    } finally {
      removeDir(target);
    }
  });

  it('rejects an unknown agent and an unknown skill', () => {
    const target = makeTempDir('vyson-install-unknown-');
    try {
      const badAgent = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'notepad',
      });
      assert.equal(badAgent.ok, false);
      assert.equal(badAgent.code, 2);
      const badSkill = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-does-not-exist'],
      });
      assert.equal(badSkill.ok, false);
      assert.match(badSkill.error, /Unknown skill/);
    } finally {
      removeDir(target);
    }
  });

  it('refuses global install without an extra confirmation flag', () => {
    const target = makeTempDir('vyson-install-global-');
    const home = makeTempDir('vyson-install-home-');
    try {
      const denied = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
        global: true,
        homeDir: home,
      });
      assert.equal(denied.ok, false);
      assert.match(denied.error, /confirm-global/);
      assert.equal(fs.existsSync(path.join(home, '.cursor', 'skills', 'vyson-alpha')), false);

      const allowed = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
        global: true,
        confirmGlobal: true,
        homeDir: home,
      });
      assert.equal(allowed.ok, true);
      assert.ok(fs.existsSync(path.join(home, '.cursor', 'skills', 'vyson-alpha', 'SKILL.md')));
      assert.equal(fs.existsSync(path.join(target, '.cursor', 'skills', 'vyson-alpha')), false);
    } finally {
      removeDir(target);
      removeDir(home);
    }
  });

  it('refuses to install into this repository unless --allow-self is set', () => {
    assert.equal(isVysonSkillsRepo(REPO_ROOT), true);
    const result = installSkills({
      sourceSkillsDir: path.join(sourceRoot, 'skills'),
      targetDir: REPO_ROOT,
      agentId: 'cursor',
      skillNames: ['vyson-alpha'],
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /skills repository/);
  });

  it('keeps discovery pending even after a successful copy', () => {
    const target = makeTempDir('vyson-install-disc-');
    try {
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(result.discovery.status, 'pending');
      assert.match(result.discovery.meaning, /not the same/);
      assert.match(result.usagePrompt, /vyson-alpha/);
      assert.match(result.usagePrompt, /If this skill is not in your skill catalog/);
    } finally {
      removeDir(target);
    }
  });
});

describe('installSkills failure handling', () => {
  let sourceRoot;
  before(() => {
    sourceRoot = fakeSkillsRepo();
  });
  after(() => removeDir(sourceRoot));

  it('reports a clean error when the agent folder cannot be created', () => {
    const target = makeTempDir('vyson-install-blocked-');
    try {
      writeFiles(target, { '.cursor': 'a file, not a folder' });
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(result.ok, false);
      assert.equal(result.code, 1);
      assert.match(result.error, /Could not create/);
      assert.match(fs.readFileSync(path.join(target, '.cursor'), 'utf8'), /a file, not a folder/);
    } finally {
      removeDir(target);
    }
  });

  it('refuses a file where a skill folder should go and keeps that file', () => {
    const target = makeTempDir('vyson-install-filewall-');
    try {
      writeFiles(target, { '.claude/skills/vyson-alpha': 'not a folder' });
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'claude-code',
        skillNames: ['vyson-alpha'],
      });
      assert.equal(result.ok, false);
      assert.equal(result.skills[0].status, 'conflict');
      assert.equal(fs.readFileSync(path.join(target, '.claude', 'skills', 'vyson-alpha'), 'utf8'), 'not a folder');
    } finally {
      removeDir(target);
    }
  });

  it('treats an unknown skill name as a usage error (exit code 2)', () => {
    const target = makeTempDir('vyson-install-badskill-');
    try {
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'cursor',
        skillNames: ['..\\..\\escape'],
      });
      assert.equal(result.ok, false);
      assert.equal(result.code, 2);
      assert.deepEqual(fs.readdirSync(target), []);
    } finally {
      removeDir(target);
    }
  });

  it('names the home-folder path in the prompt for a global install', () => {
    const target = makeTempDir('vyson-install-gprompt-');
    const home = makeTempDir('vyson-install-ghome-');
    try {
      const result = installSkills({
        sourceSkillsDir: path.join(sourceRoot, 'skills'),
        targetDir: target,
        agentId: 'codex',
        skillNames: ['vyson-alpha'],
        global: true,
        confirmGlobal: true,
        homeDir: home,
      });
      assert.equal(result.ok, true);
      assert.match(result.usagePrompt, /~\/\.agents\/skills\/vyson-alpha\//);
    } finally {
      removeDir(target);
      removeDir(home);
    }
  });
});

describe('install-skills command', () => {
  it('prints a short message, not a crash, when the run stops before installing', () => {
    const target = makeTempDir('vyson-install-early-');
    try {
      const unknownSkill = run(['--to', target, '--agent', 'cursor', '--skill', 'vyson-nope']);
      assert.equal(unknownSkill.code, 2);
      assert.match(unknownSkill.err, /Unknown skill/);
      assert.doesNotMatch(unknownSkill.err, /TypeError|at formatInstallReport/);

      const insideRepo = run(['--agent', 'cursor']);
      assert.equal(insideRepo.code, 2);
      assert.match(insideRepo.err, /--to/);
      assert.doesNotMatch(insideRepo.err, /TypeError|at formatInstallReport/);

      const globalNoConfirm = run(['--to', target, '--agent', 'cursor', '--global']);
      assert.equal(globalNoConfirm.code, 2);
      assert.match(globalNoConfirm.err, /confirm-global/);

      assert.deepEqual(fs.readdirSync(target), []);
    } finally {
      removeDir(target);
    }
  });

  it('installs the real five skills into the documented folder of every agent', () => {
    const names = listSkillNames(path.join(REPO_ROOT, 'skills'));
    assert.equal(names.length, 5);
    for (const id of AGENT_IDS) {
      const target = makeTempDir('vyson-install-all-');
      try {
        const r = run(['--to', target, '--agent', id, '--json']);
        assert.equal(r.code, 0, `${id}: ${r.out}${r.err}`);
        const report = JSON.parse(r.out);
        assert.equal(report.counts.copied, 5, id);
        assert.equal(report.discovery.status, 'pending', id);
        for (const name of names) {
          const dest = path.join(target, ...AGENTS[id].projectDir.split('/'), name);
          assert.equal(compareHashMaps(hashTree(path.join(REPO_ROOT, 'skills', name)), hashTree(dest)), 'identical', `${id}/${name}`);
        }
        const again = JSON.parse(run(['--to', target, '--agent', id, '--json']).out);
        assert.equal(again.counts.skippedIdentical, 5, `${id} second run`);
      } finally {
        removeDir(target);
      }
    }
  });

  it('prints the agent table', () => {
    const r = run(['--list-agents']);
    assert.equal(r.code, 0);
    assert.match(r.out, /\.cursor\/skills/);
    assert.match(r.out, /\.claude\/skills/);
    assert.match(r.out, /\.agents\/skills/);
    assert.match(r.out, /Do not assume \.agents\/skills/);
  });

  it('exits 2 when the agent is unknown or missing', () => {
    const target = makeTempDir('vyson-install-cli-');
    try {
      const unknown = run(['--to', target, '--agent', 'notepad'], {
        env: { CURSOR_AGENT: '', CURSOR_TRACE_ID: '', CLAUDECODE: '', CLAUDE_CODE: '', CODEX_HOME: '' },
      });
      assert.equal(unknown.code, 2);
      const missing = run(['--to', target], {
        env: { CURSOR_AGENT: '', CURSOR_TRACE_ID: '', CLAUDECODE: '', CLAUDE_CODE: '', CODEX_HOME: '' },
      });
      assert.equal(missing.code, 2);
      assert.match(`${missing.err}${missing.out}`, /--agent/);
    } finally {
      removeDir(target);
    }
  });

  it('installs the real five skills for Cursor into a temp website', () => {
    const target = makeTempDir('vyson-install-five-');
    try {
      const r = run(['--to', target, '--agent', 'cursor', '--json']);
      assert.equal(r.code, 0, r.out + r.err);
      const report = JSON.parse(r.out);
      assert.equal(report.ok, true);
      assert.equal(report.discovery.status, 'pending');
      assert.equal(report.fileVerification, 'passed');
      const names = listSkillNames(path.join(REPO_ROOT, 'skills'));
      assert.equal(names.length, 5);
      assert.equal(report.skills.length, 5);
      for (const name of names) {
        const dest = path.join(target, '.cursor', 'skills', name);
        assert.equal(compareHashMaps(hashTree(path.join(REPO_ROOT, 'skills', name)), hashTree(dest)), 'identical', name);
        assert.ok(fs.existsSync(path.join(dest, 'SKILL.md')));
      }
    } finally {
      removeDir(target);
    }
  });
});
