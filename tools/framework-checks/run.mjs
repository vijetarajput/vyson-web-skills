#!/usr/bin/env node
// Runs the Vue and React adapter checks for vyson-frontend-development.
//
// These checks need real copies of Vue and React, which this repository does not
// depend on. So this script makes a temporary folder, installs the pinned versions
// there (with telemetry switched off), copies the adapters and checks in, runs
// them, and deletes the folder. Nothing is installed in the repository.
//
// Usage:   node tools/framework-checks/run.mjs [--keep]
// Exit:    0 = all checks passed, 1 = a check failed, 3 = could not run (for example no network)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '..', '..', 'skills', 'vyson-frontend-development', 'assets');
const PACKAGES = ['vue@3.5.45', 'react@19.3.1', 'react-test-renderer@19.3.1'];
const keep = process.argv.includes('--keep');

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vyson-fw-'));
const env = { ...process.env, DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' };
let code = 0;

try {
  fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({ name: 'vyson-framework-checks', private: true, type: 'module' }));
  for (const file of ['fetch-state.js', 'use-fetch-state.vue.js', 'use-fetch-state.react.js']) fs.copyFileSync(path.join(assets, file), path.join(work, file));
  for (const file of ['vue-check.mjs', 'react-check.mjs']) fs.copyFileSync(path.join(here, file), path.join(work, file));

  console.log(`Installing ${PACKAGES.join(', ')} into a temporary folder...`);
  const install = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', ...PACKAGES], { cwd: work, env, shell: true, stdio: 'inherit' });
  if (install.status !== 0) {
    console.error('\nNOT PERFORMED: the packages could not be installed (no network, or npm is missing).');
    code = 3;
  } else {
    for (const file of ['vue-check.mjs', 'react-check.mjs']) {
      const run = spawnSync(process.execPath, [file], { cwd: work, env, stdio: 'inherit' });
      if (run.status !== 0) code = 1;
    }
    console.log(code === 0 ? '\nRESULT: PASSED. These are logic checks in Node with test renderers, not browser tests.' : '\nRESULT: FAILED.');
  }
} finally {
  if (keep) console.log(`Kept ${work}`);
  else fs.rmSync(work, { recursive: true, force: true });
}
process.exit(code);
