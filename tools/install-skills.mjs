#!/usr/bin/env node
// Copy VYSON skills into the folder the chosen AI coding agent documents.
//
// This is a small copier. By default it copies from this repository and does
// not talk to the internet. With --from-github it downloads the skills from the
// public repository, checks every file against skills-manifest.json, and only
// then copies. It does not install globally unless you ask twice, and never
// overwrites a different copy. Files on disk are not the same as the agent
// loading a skill.
//
// End users normally do not run this: docs/install.md has a prompt that makes
// the agent do the same steps. This is the tested reference and the developer tool.
//
// Usage:
//   node tools/install-skills.mjs --to path\to\website --agent cursor
//   node tools/install-skills.mjs --to path\to\website --agent cursor --skill vyson-css-motion
//   node tools/install-skills.mjs --from-github --to path\to\website --agent cursor
//
// Exit codes: 0 files installed or already identical, 1 conflict/copy failure, 2 usage error
// (unknown agent or skill, missing folder, refused flag combination).

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { AGENT_IDS, AGENTS, detectAgent, getAgent } from './lib/agents.mjs';
import { installFromGithub } from './lib/github-install.mjs';
import { formatInstallReport, installSkills, recoveryInstructions } from './lib/install-skills.mjs';
import { MANIFEST_NAME, compareWithManifest, validateManifest } from './lib/manifest.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SOURCE = path.join(REPO_ROOT, 'skills');

const HELP = `VYSON Web Skills installer

Copies skill folders into one agent's documented project path, from this
repository or (with --from-github) from the public GitHub repository.
Installation is not discovery: a new agent session is still required.

Usage:
  node tools/install-skills.mjs --to <website-folder> --agent <id>
  node tools/install-skills.mjs --to <website-folder> --agent cursor --skill vyson-css-motion
  node tools/install-skills.mjs --from-github --to <website-folder> --agent cursor
  node tools/install-skills.mjs --list-agents
  node tools/install-skills.mjs --help

Options:
  --to <folder>              Website / project to install into (default: current folder)
  --agent, -a <id>           cursor | claude-code | codex | antigravity
  --skill, -s <name>         One skill, or '*' for all (default: all)
  --source <folder>          Folder that contains the skill folders (default: this repo's skills/)
  --from-github              Download from the public GitHub repository, verify every file, then install
  --ref <name>               Branch, tag or commit to download (default: main). Needs --from-github
  --base-url <url>           Download from another address (testing or a mirror). Needs --from-github
  --allow-self               Allow installing into the VYSON skills repository itself
  --global                   Install into the home folder (off by default)
  --confirm-global           Required together with --global
  --json                     Machine-readable report
  --list-agents              Print the agent-to-path table and exit
  -h, --help                 Show this help

Exit codes: 0 files installed or already identical, 1 conflict, 2 incorrect usage.

No telemetry. No extra packages. No overwrites of different existing files.
Downloads (only with --from-github) are data only: nothing downloaded is run.
`;

function parseArgs(argv) {
  const opts = {
    to: null,
    agents: [],
    skills: [],
    source: null,
    fromGithub: false,
    ref: null,
    baseUrl: null,
    allowSelf: false,
    global: false,
    confirmGlobal: false,
    json: false,
    listAgents: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const need = (flag) => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) throw new Error(`${flag} needs a value.`);
      i += 1;
      return value;
    };
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--list-agents') opts.listAgents = true;
    else if (a === '--from-github') opts.fromGithub = true;
    else if (a === '--ref') opts.ref = need('--ref');
    else if (a === '--base-url') opts.baseUrl = need('--base-url');
    else if (a === '--allow-self') opts.allowSelf = true;
    else if (a === '--global') opts.global = true;
    else if (a === '--confirm-global') opts.confirmGlobal = true;
    else if (a === '--to') opts.to = need('--to');
    else if (a === '--source') opts.source = need('--source');
    else if (a === '--agent' || a === '-a') opts.agents.push(need(a));
    else if (a === '--skill' || a === '-s') opts.skills.push(need(a));
    else if (a.startsWith('-')) throw new Error(`Unknown option: ${a}`);
    else throw new Error(`Unexpected argument: ${a}`);
  }
  return opts;
}

// When the source folder sits next to a skills-manifest.json (a clone of the
// repository), look for missing files before copying.
function checkAgainstLocalManifest(sourceSkillsDir, skillNames) {
  const none = { missing: [], changed: [], extra: [] };
  const manifestPath = path.join(path.dirname(sourceSkillsDir), MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) return none;
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return none;
  }
  if (!validateManifest(manifest).ok) return none;
  const all = Object.keys(manifest.skills);
  const names = skillNames === '*' || skillNames.includes('*') ? all : skillNames.filter((n) => all.includes(n));
  return compareWithManifest(sourceSkillsDir, manifest, names);
}

function printAgentTable() {
  const lines = ['Supported agents (v0.1):', ''];
  for (const id of AGENT_IDS) {
    const a = AGENTS[id];
    lines.push(`${a.name}  (--agent ${a.id})`);
    lines.push(`  Project path: ${a.projectDir}/<skill-name>/SKILL.md`);
    lines.push(`  Docs: ${a.docsUrl} (checked ${a.docsCheckedOn})`);
    lines.push(`  File placement: ${a.filePlacement}. Catalog load: ${a.catalogLoad}.`);
    lines.push(`  ${a.notes}`);
    lines.push('');
  }
  lines.push('Do not assume .agents/skills/ is discovered by every agent. Codex and Antigravity both document it; Cursor and Claude Code use their own folders.');
  return lines.join('\n');
}

