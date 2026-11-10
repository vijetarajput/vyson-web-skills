// Finds which folders should be treated as skills.

import fs from 'node:fs';
import path from 'node:path';
import { safeReadDir } from './fs-utils.mjs';

/**
 * Given a path, decide what to validate.
 *
 *  - If the folder itself contains a SKILL.md (in any capitalisation), it IS a skill.
 *  - Otherwise it is a "container" (like skills/), and every folder directly
 *    inside it is treated as a skill. A folder with no SKILL.md is still included
 *    so that the validator can report "SKILL.md is missing" instead of silently
 *    ignoring it. Hidden folders (starting with ".") and node_modules are skipped.
 *
 * @param {string} target
 * @returns {{ mode: 'single' | 'container', dirs: string[] }}
 * @throws if the path does not exist or is not a folder
 */
export function discoverSkillDirs(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) throw new Error(`Path not found: ${target}`);
  if (!fs.statSync(abs).isDirectory()) throw new Error(`Not a folder: ${target}`);

  const entries = safeReadDir(abs);
  if (entries.some((e) => e.isFile() && e.name.toLowerCase() === 'skill.md')) {
    return { mode: 'single', dirs: [abs] };
  }
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
    .map((e) => path.join(abs, e.name))
    .sort();
  return { mode: 'container', dirs };
}
