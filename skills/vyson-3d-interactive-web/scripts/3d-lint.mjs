#!/usr/bin/env node
// 3d-lint: a small checker for the basics in the vyson-3d-interactive-web skill.
//
// It reads .html, .js, .mjs, .jsx, .ts, .tsx and .css files, and the size of
// model, texture and image files, and reports common problems of web 3D:
// a render loop that cannot stop, no reduced-motion handling, an unclamped
// pixel ratio, a canvas nobody can name, no fallback, nothing that pauses the
// scene off screen, no context-loss handling, files loaded from other websites,
// GPU objects that are never freed, scroll trapping and heavy asset files.
//
// IT IS A STATIC CHECKER. It only reads text and file sizes. It never opens a
// browser and never runs a scene, so it cannot measure frame rate, memory or
// load time, and it cannot tell whether the scene looks right. Passing it is
// NOT a performance test and NOT a browser test. See references/performance-and-fallbacks.md.
//
// The checks are text patterns, so they can miss a problem or flag code that
// is fine. Every message says what to look at. The size limits are VYSON
// defaults, not measured results.
//
// It has NO dependencies and works on its own, so it still works after the
// skill has been installed into a project.
//
// Usage:   node 3d-lint.mjs <file-or-folder> [more paths] [--strict] [--json]
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  TD001: {
    severity: 'error',
    title: 'The render loop has no way to stop',
    fix: 'Keep the id from requestAnimationFrame and call cancelAnimationFrame when the scene is off screen, hidden or destroyed. The starter assets/canvas-stage.js does this for you.',
  },
  TD002: {
    severity: 'error',
    title: 'No prefers-reduced-motion handling',
    fix: 'Check (prefers-reduced-motion: reduce) and turn off automatic movement: no auto-rotation, no camera sweeps tied to scroll. Let the visitor still move the object with controls.',
  },
  TD003: {
    severity: 'warning',
    title: 'The pixel ratio is not limited',
    fix: 'Use Math.min(window.devicePixelRatio, 2) (or 1.5 on phones). A phone can report 3 or more, which makes the drawing buffer several times larger for little visible gain.',
  },
  TD004: {
    severity: 'error',
    title: 'A <canvas> has no accessible name',
    fix: 'Add aria-label="..." (or aria-labelledby) that says what the scene shows, and put a text description next to it. If the canvas is only decoration, add aria-hidden="true".',
  },
  TD005: {
    severity: 'warning',
    title: 'No check that WebGL is available',
    fix: 'getContext() returns null when WebGL is blocked or unsupported, and new WebGLRenderer() can throw. Check for that and show the fallback image and text instead.',
  },
  TD006: {
    severity: 'warning',
    title: 'No handling of WebGL context loss',
    fix: 'Listen for "webglcontextlost" (call event.preventDefault()) and "webglcontextrestored" on the canvas, show the fallback while lost, and rebuild GPU resources on restore.',
  },
  TD007: {
    severity: 'warning',
    title: 'Nothing pauses the scene off screen or in a hidden tab',
    fix: 'Use IntersectionObserver and the "visibilitychange" event to stop drawing when nobody can see the canvas. This saves battery and keeps the page responsive.',
  },
  TD008: {
    severity: 'warning',
    title: 'The canvas has no static fallback in the HTML',
    fix: 'Put a <noscript> block or an element with a "fallback" or "poster" class next to the canvas, with an image and the key text, so the page still makes sense without the scene.',
  },
  TD009: {
    severity: 'error',
    title: 'A script, model or texture is loaded from another website',
    fix: 'Download the file (after checking its licence), keep it in the project and load it from there. Loading code from a CDN at run time is a privacy, reliability and supply-chain risk.',
  },
  TD010: {
    severity: 'warning',
    title: 'GPU objects are created but never freed',
    fix: 'Call geometry.dispose(), material.dispose(), texture.dispose() and renderer.dispose() (Three.js), or gl.deleteBuffer/deleteTexture/deleteProgram (raw WebGL), when the scene is removed.',
  },
  TD011: {
    severity: 'warning',
    title: 'A wheel or touch listener is non-passive',
    fix: 'A non-passive wheel or touchmove listener can trap scrolling. Let the page scroll normally. If the scene must capture the wheel, require a click or focus first and say so on the page.',
  },
  TD012: {
    severity: 'warning',
    title: 'Pointer controls but no touch-action in the CSS',
    fix: 'Set touch-action: pan-y on the canvas so a vertical swipe still scrolls the page while a horizontal drag rotates the object. Without it, fingers may get stuck on the canvas.',
  },
  TD013: {
    severity: 'warning',
    title: 'A model or texture file is large',
    fix: 'Compress it (smaller textures, fewer triangles, compressed formats) or lazy-load it. VYSON default limits: models 3 MB, textures 1 MB, HDR or EXR environment files 3 MB.',
  },
  TD014: {
    severity: 'warning',
    title: 'The 3D assets add up to a lot of data',
    fix: 'The model and texture files together pass 5 MB (a VYSON default, not a measured limit). Reduce them, or load the scene only on request, and offer a lighter version on phones.',
  },
};

