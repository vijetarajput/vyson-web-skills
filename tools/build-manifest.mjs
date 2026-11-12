#!/usr/bin/env node
// Write (or check) skills-manifest.json: the list of every skill file with its
// size and SHA-256. The install prompt downloads this list first.
//
// Run it again after you change anything inside skills/, and commit the result.
//
//   node tools/build-manifest.mjs           write skills-manifest.json
//   node tools/build-manifest.mjs --check   fail if the file is out of date (changes nothing)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPT_ORDER } from './lib/install-skills.mjs';
import { MANIFEST_NAME, buildManifest, manifestToText } from './lib/manifest.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(REPO_ROOT, 'skills');
const manifestPath = path.join(REPO_ROOT, MANIFEST_NAME);

const args = process.argv.slice(2);
if (args.includes('-h') || args.includes('--help')) {
  console.log('Usage: node tools/build-manifest.mjs [--check]\n\nWrites skills-manifest.json, or with --check only reports whether it is up to date.');
  process.exit(0);
}
const unknown = args.filter((a) => a !== '--check');
if (unknown.length) {
  console.error(`Unknown option: ${unknown[0]}. Use --check or no option.`);
  process.exit(2);
}

try {
  if (!fs.existsSync(skillsDir)) {
    console.error(`Skills folder not found: ${skillsDir}`);
    process.exit(1);
  }
  const text = manifestToText(buildManifest(skillsDir, { order: PROMPT_ORDER }));
  if (args.includes('--check')) {
    const current = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8').replace(/\r\n/g, '\n') : null;
    if (current === text) {
      console.log(`${MANIFEST_NAME} is up to date.`);
      process.exit(0);
    }
    console.error(
      `${MANIFEST_NAME} is ${current === null ? 'missing' : 'out of date'}. Run: npm run build:manifest   (then commit the new file)`,
    );
    process.exit(1);
  }
  fs.writeFileSync(manifestPath, text);
  const count = JSON.parse(text).order.length;
  console.log(`Wrote ${MANIFEST_NAME} (${count} skills).`);
} catch (e) {
  console.error(`Could not build the manifest: ${e.message}`);
  process.exit(1);
}
