// Install VYSON skills straight from the public GitHub repository.
//
// This is the tested reference for the install prompt in docs/install.md. The
// prompt asks an agent to do the same steps with its own terminal:
//   1. download skills-manifest.json
//   2. download only the requested skills' files into a temporary folder
//   3. check every file's size and SHA-256 against the manifest
//   4. only then copy the verified folders into the project (never overwriting)
//
// Only data is downloaded. Nothing that was downloaded is run.
// Nothing is written into the project until every file has been verified.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getAgent } from './agents.mjs';
import { fingerprint } from './content-hash.mjs';
import { installSkills, precheckInstall } from './install-skills.mjs';
import {
  MANIFEST_NAME,
  MAX_FILE_BYTES,
  RAW_BASE_URL,
  isValidSkillName,
  validateManifest,
} from './manifest.mjs';

export const DEFAULT_REF = 'main';
const DEFAULT_TIMEOUT_MS = 30_000;
const CONCURRENCY = 6;

class StepError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.exitCode = code;
  }
}

function describeNetworkError(e) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'the request timed out';
  return e?.cause?.code || e?.cause?.message || e?.message || 'unknown error';
}

async function fetchBytes(url, { fetchImpl, timeoutMs }) {
  let res;
  let buf;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'follow' });
    if (!res.ok) throw new StepError(`Could not download ${url}: the server answered HTTP ${res.status}.`);
    const declared = Number(res.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_FILE_BYTES) {
      throw new StepError(`Could not download ${url}: the file is larger than the ${MAX_FILE_BYTES}-byte limit.`);
    }
    buf = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (e instanceof StepError) throw e;
    throw new StepError(
      `Could not download ${url}: ${describeNetworkError(e)}. Check the internet connection. Some agent sandboxes block network access by default.`,
    );
  }
  if (buf.length > MAX_FILE_BYTES) {
    throw new StepError(`Could not download ${url}: the file is larger than the ${MAX_FILE_BYTES}-byte limit.`);
  }
  return buf;
}

function encodePath(rel) {
  return rel.split('/').map(encodeURIComponent).join('/');
}

/** Run `worker` over `items`, a few at a time, stopping early after the first failure. */
async function runPool(items, limit, worker) {
  let next = 0;
  let failure = null;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!failure && next < items.length) {
      const item = items[next++];
      try {
        await worker(item);
      } catch (e) {
        failure ??= e;
      }
    }
  });
  await Promise.all(lanes);
  if (failure) throw failure;
}

/**
 * Download, verify and install skills from GitHub.
 *
 * @param {{
 *   targetDir: string,
 *   agentId: string,
 *   skillNames?: string[] | '*',
 *   global?: boolean,
 *   confirmGlobal?: boolean,
 *   allowSelf?: boolean,
 *   homeDir?: string,
 *   ref?: string,
 *   baseUrl?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 * }} opts
 */
export async function installFromGithub(opts) {
  const refused = precheckInstall(opts);
  if (refused) return refused;

  const targetDir = path.resolve(opts.targetDir);
  const fail = (error, code, source) => ({
    ok: false,
    code,
    error,
    agent: getAgent(opts.agentId),
    targetDir: targetDir.replaceAll('\\', '/'),
    skills: [],
    notes: [],
    ...(source ? { source } : {}),
  });

  const ref = opts.ref ?? DEFAULT_REF;
  if (!opts.baseUrl && (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(ref) || ref.includes('..') || ref.includes('//'))) {
    return fail(`"${ref}" is not a usable branch, tag or commit name.`, 2);
  }
  const base = (opts.baseUrl ?? `${RAW_BASE_URL}/${ref}`).replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(base)) return fail(`"${base}" is not an http(s) address.`, 2);

  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return fail('This Node.js has no built-in download support (fetch). Use Node.js 18 or newer.', 1);
  }
  const net = { fetchImpl, timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS };

  // Check the requested names before the network is touched.
  const wantsAll = !opts.skillNames || opts.skillNames === '*' || opts.skillNames.includes('*');
  const requestedNames = wantsAll ? null : [...new Set(opts.skillNames)];
  const invalid = (requestedNames ?? []).filter((n) => !isValidSkillName(n));
  if (invalid.length) {
    return fail(
      `Invalid skill name(s): ${invalid.join(', ')}. Skill names use lowercase letters, numbers and single hyphens.`,
      2,
    );
  }

  let stage = null;
  try {
    // 1. The manifest.
    const manifestUrl = `${base}/${MANIFEST_NAME}`;
    const manifestBytes = await fetchBytes(manifestUrl, net);
    let manifest;
    try {
      manifest = JSON.parse(manifestBytes.toString('utf8'));
    } catch {
      throw new StepError(`The file at ${manifestUrl} is not valid JSON.`);
    }
    const valid = validateManifest(manifest);
    if (!valid.ok) throw new StepError(valid.error);

    const available = manifest.order.length ? manifest.order : Object.keys(manifest.skills);
    const names = requestedNames ?? available;
    const unknown = names.filter((n) => !manifest.skills[n]);
    if (unknown.length) {
      throw new StepError(`Unknown skill name(s): ${unknown.join(', ')}. Available: ${available.join(', ')}.`, 2);
    }
    if (names.length === 0) throw new StepError('No skills to install.');

    // 2 and 3. Download into a temporary folder and verify every file.
    stage = fs.mkdtempSync(path.join(os.tmpdir(), 'vyson-stage-'));
    const stageSkills = path.join(stage, 'skills');
    const jobs = names.flatMap((name) => manifest.skills[name].files.map((file) => ({ name, file })));
    await runPool(jobs, CONCURRENCY, async ({ name, file }) => {
      const url = `${base}/skills/${name}/${encodePath(file.path)}`;
      const buf = await fetchBytes(url, net);
      const fp = fingerprint(buf, file.path);
      if (fp.bytes !== file.bytes) {
        throw new StepError(
          `${name}/${file.path} did not match the manifest: expected ${file.bytes} bytes, got ${fp.bytes}. The download is incomplete or the manifest is out of date. If the repository was only just updated, wait a few minutes and try again.`,
        );
      }
      if (fp.sha256 !== file.sha256) {
        throw new StepError(
          `${name}/${file.path} did not match the manifest: the sha256 differs. The download is damaged or the manifest is out of date. If the repository was only just updated, wait a few minutes and try again.`,
        );
      }
      const dest = path.join(stageSkills, name, ...file.path.split('/'));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
    });

    const fileCount = jobs.length;
    const source = {
      type: 'github',
      base,
      files: fileCount,
      description: `${base} — ${fileCount} file(s) in ${names.length} skill(s) downloaded; every file matched ${MANIFEST_NAME} (size and sha256).`,
    };

    // 4. Copy the verified folders into the project with the normal, never-overwrite installer.
    const result = installSkills({
      sourceSkillsDir: stageSkills,
      targetDir: opts.targetDir,
      agentId: opts.agentId,
      skillNames: names,
      global: opts.global,
      confirmGlobal: opts.confirmGlobal,
      allowSelf: opts.allowSelf,
      homeDir: opts.homeDir,
    });
    result.source = source;
    result.notes.push(
      `The manifest and the files come from the same address. The check proves the download is complete and not damaged, not that the repository is trustworthy. Nothing that was downloaded was run.`,
    );
    return result;
  } catch (e) {
    if (e instanceof StepError) return fail(e.message, e.exitCode, { type: 'github', base, files: 0, description: base });
    throw e;
  } finally {
    if (stage) fs.rmSync(stage, { recursive: true, force: true });
  }
}