const MODEL_EXT = /\.(?:glb|gltf|bin|obj|fbx|stl|ply)$/i;
const TEXTURE_EXT = /\.(?:png|jpe?g|webp|avif|basis|ktx2?)$/i;
const ENV_EXT = /\.(?:hdr|exr)$/i;
const LIMITS = { model: 3_000_000, texture: 1_000_000, env: 3_000_000, total: 5_000_000 };

const JS_EXT = /\.(?:m?js|cjs|jsx|tsx?)$/i;
const blank = (text) => text.replace(/[^\n]/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

/** Blank comments in JavaScript, keeping new lines. Does not touch "//" inside URLs or strings that follow ":" or a quote. */
function stripJsComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\"'`])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
}

/** Keep only the bodies of inline <script> blocks (same line numbers as the original). */
function inlineScriptView(html) {
  const out = [];
  let cursor = 0;
  for (const m of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi)) {
    out.push(blank(html.slice(cursor, m.index + m[1].length)));
    out.push(/\bsrc\s*=/i.test(m[1]) ? blank(m[2]) : m[2]);
    cursor = m.index + m[1].length + m[2].length;
  }
  out.push(blank(html.slice(cursor)));
  return out.join('');
}

function markupView(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, inside, close) => open + blank(inside) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, inside, close) => open + blank(inside) + close);
}

