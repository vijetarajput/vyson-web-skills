// Agent-to-folder mapping for VYSON skill installation.
//
// Paths come from each agent's own documentation, not from the third-party
// Skills CLI. Do not assume `.agents/skills/` works everywhere: in one real
// Cursor session (12 November 2026, not repeated) skills copied there did not
// appear in the catalog, although Cursor's docs list that folder.
//
// File placement is not the same as the agent discovering the skill.

/** @typedef {{
 *   id: string,
 *   name: string,
 *   projectDir: string,
 *   globalDir: string,
 *   docsUrl: string,
 *   docsCheckedOn: string,
 *   filePlacement: 'verified' | 'documented-only',
 *   catalogLoad: 'unverified',
 *   notes: string,
 * }} AgentSpec */

/** @type {Record<string, AgentSpec>} */
export const AGENTS = {
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    projectDir: '.cursor/skills',
    globalDir: '.cursor/skills',
    docsUrl: 'https://cursor.com/docs/skills',
    docsCheckedOn: '2026-11-12',
    filePlacement: 'verified',
    catalogLoad: 'unverified',
    notes:
      'Cursor documents both .cursor/skills/ and .agents/skills/. In one real Next.js project session (12 November 2026, not repeated), files that Skills CLI 1.7.6 wrote to .agents/skills/ did not appear in Cursor\'s skill catalog, so VYSON installs Cursor skills to .cursor/skills/. Cursor\'s docs say it discovers skills when it starts. Catalog load of VYSON skills has not been confirmed.',
  },
  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    projectDir: '.claude/skills',
    globalDir: '.claude/skills',
    docsUrl: 'https://code.claude.com/docs/en/skills',
    docsCheckedOn: '2026-11-12',
    filePlacement: 'verified',
    catalogLoad: 'unverified',
    notes:
      'Claude Code documents project skills at .claude/skills/<name>/SKILL.md. Skills CLI 1.7.6 file placement into that folder was tested. Claude Code loading or following a VYSON skill has not been verified.',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    projectDir: '.agents/skills',
    globalDir: '.agents/skills',
    docsUrl: 'https://learn.chatgpt.com/docs/build-skills.md',
    docsCheckedOn: '2026-11-12',
    filePlacement: 'verified',
    catalogLoad: 'unverified',
    notes:
      'OpenAI documents Codex repository skills at .agents/skills/ (its page does not list .codex/skills/, so VYSON does not install there). Skills CLI 1.7.6 file placement into .agents/skills/ was tested. The Codex CLI was not found on the test PC, and Codex loading or following a VYSON skill has not been verified.',
  },
  antigravity: {
    id: 'antigravity',
    name: 'Antigravity',
    projectDir: '.agents/skills',
    globalDir: '.gemini/config/skills',
    docsUrl: 'https://antigravity.google/docs/skills',
    docsCheckedOn: '2026-11-12',
    filePlacement: 'documented-only',
    catalogLoad: 'unverified',
    notes:
      'Antigravity\'s docs describe workspace skills at .agents/skills/<name>/SKILL.md (the older .agent/skills/ is still read) and global skills at ~/.gemini/config/skills/. Its docs say the agent is shown the list of skills on every turn. One third-party write-up (atamel.dev, July 2026) reports that .agents/skills/ was recognised by all three Antigravity products. VYSON has not tested Antigravity at all, so file placement and skill loading are both unverified.',
  },
};

export const AGENT_IDS = Object.keys(AGENTS);

/**
 * Look up an agent by id (case-insensitive, hyphens or spaces).
 * @param {string} raw
 * @returns {AgentSpec | null}
 */
export function getAgent(raw) {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase().replace(/\s+/g, '-');
  const aliases = {
    claude: 'claude-code',
    'claude-code': 'claude-code',
    cursor: 'cursor',
    codex: 'codex',
    antigravity: 'antigravity',
    agy: 'antigravity',
  };
  const mapped = aliases[id];
  return mapped ? AGENTS[mapped] : null;
}

/**
 * Guess the agent from environment variables. Returns one id, or null when
 * there is no reliable signal or more than one signal (ambiguous).
 * This is a best-effort guess. Only CURSOR_AGENT was actually seen (inside a
 * Cursor agent terminal, 12 November 2026); the other variables are untested,
 * so passing --agent is the reliable way.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ id: string, reason: string } | { id: null, reason: string, candidates: string[] }}
 */
export function detectAgent(env = process.env) {
  const hits = [];
  if (env.CURSOR_AGENT || env.CURSOR_TRACE_ID) {
    hits.push({ id: 'cursor', reason: 'CURSOR_AGENT or CURSOR_TRACE_ID is set' });
  }
  if (env.CLAUDECODE || env.CLAUDE_CODE) {
    hits.push({ id: 'claude-code', reason: 'CLAUDECODE or CLAUDE_CODE is set' });
  }
  if (env.CODEX_HOME) {
    hits.push({ id: 'codex', reason: 'CODEX_HOME is set' });
  }

  const unique = [...new Map(hits.map((h) => [h.id, h])).values()];
  if (unique.length === 1) return { id: unique[0].id, reason: unique[0].reason, candidates: [unique[0].id] };
  if (unique.length === 0) {
    return { id: null, reason: 'No reliable agent signal in the environment.', candidates: [] };
  }
  return {
    id: null,
    reason: `Ambiguous: ${unique.map((h) => h.id).join(' and ')} both look possible.`,
    candidates: unique.map((h) => h.id),
  };
}

/**
 * Other project folders where a copy of the same skill might already exist.
 * Used to report duplicates, not to install into them. Folders shared with
 * the chosen agent (Codex and Antigravity both use .agents/skills) are left
 * out, and each folder is listed once.
 * @param {string} agentId
 */
export function otherKnownSkillDirs(agentId) {
  const own = AGENTS[agentId]?.projectDir;
  const dirs = AGENT_IDS.filter((id) => id !== agentId).map((id) => AGENTS[id].projectDir);
  return [...new Set(dirs)].filter((d) => d !== own);
}
