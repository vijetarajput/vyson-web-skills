#!/usr/bin/env node
// site-audit: a static launch audit for a folder of built HTML, CSS and files.
//
// Point it at the folder you would upload (a plain site, or the output folder of
// a build such as dist/). It reads every .html and .css file and the size of the
// files they use, and reports launch problems: broken links and missing files,
// duplicate ids, missing language, viewport, title and description, heading
// problems, images without alt text, form fields without labels, buttons with
// no name, placeholder text, links that go nowhere, pages that ask search
// engines to stay away, insecure or third-party resources, blocking scripts,
// heavy files, removed focus outlines and animation with no reduced-motion rule.
//
// IT IS A STATIC CHECKER. It only reads files. It never opens a browser and never
// contacts the internet, so it cannot tell you whether the site looks right, how fast
// it loads, whether a link to another website still works, or whether it is
// accessible to a real person. Passing it is NOT a browser test and NOT an
// accessibility or performance audit. For a real browser run, use browser-check.mjs.
//
// The size limits are VYSON defaults, not measured results. File sizes are the
// sizes on disk, before compression by a web server.
//
// It has NO dependencies and works on its own, so it still works after the
// skill has been installed into a project.
//
// Usage:   node site-audit.mjs <site-folder> [--strict] [--json]
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  QA001: { severity: 'error', title: 'Broken link to a page or file on this site', fix: 'Fix the address, or add the missing page or file. Check capital letters: many servers treat Page.html and page.html as different files.' },
  QA002: { severity: 'error', title: 'A file the page needs is missing', fix: 'Add the missing image, script, stylesheet or font, or correct its address. The browser will show a broken image or skip the file.' },
  QA003: { severity: 'warning', title: 'Link to a section that does not exist', fix: 'Add the matching id to the target element, or correct the link. A link such as #pricing needs an element with id="pricing".' },
  QA004: { severity: 'error', title: 'The same id is used twice on a page', fix: 'Make every id unique on the page. Duplicate ids break links, labels and scripts that look an element up by id.' },
  QA005: { severity: 'error', title: 'The page has no language', fix: 'Add a language to the opening tag, for example <html lang="en">. Screen readers and translation tools use it.' },
  QA006: { severity: 'error', title: 'No viewport tag, or the viewport blocks zooming', fix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1"> and remove user-scalable=no and maximum-scale=1.' },
  QA007: { severity: 'warning', title: 'The page has no title', fix: 'Add a short, specific <title>. It is the page name in the browser tab, in search results and for screen readers.' },
  QA008: { severity: 'warning', title: 'Several pages share the same title', fix: 'Give each page its own title so people and search engines can tell them apart.' },
  QA009: { severity: 'warning', title: 'The page has no meta description', fix: 'Add <meta name="description" content="..."> with one or two plain sentences about this page.' },
  QA010: { severity: 'warning', title: 'The page does not have exactly one h1', fix: 'Use one <h1> that names the page, and <h2> and below for sections.' },
  QA011: { severity: 'warning', title: 'A heading level is skipped', fix: 'Use heading levels in order (h1, h2, h3). Choose the level for the structure, and use CSS for the size.' },
  QA012: { severity: 'error', title: 'Image without an alt attribute', fix: 'Add alt="..." that says what the image shows. Use alt="" (empty) only for purely decorative images.' },
  QA013: { severity: 'warning', title: 'Image without width and height', fix: 'Add width and height attributes (the real pixel size) so the browser reserves space and the page does not jump while images load.' },
  QA014: { severity: 'error', title: 'Form field without a label', fix: 'Give every input, select and textarea a visible <label for="id"> (or wrap it in a label). A placeholder is not a label.' },
  QA015: { severity: 'warning', title: 'Button or link with no accessible name', fix: 'Put text inside it, or add aria-label for an icon-only control. Screen readers say just "button" or "link" otherwise.' },
  QA016: { severity: 'warning', title: 'Positive tabindex', fix: 'Remove tabindex values above 0. They override the natural keyboard order and confuse people. Use tabindex="0" or "-1" only.' },
  QA017: { severity: 'warning', title: 'A link goes nowhere', fix: 'Replace href="#", an empty href and javascript: links with a real address, or use a <button> for an action.' },
  QA018: { severity: 'warning', title: 'The page asks search engines not to index it', fix: 'Remove noindex from the robots meta tag if the page should appear in search results. Keep it only on pages that are meant to stay private.' },
  QA019: { severity: 'warning', title: 'No favicon', fix: 'Add <link rel="icon" href="..."> or put a favicon.ico in the site root, so browsers do not request a missing file and tabs have an icon.' },
  QA020: { severity: 'warning', title: 'No Open Graph title or description', fix: 'Add <meta property="og:title"> and <meta property="og:description"> (and an image if you have one) so shared links show a proper preview.' },
  QA021: { severity: 'warning', title: 'Placeholder text', fix: 'Replace lorem ipsum and "your text here" with real content before launch.' },
  QA022: { severity: 'error', title: 'A resource is loaded over insecure http', fix: 'Use https:// (or a local file). Browsers block or warn about insecure files on a secure page.' },
  QA023: { severity: 'warning', title: 'A resource is loaded from another website', fix: 'Each other website can see your visitors and can change what they load. Prefer local copies (after checking licences), and list third parties in your privacy notice.' },
  QA024: { severity: 'warning', title: 'A script in the head blocks the page', fix: 'Add defer (or type="module") so the page can render while the script downloads.' },
  QA025: { severity: 'warning', title: 'A file is large', fix: 'Compress or resize it. VYSON default limits (sizes on disk): images 500 KB, scripts 300 KB, stylesheets 150 KB, pages 100 KB.' },
  QA026: { severity: 'warning', title: 'A page and its local files add up to a lot', fix: 'The page, its stylesheets, scripts and images pass 2 MB on disk (a VYSON default, not a measured limit). Reduce images first, then scripts.' },
  QA027: { severity: 'warning', title: 'Focus outline removed with no replacement', fix: 'If you remove the default outline, style :focus-visible with a clear outline so keyboard users can see where they are.' },
  QA028: { severity: 'warning', title: 'Animation but no reduced-motion rule', fix: 'Add a @media (prefers-reduced-motion: reduce) block that turns off or shortens animation and transitions.' },
};

