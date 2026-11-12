// Tests for installing VYSON skills from GitHub (the reference for the install
// prompt in docs/install.md). Nothing here touches the real internet: a small
// local server plays the part of raw.githubusercontent.com.

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { AGENTS, AGENT_IDS } from '../lib/agents.mjs';
import { DEFAULT_REF, installFromGithub } from '../lib/github-install.mjs';
import { PROMPT_ORDER, hashTree } from '../lib/install-skills.mjs';
import { MANIFEST_NAME, RAW_BASE_URL, buildManifest, compareWithManifest, manifestToText } from '../lib/manifest.mjs';
import { REPO_ROOT, makeSkill, makeTempDir, removeDir, writeFiles } from './helpers.mjs';

const INSTALLER = path.join(REPO_ROOT, 'tools', 'install-skills.mjs');

/** A pretend GitHub: serves files below `rootDir` with Unix line endings, as git does. */
async function startServer(rootDir, faults = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    requests.push(url);
    const fault = faults[url];
    if (fault?.hang) return; // never answer
    if (fault?.status) {
      res.statusCode = fault.status;
      return res.end('fault');
    }
    const file = path.join(rootDir, url);
    if (!file.startsWith(rootDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      return res.end('not found');
    }
    let body = Buffer.from(fs.readFileSync(file).toString('utf8').replace(/\r\n/g, '\n'));
    if (fault?.corrupt) {
      body = Buffer.from(body);
      body[0] ^= 1; // same size, different content
    }
    if (fault?.truncate) body = body.subarray(0, Math.max(0, body.length - 3));
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

function fakeRepo() {
  const root = makeTempDir('vyson-gh-repo-');
  const skills = path.join(root, 'skills');
  makeSkill(skills, 'vyson-alpha', {
    files: { 'references/a.md': '# A\n', 'NOTICE.md': 'MIT notice\n', 'scripts/check.mjs': 'export {}\n' },
  });
  makeSkill(skills, 'vyson-beta', { files: { 'assets/x.css': 'body {}\n', 'references/b.md': '# B\n' } });
  const manifest = buildManifest(skills, { order: ['vyson-alpha', 'vyson-beta'] });
  fs.writeFileSync(path.join(root, MANIFEST_NAME), manifestToText(manifest));
  return { root, manifest };
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

function stageFolders() {
  return fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith('vyson-stage-'));
}

function runCli(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [INSTALLER, ...args], { encoding: 'utf8' }, (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });
}

const neverUsed = async () => {
  throw new Error('The network must not be used for this request.');
};

describe('installFromGithub: one skill', () => {
  let repo;
  let server;
  let project;
  before(async () => {
    repo = fakeRepo();
    server = await startServer(repo.root);
    project = makeTempDir('vyson-gh-proj-');
  });
  after(async () => {
    await server.close();
    removeDir(repo.root);
    removeDir(project);
  });

  it('installs the named skill with every supporting file, and only that skill', async () => {
    const before = stageFolders();
    const result = await installFromGithub({
      targetDir: project,
      agentId: 'cursor',
      skillNames: ['vyson-alpha'],
      baseUrl: server.baseUrl,
    });
    assert.equal(result.ok, true, result.error);
    assert.equal(result.code, 0);
    assert.equal(result.fileVerification, 'passed');
    assert.deepEqual(
      listFiles(project),
      [
        '.cursor/skills/vyson-alpha/NOTICE.md',
        '.cursor/skills/vyson-alpha/SKILL.md',
        '.cursor/skills/vyson-alpha/references/a.md',
        '.cursor/skills/vyson-alpha/scripts/check.mjs',
      ],
    );
    // Installed files match the manifest exactly.
    const diff = compareWithManifest(path.join(project, '.cursor', 'skills'), repo.manifest, ['vyson-alpha']);
    assert.deepEqual(diff, { missing: [], changed: [], extra: [] });
    // The other skill was never even downloaded.
    assert.ok(server.requests.every((u) => !u.includes('vyson-beta')), 'vyson-beta was downloaded');
    // The temporary download folder is gone.
    assert.deepEqual(stageFolders(), before);
    assert.match(result.source.description, /every file matched skills-manifest\.json/);
  });

  it('is repeatable: a second install leaves identical files alone', async () => {
    const result = await installFromGithub({
      targetDir: project,
      agentId: 'cursor',
      skillNames: ['vyson-alpha'],
      baseUrl: server.baseUrl,
    });
    assert.equal(result.ok, true);
    assert.equal(result.skills[0].status, 'already-identical');
    assert.equal(result.counts.copied, 0);
    assert.equal(result.counts.skippedIdentical, 1);
  });
});

describe('installFromGithub: all skills, agents and folders', () => {
  let repo;
  let server;
  before(async () => {
    repo = fakeRepo();
    server = await startServer(repo.root);
  });
  after(async () => {
    await server.close();
    removeDir(repo.root);
  });

  it('installs every skill in the manifest for "*" and when no names are given', async () => {
    for (const skillNames of ['*', undefined]) {
      const project = makeTempDir('vyson-gh-all-');
      try {
        const result = await installFromGithub({ targetDir: project, agentId: 'claude-code', skillNames, baseUrl: server.baseUrl });
        assert.equal(result.ok, true, result.error);
        assert.deepEqual(result.skills.map((s) => s.name), ['vyson-alpha', 'vyson-beta']);
        const diff = compareWithManifest(path.join(project, '.claude', 'skills'), repo.manifest);
        assert.deepEqual(diff, { missing: [], changed: [], extra: [] });
      } finally {
        removeDir(project);
      }
    }
  });

  it('uses each agent\'s documented project folder', async () => {
    const expected = {
      cursor: '.cursor/skills',
      'claude-code': '.claude/skills',
      codex: '.agents/skills',
      antigravity: '.agents/skills',
    };
    assert.deepEqual([...AGENT_IDS].sort(), Object.keys(expected).sort());
    for (const id of AGENT_IDS) {
      const project = makeTempDir('vyson-gh-agent-');
      try {
        const result = await installFromGithub({ targetDir: project, agentId: id, skillNames: ['vyson-beta'], baseUrl: server.baseUrl });
        assert.equal(result.ok, true, `${id}: ${result.error}`);
        assert.equal(AGENTS[id].projectDir, expected[id]);
        assert.ok(fs.existsSync(path.join(project, ...expected[id].split('/'), 'vyson-beta', 'SKILL.md')), `${id} folder`);
        assert.ok(result.destRoot.endsWith(expected[id]), `${id}: ${result.destRoot}`);
      } finally {
        removeDir(project);
      }
    }
  });

  it('accepts agent aliases', async () => {
    const project = makeTempDir('vyson-gh-alias-');
    try {
      const result = await installFromGithub({ targetDir: project, agentId: 'agy', skillNames: ['vyson-beta'], baseUrl: server.baseUrl });
      assert.equal(result.ok, true, result.error);
      assert.equal(result.agent.id, 'antigravity');
    } finally {
      removeDir(project);
    }
  });

  it('installs globally only when asked twice, into the agent\'s home folder', async () => {
    const project = makeTempDir('vyson-gh-g-proj-');
    const home = makeTempDir('vyson-gh-g-home-');
    try {
      const before = server.requests.length;
      const refused = await installFromGithub({ targetDir: project, agentId: 'antigravity', global: true, baseUrl: server.baseUrl, homeDir: home });
      assert.equal(refused.code, 2);
      assert.equal(server.requests.length, before, 'the network was used before the refusal');
      assert.deepEqual(listFiles(home), []);

      const ok = await installFromGithub({
        targetDir: project,
        agentId: 'antigravity',
        skillNames: ['vyson-beta'],
        global: true,
        confirmGlobal: true,
        baseUrl: server.baseUrl,
        homeDir: home,
      });
      assert.equal(ok.ok, true, ok.error);
      assert.ok(fs.existsSync(path.join(home, '.gemini', 'config', 'skills', 'vyson-beta', 'SKILL.md')));
      assert.deepEqual(listFiles(project), []);
    } finally {
      removeDir(project);
      removeDir(home);
    }
  });
});

describe('installFromGithub: bad requests fail before anything is downloaded', () => {
  let repo;
  let server;
  let project;
  before(async () => {
    repo = fakeRepo();
    server = await startServer(repo.root);
    project = makeTempDir('vyson-gh-bad-');
  });
  after(async () => {
    await server.close();
    removeDir(repo.root);
    removeDir(project);
  });

  it('rejects an unknown agent without using the network', async () => {
    const result = await installFromGithub({ targetDir: project, agentId: 'notepad', fetchImpl: neverUsed });
    assert.equal(result.ok, false);
    assert.equal(result.code, 2);
    assert.match(result.error, /Unknown agent/);
  });

  it('rejects invalid skill names without using the network', async () => {
    for (const bad of ['../evil', 'Bad Name', 'a/b', 'a\\b', '', 'x'.repeat(80)]) {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', skillNames: [bad], fetchImpl: neverUsed });
      assert.equal(result.code, 2, `accepted ${JSON.stringify(bad)}`);
      assert.match(result.error, /Invalid skill name/);
    }
    assert.deepEqual(listFiles(project), []);
  });

  it('rejects an unsafe branch name without using the network', async () => {
    for (const ref of ['../main', 'a b', '-x', 'a..b/../c', '']) {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', ref, fetchImpl: neverUsed });
      assert.equal(result.code, 2, `accepted ${JSON.stringify(ref)}`);
    }
  });

  it('reports an unknown skill name, lists the real ones, and installs nothing', async () => {
    const result = await installFromGithub({
      targetDir: project,
      agentId: 'cursor',
      skillNames: ['vyson-alpha', 'vyson-missing'],
      baseUrl: server.baseUrl,
    });
    assert.equal(result.ok, false);
    assert.equal(result.code, 2);
    assert.match(result.error, /Unknown skill name\(s\): vyson-missing\. Available: vyson-alpha, vyson-beta/);
    assert.deepEqual(listFiles(project), []);
    assert.ok(server.requests.every((u) => u === `/${MANIFEST_NAME}`), 'a skill file was downloaded');
  });

  it('refuses to install into the VYSON repository itself', async () => {
    const self = makeTempDir('vyson-gh-self-');
    try {
      fs.writeFileSync(path.join(self, 'package.json'), JSON.stringify({ name: 'vyson-web-skills' }));
      makeSkill(path.join(self, 'skills'), 'vyson-css-motion');
      const result = await installFromGithub({ targetDir: self, agentId: 'cursor', fetchImpl: neverUsed });
      assert.equal(result.code, 2);
      assert.match(result.error, /VYSON skills repository/);
    } finally {
      removeDir(self);
    }
  });

  it('uses the official GitHub address and the chosen branch, tag or commit', async () => {
    const seen = [];
    const spy = async (url) => {
      seen.push(String(url));
      return new Response('nope', { status: 404 });
    };
    await installFromGithub({ targetDir: project, agentId: 'cursor', fetchImpl: spy });
    await installFromGithub({ targetDir: project, agentId: 'cursor', ref: 'v1.2.3', fetchImpl: spy });
    assert.equal(DEFAULT_REF, 'main');
    assert.equal(seen[0], 'https://raw.githubusercontent.com/vijetarajput/vyson-web-skills/main/skills-manifest.json');
    assert.equal(seen[1], `${RAW_BASE_URL}/v1.2.3/skills-manifest.json`);
  });
});

describe('installFromGithub: honest failure reporting', () => {
  let repo;
  let project;
  let server;
  before(() => {
    repo = fakeRepo();
  });
  after(() => removeDir(repo.root));

  async function withServer(faults, fn) {
    server = await startServer(repo.root, faults);
    project = makeTempDir('vyson-gh-fail-');
    const stagesBefore = stageFolders();
    try {
      await fn();
      assert.deepEqual(listFiles(project), [], 'files were written into the project although the install failed');
      assert.deepEqual(stageFolders(), stagesBefore, 'the temporary download folder was left behind');
    } finally {
      await server.close();
      removeDir(project);
    }
  }

  it('stops when a supporting file is missing, names it, and installs nothing', async () => {
    await withServer({ '/skills/vyson-alpha/references/a.md': { status: 404 } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.equal(result.code, 1);
      assert.match(result.error, /references\/a\.md/);
      assert.match(result.error, /HTTP 404/);
      assert.equal(result.skills.length, 0);
    });
  });

  it('stops when a file is damaged (same size, different content)', async () => {
    await withServer({ '/skills/vyson-beta/assets/x.css': { corrupt: true } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'codex', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.match(result.error, /vyson-beta\/assets\/x\.css did not match the manifest: the sha256 differs/);
    });
  });

  it('stops when a file is cut short', async () => {
    await withServer({ '/skills/vyson-alpha/SKILL.md': { truncate: true } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.match(result.error, /vyson-alpha\/SKILL\.md did not match the manifest: expected \d+ bytes, got \d+/);
    });
  });

  it('does not install the skills that were fine when another one fails', async () => {
    // alpha downloads cleanly, beta is damaged: neither may be installed.
    await withServer({ '/skills/vyson-beta/references/b.md': { status: 500 } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.match(result.error, /HTTP 500/);
    });
  });

  it('says so when the manifest cannot be downloaded', async () => {
    await withServer({ [`/${MANIFEST_NAME}`]: { status: 404 } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.match(result.error, /skills-manifest\.json: the server answered HTTP 404/);
    });
  });

  it('says so when the server never answers (timeout)', async () => {
    await withServer({ [`/${MANIFEST_NAME}`]: { hang: true } }, async () => {
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl, timeoutMs: 300 });
      assert.equal(result.ok, false);
      assert.match(result.error, /timed out/);
      assert.match(result.error, /sandboxes block network access/);
    });
  });

  it('says so when nothing is listening at the address', async () => {
    const project2 = makeTempDir('vyson-gh-down-');
    try {
      const result = await installFromGithub({ targetDir: project2, agentId: 'cursor', baseUrl: 'http://127.0.0.1:1', timeoutMs: 5000 });
      assert.equal(result.ok, false);
      assert.equal(result.code, 1);
      assert.match(result.error, /Could not download http:\/\/127\.0\.0\.1:1\/skills-manifest\.json/);
      assert.deepEqual(listFiles(project2), []);
    } finally {
      removeDir(project2);
    }
  });

  it('rejects a manifest that is not JSON, not valid, or tries to write outside the skills folder', async () => {
    const bad = {
      'not json': '<html>blocked by a proxy</html>',
      'no skills': JSON.stringify({ schema: 1, order: [], skills: {} }),
      'path traversal': JSON.stringify({
        schema: 1,
        order: ['vyson-evil'],
        skills: {
          'vyson-evil': {
            files: [
              { path: 'SKILL.md', bytes: 1, sha256: 'a'.repeat(64) },
              { path: '../../escape.txt', bytes: 1, sha256: 'a'.repeat(64) },
            ],
          },
        },
      }),
      'no SKILL.md': JSON.stringify({
        schema: 1,
        order: ['vyson-x'],
        skills: { 'vyson-x': { files: [{ path: 'README.md', bytes: 1, sha256: 'a'.repeat(64) }] } },
      }),
    };
    for (const [label, text] of Object.entries(bad)) {
      const root = makeTempDir('vyson-gh-badmanifest-');
      const srv = await startServer(root);
      const proj = makeTempDir('vyson-gh-badmanifest-proj-');
      try {
        fs.writeFileSync(path.join(root, MANIFEST_NAME), text);
        const result = await installFromGithub({ targetDir: proj, agentId: 'cursor', baseUrl: srv.baseUrl });
        assert.equal(result.ok, false, label);
        assert.match(result.error, /not valid JSON|manifest is not usable/, label);
        assert.deepEqual(listFiles(proj), [], label);
        assert.ok(!fs.existsSync(path.join(root, '..', 'escape.txt')), label);
        assert.deepEqual(srv.requests, [`/${MANIFEST_NAME}`], `${label}: files were requested`);
      } finally {
        await srv.close();
        removeDir(root);
        removeDir(proj);
      }
    }
  });
});