function askAgent(candidates) {
  const ids = candidates.length ? candidates : AGENT_IDS;
  process.stderr.write('Which agent should VYSON install for?\n');
  ids.forEach((id, i) => {
    const a = AGENTS[id];
    process.stderr.write(`  ${i + 1}) ${id}  →  ${a.projectDir}/\n`);
  });
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    rl.question('Enter a number or agent id: ', (answer) => {
      rl.close();
      const t = answer.trim().toLowerCase();
      const asNum = Number.parseInt(t, 10);
      if (asNum >= 1 && asNum <= ids.length) resolve(ids[asNum - 1]);
      else if (getAgent(t)) resolve(getAgent(t).id);
      else resolve(null);
    });
  });
}

async function resolveAgent(opts) {
  if (opts.agents.length > 1) {
    return { error: 'Pass one --agent at a time so files go to one documented folder.' };
  }
  if (opts.agents.length === 1) {
    const agent = getAgent(opts.agents[0]);
    if (!agent) return { error: `Unknown agent "${opts.agents[0]}". Use one of: ${AGENT_IDS.join(', ')}.` };
    return { id: agent.id };
  }
  const detected = detectAgent(process.env);
  if (detected.id) return { id: detected.id, detected: detected.reason };
  const canAsk = Boolean(process.stdin.isTTY && process.stderr.isTTY);
  if (canAsk) {
    const id = await askAgent(detected.candidates ?? []);
    if (!id) return { error: `Please pass --agent (${AGENT_IDS.join(', ')}).` };
    return { id };
  }
  return {
    error:
      `${detected.reason} Pass --agent (${AGENT_IDS.join(', ')}). Example: --agent cursor`,
  };
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${e.message}\n\nRun with --help to see how to use this tool.`);
    return 2;
  }
  if (opts.help) {
    console.log(HELP);
    return 0;
  }
  if (opts.listAgents) {
    console.log(printAgentTable());
    return 0;
  }

  const resolved = await resolveAgent(opts);
  if (resolved.error) {
    console.error(`${resolved.error}\n\nRun with --help to see how to use this tool.`);
    return 2;
  }

  if (opts.fromGithub && opts.source) {
    console.error('Use either --from-github or --source, not both.\n\nRun with --help to see how to use this tool.');
    return 2;
  }
  if (!opts.fromGithub && (opts.ref || opts.baseUrl)) {
    console.error('--ref and --base-url only work together with --from-github.\n\nRun with --help to see how to use this tool.');
    return 2;
  }

  const sourceSkillsDir = path.resolve(opts.source ?? DEFAULT_SOURCE);
  const targetDir = path.resolve(opts.to ?? process.cwd());
  if (opts.to && !fs.existsSync(targetDir)) {
    console.error(`Target folder not found: ${targetDir}\n\nCreate the website folder first, then run the installer again.`);
    return 2;
  }

  const skillNames = opts.skills.length ? opts.skills : '*';
  const common = {
    targetDir,
    agentId: resolved.id,
    skillNames,
    global: opts.global,
    confirmGlobal: opts.confirmGlobal,
    allowSelf: opts.allowSelf,
  };

  let result;
  if (opts.fromGithub) {
    result = await installFromGithub({ ...common, ref: opts.ref ?? undefined, baseUrl: opts.baseUrl ?? undefined });
  } else {
    const manifestCheck = checkAgainstLocalManifest(sourceSkillsDir, skillNames);
    if (manifestCheck.missing.length) {
      result = {
        ok: false,
        code: 1,
        error: `These files are listed in ${MANIFEST_NAME} but are missing from ${sourceSkillsDir}: ${manifestCheck.missing.join(', ')}. The skills folder is incomplete. Restore it (for example with git pull) or use --from-github.`,
        agent: getAgent(resolved.id),
        targetDir,
        skills: [],
        notes: [],
      };
    } else {
      result = installSkills({ ...common, sourceSkillsDir });
      if (manifestCheck.changed.length || manifestCheck.extra.length) {
        result.notes.push(
          `Some local skill files differ from ${MANIFEST_NAME} (changed: ${manifestCheck.changed.length}, extra: ${manifestCheck.extra.length}). If you edited the skills on purpose, run: npm run build:manifest`,
        );
      }
    }
  }

  if (resolved.detected) result.notes.unshift(`Detected agent from environment: ${resolved.detected}`);
  result.notes.push(recoveryInstructions(result.agent ?? AGENTS.cursor));

  // An install that stopped before touching any folder has no install report.
  const stoppedEarly = !result.ok && !result.destRoot;
  if (opts.json) console.log(JSON.stringify(result, null, 2));
  else if (stoppedEarly) console.error(`${result.error}\n\nNothing was installed. Run with --help to see how to use this tool.`);
  else console.log(formatInstallReport(result));
  return result.code;
}

try {
  process.exitCode = await main();
} catch (e) {
  console.error(`Unexpected error: ${e.message}\n\nNothing was deleted or overwritten. Run with --help, or report this at the project's issue tracker.`);
  process.exitCode = 1;
}
