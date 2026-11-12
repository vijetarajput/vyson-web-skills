// Copy VYSON skill folders into one agent's documented project (or global) path.
//
// Rules:
// - Copy files. Never create symlinks (they are unreliable on Windows).
// - Never overwrite an existing skill that differs from the source.
// - Identical existing copies are left as they are.
// - File copy success is not agent discovery.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { toPosix, walkFiles, safeReadDir } from './fs-utils.mjs';
import { AGENTS, AGENT_IDS, getAgent, detectAgent, otherKnownSkillDirs } from './agents.mjs';
import { fingerprint } from './content-hash.mjs';

export { AGENTS, AGENT_IDS, getAgent, detectAgent };

const SKIP_NAMES = new Set(['.DS_Store', 'Thumbs.db']);

/** True when `dir` looks like this VYSON skills repository, not a website. */
export function isVysonSkillsRepo(dir) {
  try {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.name !== 'vyson-web-skills') return false;
    return fs.existsSync(path.join(dir, 'skills', 'vyson-css-motion', 'SKILL.md'));
  } catch {
    return false;
  }
}

/**
 * Skill folders directly inside `skillsDir` that contain SKILL.md.
 * @param {string} skillsDir
 * @returns {string[]} folder names, sorted
 */
export function listSkillNames(skillsDir) {
  return safeReadDir(skillsDir)
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .filter((e) => fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
    .map((e) => e.name)
    .sort();
}

/**
 * SHA-256 of every file under `dir`, keyed by posix relative path.
 * Text files are hashed with Windows line endings turned into Unix ones, so a
 * copy that only differs in line endings counts as identical (and the hashes
 * match the skills manifest).
 * @param {string} dir
 * @returns {Map<string, string>}
 */
export function hashTree(dir) {
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const file of walkFiles(dir, { ignoreDirNames: ['.git', 'node_modules'] })) {
    const rel = toPosix(path.relative(dir, file));
    const base = path.basename(file);
    if (SKIP_NAMES.has(base)) continue;
    map.set(rel, fingerprint(fs.readFileSync(file), rel).sha256);
  }
  return map;
}

/**
 * Compare two hash maps.
 * @returns {'identical' | 'different'}
 */
export function compareHashMaps(a, b) {
  if (a.size !== b.size) return 'different';
  for (const [k, v] of a) {
    if (b.get(k) !== v) return 'different';
  }
  return 'identical';
}

function copyFileTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) copyFileTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

// The order in which the five prompts are meant to be used.
export const PROMPT_ORDER = [
  'vyson-premium-website-design',
  'vyson-frontend-development',
  'vyson-3d-interactive-web',
  'vyson-css-motion',
  'vyson-website-quality-engineering',
];