const hasAttr = (tag, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/|>|$)`, 'i').test(tag.replace(/^<\w+/, ' ').replace(/"[^"]*"|'[^']*'/g, '""'));
const attrValue = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag.replace(/^<\w+/, ' '));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

const USES_3D = /WebGL2?RenderingContext|getContext\(\s*['"](?:webgl2?|experimental-webgl)['"]|\bWebGLRenderer\b|\bfrom\s+['"]three(?:\/[^'"]*)?['"]|@react-three\/fiber|\bTHREE\./;

/**
 * Check a set of files.
 * @param {{ file: string, text: string }[]} sources  .html, .css and script files
 * @param {{ file: string, size: number }[]} assets   files whose size matters
 * @returns {{ uses3d: boolean, issues: object[] }}
 */
export function lintSources(sources, assets = []) {
  const issues = [];
  const add = (code, message, file, line = 1) => issues.push({ code, severity: RULES[code].severity, title: RULES[code].title, fix: RULES[code].fix, message, file, line });

  const files = sources.map(({ file, text }) => {
    const isHtml = /\.html?$/i.test(file);
    const isCss = /\.css$/i.test(file);
    const code = isCss ? '' : stripJsComments(isHtml ? inlineScriptView(text) : text);
    const markup = isHtml ? markupView(text) : '';
    const cssText = isCss ? text : isHtml ? [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') : '';
    return { file, text, isHtml, isCss, code, markup, cssText };
  });

  const allCode = files.map((f) => f.code).join('\n');
  const allCss = files.map((f) => f.cssText).join('\n');
  const everything = files.map((f) => f.text).join('\n');
  const uses3d = USES_3D.test(allCode);
  const firstWith = (regex, field = 'code') => {
    for (const f of files) {
      const m = regex.exec(f[field]);
      if (m) return { file: f.file, line: lineAt(f[field], m.index) };
    }
    return null;
  };
  const firstScene = () => firstWith(USES_3D) ?? { file: files[0]?.file ?? '', line: 1 };

  const hasLoop = /\brequestAnimationFrame\s*\(|\.setAnimationLoop\s*\(/.test(allCode);

  if (hasLoop && !/\bcancelAnimationFrame\s*\(|setAnimationLoop\s*\(\s*null\s*\)/.test(allCode)) {
    const at = firstWith(/\brequestAnimationFrame\s*\(|\.setAnimationLoop\s*\(/);
    add('TD001', 'requestAnimationFrame or setAnimationLoop is used, but nothing cancels it.', at.file, at.line);
  }

  if ((uses3d || hasLoop) && !/prefers-reduced-motion/i.test(everything)) {
    const at = firstScene();
    add('TD002', 'No "prefers-reduced-motion" appears in any checked file.', at.file, at.line);
  }

  for (const f of files) {
    const lines = f.code.split('\n');
    lines.forEach((line, i) => {
      if (!/devicePixelRatio/.test(line)) return;
      const window3 = [lines[i - 1] ?? '', line, lines[i + 1] ?? '', lines[i + 2] ?? ''].join('\n');
      if (!/Math\.min|clamp|maxPixelRatio|Math\.max/.test(window3)) {
        add('TD003', 'devicePixelRatio is used without a limit nearby.', f.file, i + 1);
      }
    });
  }

  for (const f of files.filter((x) => x.isHtml)) {
    for (const m of f.markup.matchAll(/<canvas\b[^>]*>/gi)) {
      const hidden = (attrValue(m[0], 'aria-hidden') ?? '').toLowerCase() === 'true';
      const named = (attrValue(m[0], 'aria-label') ?? '').trim() !== '' || hasAttr(m[0], 'aria-labelledby');
      if (!hidden && !named) add('TD004', 'A <canvas> has no aria-label or aria-labelledby (and is not aria-hidden="true").', f.file, lineAt(f.text, m.index));
    }
    if (/<canvas\b/i.test(f.markup) && !/<noscript\b/i.test(f.markup) && !/(?:class|id|data-[\w-]+)\s*=\s*["'][^"']*(?:fallback|poster)/i.test(f.markup)) {
      const m = /<canvas\b/i.exec(f.markup);
      add('TD008', 'No <noscript> and no element named "fallback" or "poster" was found in this page.', f.file, lineAt(f.text, m.index));
    }
  }

  if (uses3d) {
    if (!/!\s*\w*(?:gl|context|ctx|renderer)\w*\s*\)|[=!]==?\s*null|\bcatch\b|isWebGLAvailable|getWebGLContext|createStage/i.test(allCode)) {
      const at = firstScene();
      add('TD005', 'No null check, try/catch or availability helper was found near the WebGL setup.', at.file, at.line);
    }
    if (!/webglcontextlost/.test(allCode)) {
      const at = firstScene();
      add('TD006', 'No "webglcontextlost" listener was found.', at.file, at.line);
    }
    if (hasLoop && !/IntersectionObserver/.test(allCode) && !/visibilitychange/.test(allCode)) {
      const at = firstWith(/\brequestAnimationFrame\s*\(|\.setAnimationLoop\s*\(/);
      add('TD007', 'A render loop exists, but neither IntersectionObserver nor "visibilitychange" appears.', at.file, at.line);
    }

    const created = /\.create(?:Buffer|Texture|Program|Framebuffer|Renderbuffer)\s*\(|\bnew\s+(?:THREE\.)?\w*(?:Geometry|Material|Texture|RenderTarget)\s*\(|\bnew\s+(?:THREE\.)?WebGLRenderer\s*\(/.test(allCode);
    if (created && !/\.dispose\s*\(|\.delete(?:Buffer|Texture|Program|Framebuffer|Renderbuffer)\s*\(/.test(allCode)) {
      const at = firstWith(/\.create(?:Buffer|Texture|Program|Framebuffer|Renderbuffer)\s*\(|\bnew\s+(?:THREE\.)?\w*(?:Geometry|Material|Texture|RenderTarget)\s*\(|\bnew\s+(?:THREE\.)?WebGLRenderer\s*\(/);
      add('TD010', 'GPU objects are created, but no dispose() or gl.delete...() call exists.', at.file, at.line);
    }
  }

  // Files loaded from other websites.
  const external = /^(?:https?:)?\/\//i;
  for (const f of files.filter((x) => x.isHtml)) {
    for (const m of f.markup.matchAll(/<(img|script|source|video|audio|iframe|link)\b[^>]*>/gi)) {
      const isLink = /^<link/i.test(m[0]);
      const target = attrValue(m[0], isLink ? 'href' : 'src') ?? '';
      if (!external.test(target)) continue;
      if (isLink && /canonical|alternate|author|dns-prefetch/i.test(attrValue(m[0], 'rel') ?? '')) continue;
      add('TD009', `<${m[1].toLowerCase()}> loads ${target} from another website.`, f.file, lineAt(f.text, m.index));
    }
  }
  for (const f of files.filter((x) => !x.isCss)) {
    const re = /(?:\bfrom\s+|\bimport\s*\(\s*|\.load(?:Async)?\s*\(\s*|\bfetch\s*\(\s*|\bimportScripts\s*\(\s*)(['"`])(https?:\/\/[^'"`\s]+)\1/g;
    for (const m of f.code.matchAll(re)) add('TD009', `Code loads ${m[2]} from another website.`, f.file, lineAt(f.code, m.index));
  }

  for (const f of files.filter((x) => !x.isCss)) {
    for (const m of f.code.matchAll(/addEventListener\s*\(\s*['"](?:wheel|mousewheel|touchmove)['"][^;]*?passive\s*:\s*false/g)) {
      add('TD011', 'A wheel or touchmove listener is registered with passive: false.', f.file, lineAt(f.code, m.index));
    }
  }

  if (/\bpointer(?:down|move)\b|\btouchstart\b/.test(allCode) && !/touch-action/.test(allCss) && !/touch-action/.test(allCode)) {
    const at = firstWith(/\bpointer(?:down|move)\b|\btouchstart\b/);
    add('TD012', 'Pointer or touch listeners exist, but "touch-action" appears in no CSS or script.', at.file, at.line);
  }

  let total = 0;
  for (const a of assets) {
    const kind = MODEL_EXT.test(a.file) ? 'model' : ENV_EXT.test(a.file) ? 'env' : TEXTURE_EXT.test(a.file) ? 'texture' : null;
    if (!kind) continue;
    // Plain images count towards the total only when they sit with 3D code; models always count.
    if (kind !== 'texture' || uses3d) total += a.size;
    if (a.size > LIMITS[kind]) {
      add('TD013', `${path.basename(a.file)} is ${(a.size / 1e6).toFixed(1)} MB (limit ${(LIMITS[kind] / 1e6).toFixed(0)} MB for a ${kind === 'env' ? 'environment map' : kind}).`, a.file, 1);
    }
  }
  if (total > LIMITS.total) {
    add('TD014', `Model and texture files add up to ${(total / 1e6).toFixed(1)} MB.`, assets[0]?.file ?? '', 1);
  }

  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return { uses3d, issues };
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build']);

function collect(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const found = [];
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(target, entry.name);
    if (entry.isDirectory()) found.push(...collect(full));
    else found.push(full);
  }
  return found.sort();
}

export function lintPaths(targets) {
  const all = [...new Set(targets.flatMap(collect))];
  const textFiles = all.filter((f) => /\.(?:html?|css)$/i.test(f) || JS_EXT.test(f));
  const sources = textFiles.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));
  const assets = all.filter((f) => MODEL_EXT.test(f) || TEXTURE_EXT.test(f) || ENV_EXT.test(f)).map((file) => ({ file, size: fs.statSync(file).size }));
  const { uses3d, issues } = lintSources(sources, assets);
  return { files: textFiles, assets: assets.length, uses3d, issues };
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const targets = argv.filter((a) => !a.startsWith('--'));
  const known = new Set(['--strict', '--json', '--help']);
  const unknown = [...flags].filter((f) => !known.has(f));

  if (flags.has('--help') || targets.length === 0 || unknown.length) {
    const lines = [
      unknown.length ? `Unknown option: ${unknown.join(', ')}` : '',
      'Usage: node 3d-lint.mjs <file-or-folder> [more paths] [--strict] [--json]',
      '  --strict  treat warnings as errors',
      '  --json    machine-readable output',
    ].filter(Boolean);
    (flags.has('--help') ? console.log : console.error)(lines.join('\n'));
    return flags.has('--help') ? 0 : 2;
  }

  let result;
  try {
    result = lintPaths(targets);
  } catch (error) {
    console.error(`Could not read the files: ${error.message}`);
    return 2;
  }

  const strict = flags.has('--strict');
  const severityOf = (i) => (strict && i.severity === 'warning' ? 'error' : i.severity);
  const errors = result.issues.filter((i) => severityOf(i) === 'error').length;
  const warnings = result.issues.length - errors;

  if (flags.has('--json')) {
    console.log(JSON.stringify({
      tool: 'vyson-3d-lint',
      kind: 'static',
      note: 'Static text and file-size checks only. No browser was opened, no scene was run and no frame rate was measured.',
      filesChecked: result.files.length,
      assetFiles: result.assets,
      uses3d: result.uses3d,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON 3D lint (static checks only: no browser was opened, no scene was run, no frame rate was measured)');
  console.log(`Checked: ${result.files.length} file${result.files.length === 1 ? '' : 's'}, ${result.assets} model, texture or image file${result.assets === 1 ? '' : 's'} by size\n`);
  if (!result.uses3d) console.log('Note: no WebGL or Three.js code was found, so the scene checks were skipped.\n');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${path.relative(process.cwd(), i.file) || i.file}:${i.line}  ${i.code}  ${i.title}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Static checks only. Passing does not replace the performance and device checks in references/performance-and-fallbacks.md.');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