describe('installFromGithub: existing user files', () => {
  let repo;
  let server;
  before(async () => {
    repo = fakeRepo();
    server = await startServer(repo.root);
  });
  after(async () => {
    await server.close();
    removeDir(repo.root);
  });

  it('never overwrites a different copy, and leaves every other file alone', async () => {
    const project = makeTempDir('vyson-gh-own-');
    try {
      writeFiles(project, {
        '.cursor/skills/vyson-alpha/SKILL.md': 'my own edited version\n',
        '.cursor/skills/my-own-skill/SKILL.md': 'not a VYSON skill\n',
        'index.html': '<h1>My site</h1>\n',
      });
      const before = {
        mine: fs.readFileSync(path.join(project, '.cursor/skills/vyson-alpha/SKILL.md'), 'utf8'),
        files: listFiles(project),
      };
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', skillNames: ['vyson-alpha'], baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.equal(result.code, 1);
      assert.equal(result.skills[0].status, 'conflict');
      assert.match(result.skills[0].detail, /Not overwritten/);
      assert.equal(fs.readFileSync(path.join(project, '.cursor/skills/vyson-alpha/SKILL.md'), 'utf8'), before.mine);
      assert.deepEqual(listFiles(project), before.files);
      assert.equal(fs.readFileSync(path.join(project, 'index.html'), 'utf8'), '<h1>My site</h1>\n');
    } finally {
      removeDir(project);
    }
  });

  it('keeps going for the other skills but reports the conflict', async () => {
    const project = makeTempDir('vyson-gh-mixed-');
    try {
      writeFiles(project, { '.cursor/skills/vyson-alpha/SKILL.md': 'mine\n' });
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.deepEqual(result.skills.map((s) => `${s.name}:${s.status}`), ['vyson-alpha:conflict', 'vyson-beta:installed']);
    } finally {
      removeDir(project);
    }
  });

  it('treats a Windows (CRLF) copy of the same files as identical, not as a conflict', async () => {
    const project = makeTempDir('vyson-gh-crlf-');
    try {
      const first = await installFromGithub({ targetDir: project, agentId: 'cursor', skillNames: ['vyson-alpha'], baseUrl: server.baseUrl });
      assert.equal(first.ok, true, first.error);
      for (const rel of ['SKILL.md', 'references/a.md']) {
        const file = path.join(project, '.cursor', 'skills', 'vyson-alpha', ...rel.split('/'));
        fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
      }
      const again = await installFromGithub({ targetDir: project, agentId: 'cursor', skillNames: ['vyson-alpha'], baseUrl: server.baseUrl });
      assert.equal(again.ok, true, again.error);
      assert.equal(again.skills[0].status, 'already-identical');
    } finally {
      removeDir(project);
    }
  });

  it('refuses to install over a file that sits where a folder is needed', async () => {
    const project = makeTempDir('vyson-gh-blocked-');
    try {
      writeFiles(project, { '.cursor': 'a file, not a folder\n' });
      const result = await installFromGithub({ targetDir: project, agentId: 'cursor', baseUrl: server.baseUrl });
      assert.equal(result.ok, false);
      assert.equal(fs.readFileSync(path.join(project, '.cursor'), 'utf8'), 'a file, not a folder\n');
    } finally {
      removeDir(project);
    }
  });
});