/** The first ```text block of <skill>/references/prompt.md, or null. */
export function readSkillPrompt(sourceSkillsDir, skillName) {
  try {
    const text = fs
      .readFileSync(path.join(sourceSkillsDir, skillName, 'references', 'prompt.md'), 'utf8')
      .replace(/\r\n/g, '\n');
    const m = text.match(/```text\n([\s\S]*?)\n```/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// When the skills ship their prompts, print the real prompt (and where all of
// them are). Otherwise fall back to a short "follow this skill" prompt.
function usagePrompt(skillName, agent, isGlobal, sourceSkillsDir, installedNames) {
  const folder = isGlobal ? `~/${agent.globalDir}` : agent.projectDir;
  const real = readSkillPrompt(sourceSkillsDir, skillName);
  if (real) {
    const step = PROMPT_ORDER.indexOf(skillName) + 1;
    const withPrompts = PROMPT_ORDER.filter(
      (n) => installedNames.includes(n) && readSkillPrompt(sourceSkillsDir, n),
    );
    const lines = [];
    if (withPrompts.length > 1) {
      lines.push('Your prompts are installed with the skills. Use them in this order, each in a new chat:');
      for (const n of withPrompts) lines.push(`  ${PROMPT_ORDER.indexOf(n) + 1}. ${folder}/${n}/references/prompt.md`);
      lines.push('');
    }
    lines.push(`--- Prompt${step ? ` ${step} of 5` : ''}: copy this into a new agent chat ---`, real, '---');
    return lines.join('\n');
  }
  return [
    '--- Copy this into a new agent chat ---',
    `Please follow the installed VYSON skill "${skillName}".`,
    'Read its SKILL.md first and do what it says, including any "Before you start" steps.',
    'Do not skip the skill. Do not invent a different process.',
    `Install path for ${agent.name}: ${folder}/${skillName}/`,
    'If this skill is not in your skill catalog, say so and stop. Do not pretend you loaded it.',
    '---',
  ].join('\n');
}

// What to do after the copy. The restart hints come from each agent's own
// documentation (see agents.mjs); VYSON has not tested them.
function nextStepFor(agent) {
  const ask = 'Ask: "Which VYSON skills appear in your skill catalog?" Only treat a skill as loaded if it is named there.';
  if (agent.id === 'cursor') {
    return `Open a new Cursor Agent chat in this project. ${ask} If they are missing, restart Cursor (Cursor's docs say it discovers skills when it starts) and look under Customize > Skills.`;
  }
  if (agent.id === 'claude-code') {
    return `Start a new Claude Code session in this project. ${ask} Claude Code's docs say that if .claude/skills did not exist when a session started, you run /reload-skills in that session.`;
  }
  if (agent.id === 'antigravity') {
    return `Start a new Antigravity session in this project. Its docs say the agent is shown the list of skills on every turn, but VYSON has not tested Antigravity. ${ask}`;
  }
  return `Start a new ${agent.name} session in this project (restart it if the skills are not listed; its docs say it detects changes automatically). ${ask}`;
}

/**
 * The checks that need no source files: known agent, global confirmed, and not
 * the VYSON repository itself. Returns a failed result, or null when all pass.
 * Used before any download so a bad request fails before the network is touched.
 * @param {{ targetDir: string, agentId: string, global?: boolean, confirmGlobal?: boolean, allowSelf?: boolean }} opts
 */
export function precheckInstall(opts) {
  const targetDir = path.resolve(opts.targetDir);
  const fail = (error, agent) => ({ ok: false, code: 2, error, agent, targetDir, skills: [], notes: [] });

  const agent = getAgent(opts.agentId);
  if (!agent) return fail(`Unknown agent "${opts.agentId}". Use one of: ${AGENT_IDS.join(', ')}.`, null);

  if (opts.global && !opts.confirmGlobal) {
    return fail(
      'Global install is off by default. Pass both --global and --confirm-global if you really want files in your home folder.',
      agent,
    );
  }

  if (!opts.global && isVysonSkillsRepo(targetDir) && !opts.allowSelf) {
    return fail(
      'That folder is the VYSON skills repository, not a website. Pass --to your-website-folder. To install here anyway, pass --allow-self.',
      agent,
    );
  }
  return null;
}

/**
 * Install one or more skills into a project (or, with explicit flags, the home folder).
 *
 * @param {{
 *   sourceSkillsDir: string,
 *   targetDir: string,
 *   agentId: string,
 *   skillNames?: string[] | '*',
 *   global?: boolean,
 *   confirmGlobal?: boolean,
 *   allowSelf?: boolean,
 *   homeDir?: string,
 * }} opts
 */
export function installSkills(opts) {
  const sourceSkillsDir = path.resolve(opts.sourceSkillsDir);
  const targetDir = path.resolve(opts.targetDir);
  const homeDir = path.resolve(opts.homeDir ?? os.homedir());
  const notes = [];
  const skills = [];

  const refused = precheckInstall(opts);
  if (refused) return refused;
  const agent = getAgent(opts.agentId);

  if (!fs.existsSync(sourceSkillsDir) || !fs.statSync(sourceSkillsDir).isDirectory()) {
    return {
      ok: false,
      code: 1,
      error: `Skills source folder not found: ${sourceSkillsDir}`,
      agent,
      targetDir,
      skills,
      notes,
    };
  }

  const available = listSkillNames(sourceSkillsDir);
  let requested;
  if (!opts.skillNames || opts.skillNames === '*' || (Array.isArray(opts.skillNames) && opts.skillNames.includes('*'))) {
    requested = available;
  } else {
    requested = [...new Set(opts.skillNames)];
  }

  if (requested.length === 0) {
    return {
      ok: false,
      code: 1,
      error: 'No skills to install.',
      agent,
      targetDir,
      skills,
      notes,
    };
  }

  const missing = requested.filter((n) => !available.includes(n));
  if (missing.length) {
    return {
      ok: false,
      code: 2,
      error: `Unknown skill name(s): ${missing.join(', ')}. Available: ${available.join(', ')}.`,
      agent,
      targetDir,
      skills,
      notes,
    };
  }

  const destRoot = opts.global
    ? path.join(homeDir, agent.globalDir)
    : path.join(targetDir, agent.projectDir);

  try {
    fs.mkdirSync(destRoot, { recursive: true });
  } catch (e) {
    return {
      ok: false,
      code: 1,
      error: `Could not create ${toPosix(destRoot)}: ${e.message}. Check that no file in that path has the same name as a folder, and that you can write there. Nothing was copied.`,
      agent,
      targetDir,
      skills,
      notes,
    };
  }

  let conflicts = 0;
  let copied = 0;
  let skippedIdentical = 0;

  for (const name of requested) {
    const src = path.join(sourceSkillsDir, name);
    const dest = path.join(destRoot, name);
    const srcHashes = hashTree(src);
    const extras = [];
    for (const other of otherKnownSkillDirs(agent.id)) {
      const otherPath = path.join(opts.global ? homeDir : targetDir, other, name);
      if (fs.existsSync(path.join(otherPath, 'SKILL.md'))) extras.push(toPosix(otherPath));
    }

    const row = {
      name,
      dest: toPosix(dest),
      status: 'pending',
      files: srcHashes.size,
      extras,
      detail: '',
    };

    if (fs.existsSync(dest)) {
      const destStat = fs.statSync(dest);
      if (!destStat.isDirectory()) {
        row.status = 'conflict';
        row.detail = 'A file already exists at the destination path.';
        conflicts += 1;
      } else {
        const destHashes = hashTree(dest);
        if (compareHashMaps(srcHashes, destHashes) === 'identical') {
          row.status = 'already-identical';
          row.detail = 'Already installed and the files match. Left unchanged.';
          skippedIdentical += 1;
        } else {
          row.status = 'conflict';
          row.detail =
            'Destination exists and differs from the source. Not overwritten. Remove or rename that folder if you want a fresh copy.';
          conflicts += 1;
        }
      }
    } else {
      let copyError = null;
      try {
        copyFileTree(src, dest);
      } catch (e) {
        copyError = e;
      }
      if (copyError) {
        row.status = 'failed';
        row.detail = `The copy stopped: ${copyError.message} A partly copied folder may exist at ${toPosix(dest)}. Delete that folder, then run the installer again.`;
        conflicts += 1;
      } else if (compareHashMaps(srcHashes, hashTree(dest)) !== 'identical') {
        row.status = 'failed';
        row.detail = 'Copy finished but the files do not match the source.';
        conflicts += 1;
      } else {
        row.status = 'installed';
        row.detail = `Copied ${srcHashes.size} files.`;
        copied += 1;
      }
    }

    if (extras.length) {
      row.detail += ` Also found at: ${extras.join(', ')}. Those copies were not changed.`;
    }
    skills.push(row);
  }

  const promptSkill =
    skills.find((s) => s.name === 'vyson-premium-website-design' && s.status !== 'conflict' && s.status !== 'failed')
      ?.name ?? skills.find((s) => s.status === 'installed' || s.status === 'already-identical')?.name;

  const ok = conflicts === 0;
  const discovery = {
    status: 'pending',
    meaning:
      'Files were copied or confirmed. That is not the same as the agent loading the skill. Discovery stays pending until a new agent session lists the skill in its catalog.',
    nextStep: nextStepFor(agent),
  };

  notes.push(
    `Install is ${opts.global ? 'global (home folder)' : 'project-level'}.`,
    `Documented ${agent.name} path: ${opts.global ? '~/' + agent.globalDir : agent.projectDir}/<skill-name>/SKILL.md.`,
    `Docs: ${agent.docsUrl} (checked ${agent.docsCheckedOn}).`,
    agent.notes,
  );

  return {
    ok,
    code: ok ? 0 : 1,
    error: ok ? null : `${conflicts} skill(s) were not installed because of a conflict or copy failure. Existing files were left unchanged.`,
    agent,
    targetDir: toPosix(opts.global ? homeDir : targetDir),
    destRoot: toPosix(destRoot),
    global: Boolean(opts.global),
    fileVerification: ok ? 'passed' : 'failed',
    counts: { copied, skippedIdentical, conflicts, requested: requested.length },
    skills,
    discovery,
    usagePrompt: promptSkill
      ? usagePrompt(
          promptSkill,
          agent,
          Boolean(opts.global),
          sourceSkillsDir,
          skills.filter((s) => s.status === 'installed' || s.status === 'already-identical').map((s) => s.name),
        )
      : '',
    notes,
  };
}

/** Plain-text onboarding report. */
export function formatInstallReport(result) {
  const lines = [];
  lines.push('VYSON Web Skills — install report');
  lines.push('');
  if (!result.agent) {
    lines.push(result.error);
    return lines.join('\n');
  }
  lines.push(`Agent: ${result.agent.name} (${result.agent.id})`);
  lines.push(`Target: ${result.targetDir}`);
  if (result.source && !result.destRoot) lines.push(`Source: ${result.source.description}`);
  if (!result.destRoot) {
    // The install stopped before any folder was touched.
    lines.push('');
    lines.push(result.error);
    lines.push('');
    lines.push('RESULT: NOTHING INSTALLED.');
    return lines.join('\n');
  }
  if (result.source) lines.push(`Source: ${result.source.description}`);
  lines.push(`Install folder: ${result.destRoot}`);
  lines.push(`File verification: ${result.fileVerification}`);
  lines.push(`Discovery: ${result.discovery.status} — ${result.discovery.meaning}`);
  lines.push(`Next: ${result.discovery.nextStep}`);
  lines.push('');
  lines.push('Skills:');
  for (const s of result.skills) {
    lines.push(`  - ${s.name}`);
    lines.push(`      status: ${s.status}`);
    lines.push(`      path: ${s.dest}`);
    if (s.detail) lines.push(`      ${s.detail}`);
  }
  if (result.error) {
    lines.push('');
    lines.push(result.error);
  }
  if (result.usagePrompt) {
    lines.push('');
    lines.push('Ready-to-copy prompt:');
    lines.push(result.usagePrompt);
  }
  if (result.notes.length) {
    lines.push('');
    lines.push('Notes:');
    for (const n of result.notes) lines.push(`  - ${n}`);
  }
  if (result.ok) {
    lines.push('');
    lines.push('RESULT: FILES INSTALLED (discovery pending).');
  } else {
    lines.push('');
    lines.push('RESULT: INSTALL INCOMPLETE.');
  }
  return lines.join('\n');
}

/** Recovery text when files exist but the agent does not list the skill. */
export function recoveryInstructions(agent) {
  const folder = agent.projectDir;
  return [
    'If the agent does not list the VYSON skills:',
    `1. Confirm each skill has ${folder}/<skill-name>/SKILL.md in the project.`,
    '2. Close this chat and open a new agent session in the same project. If that is not enough, restart the agent (Cursor\'s docs say it discovers skills when it starts).',
    '3. Ask: "Which VYSON skills appear in your skill catalog?"',
    '4. If they still do not appear, check the agent\'s Skills / Customize panel.',
    '5. For Cursor, .agents/skills/ is also a documented folder, but in one real test (12 November 2026, not repeated) files there were not in the catalog. VYSON uses .cursor/skills/.',
    '6. Do not claim a skill is loaded only because the files exist.',
  ].join('\n');
}