export const LIMITS = { image: 500_000, script: 300_000, style: 150_000, page: 100_000, pageTotal: 2_000_000 };

const blank = (text) => text.replace(/[^\n]/g, ' ');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const hasAttr = (tag, name) => new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/|>|$)`, 'i').test(tag.replace(/^<\w+/, ' ').replace(/"[^"]*"|'[^']*'/g, '""'));
const attrValue = (tag, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag.replace(/^<\w+/, ' '));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

function markupView(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (m, open, inside, close) => open + blank(inside) + close)
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (m, open, inside, close) => open + blank(inside) + close);
}

const SKIPPED_SCHEME = /^(?:mailto:|tel:|sms:|data:|javascript:|blob:|about:|file:)/i;
const isAbsoluteUrl = (value) => /^(?:https?:)?\/\//i.test(value);

/** Is this file extension an image, script or stylesheet? */
const kindOf = (file) => (/\.(?:png|jpe?g|gif|webp|avif|bmp|ico)$/i.test(file) ? 'image' : /\.(?:m?js|cjs)$/i.test(file) ? 'script' : /\.css$/i.test(file) ? 'style' : /\.html?$/i.test(file) ? 'page' : null);

function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found.sort();
}

/**
 * Audit a folder.
 * @param {string} root the folder to audit (the folder you would upload)
 * @returns {{ pages: string[], files: number, issues: object[] }}
 */
export function auditSite(root) {
  const base = path.resolve(root);
  const all = walk(base);
  const htmlFiles = all.filter((f) => /\.html?$/i.test(f));
  const cssFiles = all.filter((f) => /\.css$/i.test(f));
  const issues = [];
  const add = (code, message, file, line = 1) => issues.push({ code, severity: RULES[code].severity, title: RULES[code].title, fix: RULES[code].fix, message, file, line });

  // Windows and macOS find "About.html" when the file is "about.html"; most web servers do not.
  // So a path counts only if every part of it matches the real file name, capital letters included.
  const listings = new Map();
  const namesIn = (dir) => {
    if (!listings.has(dir)) listings.set(dir, new Set(fs.existsSync(dir) ? fs.readdirSync(dir) : []));
    return listings.get(dir);
  };
  const exactCase = (p) => {
    const relative = path.relative(base, path.resolve(p));
    if (relative === '') return true;
    if (relative.startsWith('..') || path.isAbsolute(relative)) return true; // outside the folder: not our business
    let current = base;
    for (const part of relative.split(path.sep)) {
      if (!namesIn(current).has(part)) return false;
      current = path.join(current, part);
    }
    return true;
  };
  const existsFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile() && exactCase(p);
  const existsDir = (p) => fs.existsSync(p) && fs.statSync(p).isDirectory() && exactCase(p);

  /** Turn an address found in `fromFile` into a path on disk, or null when it is not a local file address. */
  function resolveLocal(fromFile, value) {
    const raw = value.trim();
    if (raw === '' || SKIPPED_SCHEME.test(raw) || isAbsoluteUrl(raw)) return null;
    const noHash = raw.split('#')[0].split('?')[0];
    if (noHash === '') return { path: fromFile, hash: raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '' };
    let decoded = noHash;
    try { decoded = decodeURIComponent(noHash); } catch { /* keep as is */ }
    const target = decoded.startsWith('/') ? path.join(base, decoded) : path.resolve(path.dirname(fromFile), decoded);
    return { path: target, hash: raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '' };
  }

  function resolveExisting(target) {
    if (existsFile(target)) return target;
    if (existsDir(target)) {
      const index = path.join(target, 'index.html');
      return existsFile(index) ? index : null;
    }
    if (!path.extname(target) && existsFile(`${target}.html`)) return `${target}.html`; // "clean URLs" on many hosts
    return null;
  }

  const idCache = new Map();
  const idsOf = (file) => {
    if (!idCache.has(file)) {
      const text = /\.html?$/i.test(file) ? markupView(fs.readFileSync(file, 'utf8')) : '';
      idCache.set(file, new Set([...text.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2])));
    }
    return idCache.get(file);
  };

  const titles = new Map();
  const cssText = cssFiles.map((f) => fs.readFileSync(f, 'utf8'));
  const stylesInPages = [];
  const faviconAtRoot = existsFile(path.join(base, 'favicon.ico'));

  for (const file of htmlFiles) {
    const original = fs.readFileSync(file, 'utf8');
    const html = markupView(original);
    const at = (code, message, index) => add(code, message, file, lineAt(original, index));
    const isDocument = /<html[\s>]/i.test(html);
    const htmlTag = /<html\b[^>]*>/i.exec(html);
    const localUsed = new Set();
    for (const m of original.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) stylesInPages.push(m[1]);

    if (isDocument) {
      if (!(attrValue(htmlTag[0], 'lang') ?? '').trim()) at('QA005', 'The <html> tag has no lang attribute.', htmlTag.index);
      const metas = [...html.matchAll(/<meta\b[^>]*>/gi)];
      const viewport = metas.find((m) => /^viewport$/i.test(attrValue(m[0], 'name') ?? ''));
      if (!viewport) at('QA006', 'No <meta name="viewport"> was found.', htmlTag.index);
      else {
        const content = attrValue(viewport[0], 'content') ?? '';
        const maxScale = /maximum-scale\s*=\s*([\d.]+)/i.exec(content);
        if (/user-scalable\s*=\s*(no|0)\b/i.test(content) || (maxScale && parseFloat(maxScale[1]) < 2)) at('QA006', `The viewport "${content}" blocks zooming.`, viewport.index);
      }
      const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      const titleText = title ? title[1].replace(/\s+/g, ' ').trim() : '';
      if (!titleText) at('QA007', 'There is no <title>, or it is empty.', title ? title.index : htmlTag.index);
      else titles.set(titleText, [...(titles.get(titleText) ?? []), file]);
      if (!metas.some((m) => /^description$/i.test(attrValue(m[0], 'name') ?? '') && (attrValue(m[0], 'content') ?? '').trim())) at('QA009', 'There is no <meta name="description"> with content.', htmlTag.index);
      const robots = metas.find((m) => /^robots$/i.test(attrValue(m[0], 'name') ?? '') && /noindex/i.test(attrValue(m[0], 'content') ?? ''));
      if (robots) at('QA018', `The robots meta tag says "${attrValue(robots[0], 'content')}".`, robots.index);
      const og = (name) => metas.some((m) => (attrValue(m[0], 'property') ?? '').toLowerCase() === name && (attrValue(m[0], 'content') ?? '').trim());
      if (!og('og:title') || !og('og:description')) at('QA020', 'og:title or og:description is missing.', htmlTag.index);
      const hasIconLink = [...html.matchAll(/<link\b[^>]*>/gi)].some((m) => /\bicon\b/i.test(attrValue(m[0], 'rel') ?? ''));
      if (!hasIconLink && !faviconAtRoot) at('QA019', 'No <link rel="icon"> and no favicon.ico in the site root.', htmlTag.index);

      const h1s = [...html.matchAll(/<h1\b/gi)];
      if (h1s.length !== 1) at('QA010', `Found ${h1s.length} <h1> elements; expected exactly 1.`, h1s[1]?.index ?? htmlTag.index);

      const head = /<head\b[^>]*>([\s\S]*?)<\/head>/i.exec(html);
      if (head) {
        const headStart = head.index + head[0].indexOf(head[1]);
        for (const m of head[1].matchAll(/<script\b[^>]*>/gi)) {
          if (hasAttr(m[0], 'src') && !hasAttr(m[0], 'defer') && !hasAttr(m[0], 'async') && (attrValue(m[0], 'type') ?? '').toLowerCase() !== 'module') {
            at('QA024', 'A <script src> in the <head> has no defer, async or type="module".', headStart + m.index);
          }
        }
      }
    }

    // ids and headings
    const seen = new Map();
    for (const m of html.matchAll(/\sid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
      const id = m[1] ?? m[2];
      if (id === '') continue;
      if (seen.has(id)) at('QA004', `The id "${id}" is used more than once.`, m.index);
      else seen.set(id, true);
    }
    let previous = 0;
    for (const m of html.matchAll(/<h([1-6])\b/gi)) {
      const level = Number(m[1]);
      if (previous > 0 && level > previous + 1) at('QA011', `A <h${level}> follows a <h${previous}>, so level ${previous + 1} is skipped.`, m.index);
      previous = level;
    }

    // links
    for (const m of html.matchAll(/<a\b[^>]*>/gi)) {
      const href = attrValue(m[0], 'href');
      if (href === null) continue;
      const value = href.trim();
      if (value === '' || value === '#' || /^javascript:/i.test(value)) {
        at('QA017', value === '' ? 'An <a> has an empty href.' : `An <a> has href="${value}".`, m.index);
        continue;
      }
      const local = resolveLocal(file, value);
      if (!local) continue;
      const found = resolveExisting(local.path);
      if (!found) {
        at('QA001', `The link "${value}" points to a file that does not exist.`, m.index);
        continue;
      }
      if (local.hash && local.hash.toLowerCase() !== 'top' && /\.html?$/i.test(found) && !idsOf(found).has(local.hash)) {
        at('QA003', `The link "${value}" points to a section (#${local.hash}) that does not exist in ${path.basename(found)}.`, m.index);
      }
    }

    // resources
    const resourceAttrs = [];
    for (const m of html.matchAll(/<(img|script|source|video|audio|iframe|embed|track|input)\b[^>]*>/gi)) {
      if (/^input$/i.test(m[1]) && (attrValue(m[0], 'type') ?? '').toLowerCase() !== 'image') continue;
      const src = attrValue(m[0], 'src');
      if (src !== null) resourceAttrs.push({ tag: m[1].toLowerCase(), value: src, index: m.index });
      const srcset = attrValue(m[0], 'srcset');
      if (srcset) for (const part of srcset.split(',')) { const u = part.trim().split(/\s+/)[0]; if (u) resourceAttrs.push({ tag: m[1].toLowerCase(), value: u, index: m.index }); }
      const poster = attrValue(m[0], 'poster');
      if (poster) resourceAttrs.push({ tag: m[1].toLowerCase(), value: poster, index: m.index });
    }
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      const rel = (attrValue(m[0], 'rel') ?? '').toLowerCase();
      if (!/\b(?:stylesheet|icon|preload|modulepreload|manifest|apple-touch-icon)\b/.test(rel)) continue;
      const href = attrValue(m[0], 'href');
      if (href !== null) resourceAttrs.push({ tag: 'link', value: href, index: m.index });
    }
    const otherHosts = new Set();
    for (const { tag, value, index } of resourceAttrs) {
      const trimmed = value.trim();
      if (/^http:\/\//i.test(trimmed)) at('QA022', `<${tag}> loads ${trimmed} over http.`, index);
      if (isAbsoluteUrl(trimmed)) {
        const host = (() => { try { return new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed).host; } catch { return trimmed; } })();
        if (!otherHosts.has(host)) { otherHosts.add(host); at('QA023', `<${tag}> loads a file from ${host}.`, index); }
        continue;
      }
      const local = resolveLocal(file, trimmed);
      if (!local) continue;
      if (!resolveExisting(local.path) && !(local.path === file)) {
        at('QA002', `<${tag}> uses "${trimmed}", which does not exist.`, index);
      } else if (existsFile(local.path)) localUsed.add(local.path);
    }

    // images, forms, names
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      if (!hasAttr(m[0], 'alt')) at('QA012', 'An <img> has no alt attribute.', m.index);
      if (!hasAttr(m[0], 'width') || !hasAttr(m[0], 'height')) at('QA013', 'An <img> is missing width or height.', m.index);
    }
    const labelRanges = [...html.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/gi)].map((m) => [m.index, m.index + m[0].length]);
    const labelFor = new Set([...html.matchAll(/<label\b[^>]*>/gi)].map((m) => attrValue(m[0], 'for')).filter(Boolean));
    for (const m of html.matchAll(/<(input|select|textarea)\b[^>]*>/gi)) {
      const type = (attrValue(m[0], 'type') ?? 'text').toLowerCase();
      if (m[1].toLowerCase() === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
      const id = attrValue(m[0], 'id');
      const named = (attrValue(m[0], 'aria-label') ?? '').trim() !== '' || hasAttr(m[0], 'aria-labelledby');
      if (!named && !labelRanges.some(([s, e]) => m.index > s && m.index < e) && !(id && labelFor.has(id))) at('QA014', `A <${m[1].toLowerCase()}> has no label.`, m.index);
    }
    for (const m of html.matchAll(/<(button|a)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const tag = /^<[^>]*>/.exec(m[0])[0];
      if (m[1].toLowerCase() === 'a' && !hasAttr(tag, 'href')) continue;
      const inner = m[2]
        .replace(/<img\b[^>]*alt\s*=\s*["']([^"']*)["'][^>]*>/gi, ' $1 ')
        .replace(/<title\b[^>]*>([\s\S]*?)<\/title>/gi, ' $1 ')
        .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
      const named = (attrValue(tag, 'aria-label') ?? '').trim() !== '' || hasAttr(tag, 'aria-labelledby') || (attrValue(tag, 'title') ?? '').trim() !== '';
      if (!inner && !named) at('QA015', `A <${m[1].toLowerCase()}> has no text and no aria-label.`, m.index);
    }
    for (const m of html.matchAll(/\stabindex\s*=\s*["']?(\d+)/gi)) {
      if (Number(m[1]) > 0) at('QA016', `tabindex="${m[1]}" is above 0.`, m.index);
    }

    // placeholder text
    const placeholder = /lorem ipsum|dolor sit amet|\byour (?:text|headline|title|company|logo|tagline) here\b|\binsert (?:text|image|headline|logo)\b|\bcompany name\b/i;
    const textOnly = html.replace(/<[^>]*>/g, (tag) => blank(tag));
    textOnly.split('\n').forEach((line, i) => {
      const found = placeholder.exec(line);
      if (found) add('QA021', `Found "${found[0]}".`, file, i + 1);
    });

    // size of the page and what it uses
    const pageSize = fs.statSync(file).size;
    if (pageSize > LIMITS.page) add('QA025', `${path.basename(file)} is ${(pageSize / 1000).toFixed(0)} KB (limit ${LIMITS.page / 1000} KB).`, file, 1);
    let total = pageSize;
    for (const used of localUsed) total += fs.statSync(used).size;
    if (total > LIMITS.pageTotal) add('QA026', `This page and the local files it uses add up to ${(total / 1e6).toFixed(1)} MB.`, file, 1);
  }

  // Duplicate titles across pages.
  for (const [title, files] of titles) {
    if (files.length > 1) for (const file of files) add('QA008', `The title "${title}" is used by ${files.length} pages.`, file, 1);
  }

  // Large files anywhere in the folder.
  for (const file of all) {
    const kind = kindOf(file);
    if (!kind || kind === 'page') continue;
    const size = fs.statSync(file).size;
    if (size > LIMITS[kind]) add('QA025', `${path.basename(file)} is ${(size / 1000).toFixed(0)} KB (limit ${LIMITS[kind] / 1000} KB for ${kind === 'style' ? 'a stylesheet' : kind === 'script' ? 'a script' : 'an image'}).`, file, 1);
  }

  // CSS checks: missing url() files, other websites, focus outlines, motion.
  const allCss = [...cssText, ...stylesInPages];
  cssFiles.forEach((file, i) => {
    const raw = cssText[i].replace(/\/\*[\s\S]*?\*\//g, blank);
    for (const m of raw.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3/gi)) {
      const value = (m[2] ?? m[4] ?? '').trim();
      if (!value || /^data:/i.test(value)) continue;
      if (/^http:\/\//i.test(value)) add('QA022', `The stylesheet loads ${value} over http.`, file, lineAt(raw, m.index));
      if (isAbsoluteUrl(value)) {
        add('QA023', `The stylesheet loads a file from ${(() => { try { return new URL(value.startsWith('//') ? `https:${value}` : value).host; } catch { return value; } })()}.`, file, lineAt(raw, m.index));
        continue;
      }
      const local = resolveLocal(file, value);
      if (local && !resolveExisting(local.path)) add('QA002', `The stylesheet uses "${value}", which does not exist.`, file, lineAt(raw, m.index));
    }
  });
  const joined = allCss.map((c) => c.replace(/\/\*[\s\S]*?\*\//g, blank)).join('\n');
  if (!/:focus-visible/.test(joined)) {
    const m = /outline\s*:\s*(?:none|0)\b/i.exec(joined);
    if (m) {
      const where = cssFiles.find((f, i) => /outline\s*:\s*(?:none|0)\b/i.test(cssText[i])) ?? htmlFiles[0];
      add('QA027', 'A stylesheet sets outline to none or 0, and no :focus-visible rule exists.', where, 1);
    }
  }
  if (/\banimation(?:-name)?\s*:\s*(?!none)|@keyframes|\btransition\s*:\s*(?!none)[^;]*\d/i.test(joined) && !/prefers-reduced-motion/i.test(joined)) {
    const where = cssFiles.find((f, i) => /@keyframes|\banimation\s*:|\btransition\s*:/i.test(cssText[i])) ?? htmlFiles[0];
    add('QA028', 'CSS uses animation or transitions, but "prefers-reduced-motion" appears nowhere in the CSS.', where, 1);
  }

  issues.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
  return { pages: htmlFiles, files: all.length, issues };
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const targets = argv.filter((a) => !a.startsWith('--'));
  const known = new Set(['--strict', '--json', '--help']);
  const unknown = [...flags].filter((f) => !known.has(f));
  if (flags.has('--help') || targets.length !== 1 || unknown.length) {
    const lines = [
      unknown.length ? `Unknown option: ${unknown.join(', ')}` : '',
      targets.length > 1 ? 'Give exactly one folder.' : '',
      'Usage: node site-audit.mjs <site-folder> [--strict] [--json]',
      '  --strict  treat warnings as errors',
      '  --json    machine-readable output',
    ].filter(Boolean);
    (flags.has('--help') ? console.log : console.error)(lines.join('\n'));
    return flags.has('--help') ? 0 : 2;
  }
  if (!fs.existsSync(targets[0]) || !fs.statSync(targets[0]).isDirectory()) {
    console.error(`"${targets[0]}" is not a folder. Give the folder you would upload.`);
    return 2;
  }

  const result = auditSite(targets[0]);
  const strict = flags.has('--strict');
  const severityOf = (i) => (strict && i.severity === 'warning' ? 'error' : i.severity);
  const errors = result.issues.filter((i) => severityOf(i) === 'error').length;
  const warnings = result.issues.length - errors;

  if (flags.has('--json')) {
    console.log(JSON.stringify({
      tool: 'vyson-site-audit',
      kind: 'static',
      note: 'Static file checks only. No browser was opened, nothing was loaded from the internet and nothing was measured.',
      pages: result.pages.length,
      files: result.files,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON site audit (static checks only: no browser was opened, nothing was measured, no internet was used)');
  console.log(`Checked: ${result.pages.length} page${result.pages.length === 1 ? '' : 's'}, ${result.files} file${result.files === 1 ? '' : 's'} in the folder\n`);
  if (result.pages.length === 0) console.log('No .html files were found in that folder.\n');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${path.relative(process.cwd(), i.file) || i.file}:${i.line}  ${i.code}  ${i.title}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Static checks only. Passing does not replace a browser test, an accessibility review or a performance measurement (see references/quality-plan.md).');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