describe('installFromGithub: the real five skills (served from this repository)', () => {
  let server;
  let project;
  before(async () => {
    server = await startServer(REPO_ROOT);
    project = makeTempDir('vyson-gh-real-');
  });
  after(async () => {
    await server.close();
    removeDir(project);
  });

  it('downloads, verifies and installs all five, byte for byte', async () => {
    const result = await installFromGithub({ targetDir: project, agentId: 'cursor', skillNames: '*', baseUrl: server.baseUrl });
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(result.skills.map((s) => s.name), PROMPT_ORDER);
    assert.ok(result.skills.every((s) => s.status === 'installed'));
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, MANIFEST_NAME), 'utf8'));
    assert.deepEqual(compareWithManifest(path.join(project, '.cursor', 'skills'), manifest), { missing: [], changed: [], extra: [] });
    // Same fingerprints as a copy straight from the repository.
    for (const name of PROMPT_ORDER) {
      const installed = hashTree(path.join(project, '.cursor', 'skills', name));
      const original = hashTree(path.join(REPO_ROOT, 'skills', name));
      assert.deepEqual([...installed], [...original], name);
      for (const needed of ['SKILL.md', 'references/workflow.md', 'references/prompt.md']) {
        assert.ok(fs.existsSync(path.join(project, '.cursor', 'skills', name, ...needed.split('/'))), `${name}/${needed}`);
      }
    }
    assert.match(result.usagePrompt, /Prompt 1 of 5/);
  });

  it('installs a single real skill including its scripts and assets', async () => {
    const one = makeTempDir('vyson-gh-real1-');
    try {
      const result = await installFromGithub({ targetDir: one, agentId: 'codex', skillNames: ['vyson-css-motion'], baseUrl: server.baseUrl });
      assert.equal(result.ok, true, result.error);
      const base = path.join(one, '.agents', 'skills', 'vyson-css-motion');
      for (const rel of ['SKILL.md', 'assets/motion-base.css', 'scripts/motion-lint.mjs', 'references/recipes.md']) {
        assert.ok(fs.existsSync(path.join(base, ...rel.split('/'))), rel);
      }
      assert.deepEqual(fs.readdirSync(path.join(one, '.agents', 'skills')), ['vyson-css-motion']);
    } finally {
      removeDir(one);
    }
  });
});

