// One way to fingerprint a skill file, shared by the manifest builder, the
// installer and the GitHub download check.
//
// Text files are hashed after Windows line endings (CRLF) are turned into
// Unix line endings (LF). Git stores LF, GitHub serves LF, and a Windows
// checkout may hold CRLF. Without this step the same file would get two
// different fingerprints depending on where it was read.

import crypto from 'node:crypto';
import path from 'node:path';

// Every file type that ships inside the skills today is plain text.
const TEXT_EXTENSIONS = new Set(['.md', '.mjs', '.js', '.css', '.json', '.html', '.txt', '.svg', '.yml', '.yaml']);

/** Is this file treated as text (line endings are normalised)? */
export function isTextFile(relPath) {
  return TEXT_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

/**
 * The bytes that are fingerprinted: the file itself, with CRLF changed to LF
 * when it is a text file.
 * @param {Buffer} buf
 * @param {string} relPath
 * @returns {Buffer}
 */
export function normalizedBytes(buf, relPath) {
  if (!isTextFile(relPath)) return buf;
  if (!buf.includes(0x0d)) return buf;
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

/**
 * Fingerprint of a file's content.
 * @param {Buffer} buf
 * @param {string} relPath  posix path inside the skill folder
 * @returns {{ sha256: string, bytes: number }}
 */
export function fingerprint(buf, relPath) {
  const data = normalizedBytes(buf, relPath);
  return { sha256: crypto.createHash('sha256').update(data).digest('hex'), bytes: data.length };
}