describe('install-skills.mjs --from-github (command line)', () => {
  let repo;
  let server;
  before(async () => {
    repo = fakeRepo();
    server = await startServer(repo.root);
  });
  after(async () => {
    await server.close();
    removeDir(repo.root);
  });

  it('installs, prints the source, and exits 0', async () => {
    const project = makeTempDir('vyson-gh-cli-');
    try {
      const r = await runCli(['--from-github', '--base-url', server.baseUrl, '--to', project, '--agent', 'claude-code', '--skill', 'vyson-alpha']);
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /Source: http:\/\/127\.0\.0\.1:\d+ — 4 file\(s\) in 1 skill\(s\) downloaded; every file matched skills-manifest\.json/);
      assert.match(r.stdout, /RESULT: FILES INSTALLED \(discovery pending\)/);
      assert.ok(fs.existsSync(path.join(project, '.claude', 'skills', 'vyson-alpha', 'SKILL.md')));
    } finally {
      removeDir(project);
    }
  });

  it('prints a clear "nothing installed" message and exits 1 when a download fails', async () => {
    const root = makeTempDir('vyson-gh-cli-fail-');
    const srv = await startServer(root);
    const project = makeTempDir('vyson-gh-cli-fail-proj-');
    try {
      const r = await runCli(['--from-github', '--base-url', srv.baseUrl, '--to', project, '--agent', 'cursor']);
      assert.equal(r.code, 1);
      assert.match(r.stderr, /HTTP 404/);
      assert.match(r.stderr, /Nothing was installed/);
      assert.equal(r.stdout.includes('FILES INSTALLED'), false);
      assert.deepEqual(listFiles(project), []);
    } finally {
      await srv.close();
      removeDir(root);
      removeDir(project);
    }
  });

  it('exits 2 for an unknown skill and lists the real names', async () => {
    const project = makeTempDir('vyson-gh-cli-unknown-');
    try {
      const r = await runCli(['--from-github', '--base-url', server.baseUrl, '--to', project, '--agent', 'cursor', '--skill', 'vyson-nope']);
      assert.equal(r.code, 2);
      assert.match(r.stderr, /Unknown skill name\(s\): vyson-nope\. Available: vyson-alpha, vyson-beta/);
    } finally {
      removeDir(project);
    }
  });

  it('rejects option combinations that do not make sense', async () => {
    const project = makeTempDir('vyson-gh-cli-combo-');
    try {
      const both = await runCli(['--from-github', '--source', repo.root, '--to', project, '--agent', 'cursor']);
      assert.equal(both.code, 2);
      assert.match(both.stderr, /either --from-github or --source/);
      const refAlone = await runCli(['--ref', 'main', '--to', project, '--agent', 'cursor']);
      assert.equal(refAlone.code, 2);
      assert.match(refAlone.stderr, /only work together with --from-github/);
      const badRef = await runCli(['--from-github', '--ref', '../x', '--to', project, '--agent', 'cursor']);
      assert.equal(badRef.code, 2);
      assert.deepEqual(listFiles(project), []);
    } finally {
      removeDir(project);
    }
  });

  it('lists Antigravity with its documented path and says it is untested', async () => {
    const r = await runCli(['--list-agents']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Antigravity {2}\(--agent antigravity\)/);
    assert.match(r.stdout, /has not tested Antigravity at all/);
  });
});

describe('install-skills.mjs from a local folder next to a manifest', () => {
  it('stops and names the missing file when a listed file is gone', async () => {
    const repo = fakeRepo();
    const project = makeTempDir('vyson-local-missing-');
    try {
      fs.rmSync(path.join(repo.root, 'skills', 'vyson-alpha', 'references', 'a.md'));
      const r = await runCli(['--source', path.join(repo.root, 'skills'), '--to', project, '--agent', 'cursor']);
      assert.equal(r.code, 1);
      assert.match(r.stderr, /vyson-alpha\/references\/a\.md/);
      assert.match(r.stderr, /incomplete/);
      assert.deepEqual(listFiles(project), []);
    } finally {
      removeDir(repo.root);
      removeDir(project);
    }
  });

  it('installs but warns when a file differs from the manifest (for example after an edit)', async () => {
    const repo = fakeRepo();
    const project = makeTempDir('vyson-local-changed-');
    try {
      fs.appendFileSync(path.join(repo.root, 'skills', 'vyson-beta', 'SKILL.md'), 'edited\n');
      const r = await runCli(['--source', path.join(repo.root, 'skills'), '--to', project, '--agent', 'cursor', '--skill', 'vyson-beta']);
      assert.equal(r.code, 0, r.stderr);
      assert.match(r.stdout, /differ from skills-manifest\.json \(changed: 1, extra: 0\)/);
      assert.match(r.stdout, /npm run build:manifest/);
    } finally {
      removeDir(repo.root);
      removeDir(project);
    }
  });

  it('works as before when there is no manifest next to the folder', async () => {
    const repo = fakeRepo();
    const project = makeTempDir('vyson-local-nomanifest-');
    try {
      fs.rmSync(path.join(repo.root, MANIFEST_NAME));
      const r = await runCli(['--source', path.join(repo.root, 'skills'), '--to', project, '--agent', 'cursor']);
      assert.equal(r.code, 0, r.stderr);
      assert.equal(r.stdout.includes('differ from skills-manifest.json'), false);
    } finally {
      removeDir(repo.root);
      removeDir(project);
    }
  });
});
