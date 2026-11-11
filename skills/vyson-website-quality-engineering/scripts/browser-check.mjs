#!/usr/bin/env node
// browser-check: a real-browser check of one page at several screen widths.
//
// It starts a headless Chrome or Edge that is already installed on your computer,
// opens your page, and measures what a static checker cannot see: sideways
// scrolling, the real size of buttons and links on a phone-sized screen, broken
// images, JavaScript errors, failed requests, text that is too small, layout shift
// while loading, whether keyboard focus is visible on every Tab stop, whether any
// animation keeps running when the visitor asks for reduced motion, and which other
// websites the page talks to.
//
// THIS IS A BROWSER TEST, NOT A STATIC CHECK, BUT IT IS ONE RUN IN ONE BROWSER on this
// computer: headless Chrome or Edge, software graphics, no network throttling, no touch screen
// (touch is emulated), no screen reader. It does not replace a real phone, Firefox,
// Safari, a screen reader or a human reviewing the page. The layout-shift value is a lab
// number from one run, not field data.
//
// What it opens: the page you give it, and whatever that page loads. A folder is served
// on 127.0.0.1 (your own computer only) and is read-only. A page on another website is
// opened only if you add --allow-remote, because the browser will then load it for real.
// The script sends nothing anywhere else, has no dependencies, and deletes its temporary
// browser profile when it finishes.
//
// Usage:   node browser-check.mjs <folder | page.html | http(s)://address> [options]
// Options: --page <file>       page inside the folder (default index.html)
//          --widths 320,390    widths in CSS pixels (default 320,390,768,1280,1440)
//          --screenshots <dir>  save a full-page screenshot at each width
//          --browser <path>     use this Chrome or Edge (or set CHROME_PATH)
//          --tab-stops 50       how many Tab presses to try (default 50)
//          --wait 800           milliseconds to let the page settle (default 800)
//          --allow-remote       allow a page that is not on this computer
//          --strict             treat warnings as errors
//          --json               machine-readable output
// Exit:    0 = no errors, 1 = errors found, 2 = incorrect usage, 3 = the browser test could not be run

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RULES = {
  BC001: { severity: 'error', title: 'The page did not load', fix: 'Check the address or the file. For a page that uses module scripts or fetch(), give a folder so the check can serve it.' },
  BC002: { severity: 'error', title: 'JavaScript errors in the console', fix: 'Open the browser console on the page, read the first error, and fix it. One early error can stop everything after it.' },
  BC003: { severity: 'error', title: 'A request failed', fix: 'The file or request returned an error (404, 500) or was blocked. Fix the address, add the file, or handle the failure.' },
  BC004: { severity: 'error', title: 'The page scrolls sideways at this width', fix: 'Find the element that is wider than the screen (the check names the widest ones) and let it wrap or shrink. Avoid fixed widths and width: 100vw.' },
  BC005: { severity: 'error', title: 'A control is under 24 by 24 CSS pixels on a touch width', fix: 'Make every button, link and field at least 24 by 24 CSS pixels (WCAG 2.2 level AA, SC 2.5.8), and aim for 44 by 44.' },
  BC006: { severity: 'warning', title: 'A control is under 44 by 44 CSS pixels on a touch width', fix: 'Aim for 44 by 44 CSS pixels with padding. Links inside a sentence are exempt; a small checkbox can sit inside a 44 pixel high label.' },
  BC007: { severity: 'error', title: 'Keyboard focus is not visible on a Tab stop', fix: 'Style :focus-visible with a clear outline (for example outline: 3px solid; outline-offset: 3px). Do not remove the outline without a replacement.' },
  BC008: { severity: 'error', title: 'Keyboard focus got stuck', fix: 'Focus stayed on one element through several Tab presses. Find the script or element that traps focus, and let Tab move on.' },
  BC009: { severity: 'error', title: 'A broken image', fix: 'The image loaded but could not be shown. Check the file, its format and its address.' },
  BC010: { severity: 'warning', title: 'Text under 12px', fix: 'Raise the size of very small text. Keep body text at 16px or more and small print at 12px or more.' },
  BC011: { severity: 'warning', title: 'Body text under 16px on a phone-sized screen', fix: 'Set the base font size to 1rem (16px) or more so people do not need to zoom to read.' },
  BC012: { severity: 'warning', title: 'The layout shifted while loading', fix: 'Give images, embeds and late-loading content reserved space (width and height, aspect-ratio, min-height). 0.1 is the "good" limit that Google publishes for field data; this is one lab run.' },
  BC013: { severity: 'warning', title: 'Animation keeps running with reduced motion', fix: 'Add @media (prefers-reduced-motion: reduce) rules that stop looping animation, and check scripts that animate by themselves.' },
  BC014: { severity: 'warning', title: 'The page talks to other websites', fix: 'List these hosts in your privacy review. Prefer local copies of scripts, fonts and images (after checking licences) and remove what you do not need.' },
};

const DEFAULT_WIDTHS = [320, 390, 768, 1280, 1440];
const TOUCH_MAX_WIDTH = 768;

/** Read the command line. Returns the options and a list of problems with them. */
export function parseArgs(argv) {
  const options = { target: null, page: null, widths: DEFAULT_WIDTHS, screenshots: null, browser: null, tabStops: 50, wait: 800, allowRemote: false, strict: false, json: false, help: false };
  const problems = [];
  const valueFlags = new Set(['--page', '--widths', '--screenshots', '--browser', '--tab-stops', '--wait']);
  const boolFlags = new Set(['--allow-remote', '--strict', '--json', '--help']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (valueFlags.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) { problems.push(`${arg} needs a value.`); continue; }
      i += 1;
      if (arg === '--page') options.page = value;
      if (arg === '--screenshots') options.screenshots = value;
      if (arg === '--browser') options.browser = value;
      if (arg === '--widths') {
        const widths = value.split(',').map((w) => Number(w.trim()));
        if (widths.length === 0 || widths.some((w) => !Number.isInteger(w) || w < 200 || w > 4000)) problems.push('--widths must be whole numbers between 200 and 4000, separated by commas.');
        else options.widths = [...new Set(widths)].sort((a, b) => a - b);
      }
      if (arg === '--tab-stops' || arg === '--wait') {
        const number = Number(value);
        if (!Number.isInteger(number) || number < 0 || number > 5000) problems.push(`${arg} must be a whole number between 0 and 5000.`);
        else if (arg === '--tab-stops') options.tabStops = number;
        else options.wait = number;
      }
    } else if (boolFlags.has(arg)) {
      if (arg === '--allow-remote') options.allowRemote = true;
      if (arg === '--strict') options.strict = true;
      if (arg === '--json') options.json = true;
      if (arg === '--help') options.help = true;
    } else if (arg.startsWith('--')) {
      problems.push(`Unknown option: ${arg}`);
    } else if (options.target === null) {
      options.target = arg;
    } else {
      problems.push(`Only one page or folder can be checked at a time (extra: ${arg}).`);
    }
  }
  if (!options.help && options.target === null) problems.push('Give a folder, an HTML file or an address.');
  return { options, problems };
}

const isLocalHost = (host) => ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);

/** Find an installed Chrome or Edge. `exists` and `env` can be replaced in tests. */
export function findBrowser({ env = process.env, platform = process.platform, exists = fs.existsSync } = {}) {
  if (env.CHROME_PATH && exists(env.CHROME_PATH)) return env.CHROME_PATH;
  const candidates = [];
  if (platform === 'win32') {
    for (const root of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA]) {
      if (!root) continue;
      candidates.push(path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe'));
      candidates.push(path.join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (platform === 'darwin') {
    candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium');
  } else {
    for (const dir of (env.PATH ?? '').split(path.delimiter)) {
      for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) if (dir) candidates.push(path.join(dir, name));
    }
  }
  return candidates.find((c) => exists(c)) ?? null;
}

// ---------------------------------------------------------------------------
// A tiny static server for a folder (127.0.0.1 only, read-only)
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

function startServer(root) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    let file = path.resolve(base, `.${pathname}`);
    const relative = path.relative(base, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { res.writeHead(403).end(); return; }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      const body = fs.readFileSync(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((r) => server.close(r)) }));
  });
}

// ---------------------------------------------------------------------------
// The DevTools connection
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = [];
    ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(`${message.error.message}`)); else resolve(message.result ?? {});
      } else if (message.method) {
        for (const handler of this.handlers) handler(message);
      }
    });
  }

  send(method, params = {}, sessionId) {
    this.nextId += 1;
    const id = this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`The browser did not answer ${method} in time.`)); }, 30000);
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }

  on(handler) { this.handlers.push(handler); }
}

async function launchBrowser(browserPath) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyson-browser-'));
  const child = spawn(browserPath, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', 'about:blank',
  ], { stdio: 'ignore' });
  let exited = false;
  child.once('exit', () => { exited = true; });
  const portFile = path.join(profile, 'DevToolsActivePort');
  let endpoint = null;
  for (let i = 0; i < 100 && !endpoint; i += 1) {
    if (exited) break;
    try {
      const lines = fs.readFileSync(portFile, 'utf8').split('\n');
      if (lines[0] && lines[1]) endpoint = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`;
    } catch { /* not ready yet */ }
    if (!endpoint) await sleep(150);
  }
  const cleanup = async () => {
    if (!exited) { child.kill(); await sleep(300); }
    for (let i = 0; i < 5; i += 1) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch { await sleep(300); } }
  };
  if (!endpoint) { await cleanup(); throw new Error('The browser did not start. Try --browser <path to chrome or msedge>.'); }
  const ws = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', () => reject(new Error('Could not connect to the browser.')), { once: true }); });
  const cdp = new Cdp(ws);
  const { product } = await cdp.send('Browser.getVersion');
  return {
    cdp,
    product,
    async close() {
      try { await cdp.send('Browser.close'); } catch { /* already closing */ }
      try { ws.close(); } catch { /* ignore */ }
      await sleep(300);
      await cleanup();
    },
  };
}

// ---------------------------------------------------------------------------
// Probes that run inside the page
// ---------------------------------------------------------------------------

export const LAYOUT_PROBE = `(() => {
  const de = document.documentElement;
  const visible = (e) => { if (!e.getClientRects().length) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (e) => ((e.getAttribute('aria-label') || e.innerText || e.value || e.getAttribute('placeholder') || e.id || e.name || '').trim().replace(/\\s+/g, ' ').slice(0, 40)) || '(' + e.tagName.toLowerCase() + ')';
  const offenders = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && visible(e); })
    .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right).slice(0, 3)
    .map((e) => ({ tag: e.tagName.toLowerCase(), cls: String(e.className || '').slice(0, 40), right: Math.round(e.getBoundingClientRect().right) }));
  const inSentence = (e) => { if (e.tagName !== 'A' || getComputedStyle(e).display !== 'inline') return false; const p = e.parentElement; return [...p.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0); };
  const controls = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch]')]
    .filter((e) => visible(e) && !e.disabled).map((e) => {
      let r = e.getBoundingClientRect();
      for (const l of (e.labels || [])) { const lr = l.getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; }
      return { label: label(e), tag: e.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), sentence: inSentence(e) };
    }).filter((c) => !(c.w <= 2 && c.h <= 2) && !c.sentence);
  const textEls = [...document.body.querySelectorAll('*')].filter((e) => visible(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0) && !/^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName));
  const small = textEls.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 12).slice(0, 5).map((e) => ({ tag: e.tagName.toLowerCase(), text: label(e), px: parseFloat(getComputedStyle(e).fontSize) }));
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc).map((i) => i.currentSrc.slice(-80));
  return {
    innerWidth, scrollWidth: de.scrollWidth, overflowX: de.scrollWidth > innerWidth + 1, offenders,
    controls, smallText: small, broken, bodyPx: parseFloat(getComputedStyle(document.body).fontSize),
    cls: window.__vc ? window.__vc.cls : null, lcp: window.__vc ? window.__vc.lcp : null,
  };
})()`;

export const OBSERVER_SOURCE = `(() => { try { window.__vc = { cls: 0, lcp: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vc.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { const a = l.getEntries(); if (a.length) window.__vc.lcp = a[a.length - 1].startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) { /* unsupported: leave the values empty */ } })()`;

const MARK_FOCUSABLES = `(() => {
  const style = (e) => { const s = getComputedStyle(e); return { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow, borderColor: s.borderColor, backgroundColor: s.backgroundColor, color: s.color, textDecorationLine: s.textDecorationLine }; };
  window.__vcBase = {};
  let n = 0;
  for (const e of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex], [contenteditable=true]')) { n += 1; e.setAttribute('data-vc', String(n)); window.__vcBase[n] = style(e); }
  return n;
})()`;

export const FOCUS_PROBE = `(() => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { kind: 'body' };
  const s = getComputedStyle(e); const id = e.getAttribute('data-vc'); const base = (window.__vcBase || {})[id] || null;
  const now = { outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, boxShadow: s.boxShadow, borderColor: s.borderColor, backgroundColor: s.backgroundColor, color: s.color, textDecorationLine: s.textDecorationLine };
  const outline = now.outlineStyle !== 'none' && parseFloat(now.outlineWidth) > 0 && !/rgba\\(\\s*\\d+,\\s*\\d+,\\s*\\d+,\\s*0\\s*\\)|transparent/.test(now.outlineColor);
  const changed = base ? ['boxShadow', 'borderColor', 'backgroundColor', 'color', 'textDecorationLine'].some((k) => now[k] !== base[k]) : false;
  const shadow = now.boxShadow !== 'none' && (!base || now.boxShadow !== base.boxShadow);
  const r = e.getBoundingClientRect();
  const label = ((e.getAttribute('aria-label') || e.innerText || e.value || e.id || e.name || '').trim().replace(/\\s+/g, ' ').slice(0, 40)) || '(' + e.tagName.toLowerCase() + ')';
  return { kind: 'el', id, tag: e.tagName.toLowerCase(), label, visibleIndicator: outline || shadow || changed, size: [Math.round(r.width), Math.round(r.height)] };
})()`;

// ---------------------------------------------------------------------------
// Turning measurements into issues (a pure function, tested without a browser)
// ---------------------------------------------------------------------------

/** Turn one width's measurement into issues. `touch` is true at phone and tablet widths. */
export function judgeLayout(width, probe, touch) {
  const found = [];
  const add = (code, message) => found.push({ code, severity: RULES[code].severity, title: RULES[code].title, fix: RULES[code].fix, width, message });
  if (probe.overflowX) {
    const where = probe.offenders.map((o) => `<${o.tag}${o.cls ? ` class="${o.cls}"` : ''}> reaches ${o.right}px`).join('; ');
    add('BC004', `At ${width}px the page is ${probe.scrollWidth}px wide.${where ? ` Widest: ${where}.` : ''}`);
  }
  if (touch) {
    const tiny = probe.controls.filter((c) => c.w < 24 || c.h < 24);
    const small = probe.controls.filter((c) => !(c.w < 24 || c.h < 24) && (c.w < 44 || c.h < 44));
    const list = (items) => items.slice(0, 5).map((c) => `${c.label} (${c.w}x${c.h})`).join(', ');
    if (tiny.length) add('BC005', `${tiny.length} control${tiny.length === 1 ? '' : 's'} under 24x24: ${list(tiny)}.`);
    if (small.length) add('BC006', `${small.length} control${small.length === 1 ? '' : 's'} under 44x44: ${list(small)}.`);
    if (probe.bodyPx < 16) add('BC011', `The body text is ${probe.bodyPx}px.`);
  }
  if (probe.broken.length) add('BC009', `${probe.broken.length} broken image${probe.broken.length === 1 ? '' : 's'}: ${probe.broken.join(', ')}.`);
  if (probe.smallText.length) add('BC010', `Text under 12px, for example ${probe.smallText.map((t) => `"${t.text}" at ${t.px}px`).slice(0, 3).join(', ')}.`);
  return found;
}

/** Judge the keyboard walk. `stops` are the results of FOCUS_PROBE after each Tab press. */
export function judgeKeyboard(stops) {
  const found = [];
  const add = (code, message) => found.push({ code, severity: RULES[code].severity, title: RULES[code].title, fix: RULES[code].fix, width: null, message });
  const hidden = stops.filter((s) => s.kind === 'el' && !s.visibleIndicator);
  const seen = new Set();
  for (const s of hidden) {
    const key = `${s.tag}:${s.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    add('BC007', `<${s.tag}> "${s.label}" gets focus but nothing visible changes.`);
  }
  let run = 1;
  for (let i = 1; i < stops.length; i += 1) {
    const same = stops[i].kind === 'el' && stops[i - 1].kind === 'el' && stops[i].id !== null && stops[i].id === stops[i - 1].id;
    run = same ? run + 1 : 1;
    if (run === 3) { add('BC008', `Focus stayed on <${stops[i].tag}> "${stops[i].label}" through 3 Tab presses.`); break; }
  }
  return found;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

async function runChecks(options, browserPath, url, log) {
  const issues = [];
  const rows = [];
  const hosts = new Map();
  const origin = new URL(url).origin;
  const browser = await launchBrowser(browserPath);
  const { cdp } = browser;
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const call = (method, params) => cdp.send(method, params, sessionId);
    let events = { exceptions: [], consoleErrors: [], failed: [], loadFired: false, mainStatus: null };
    const requests = new Map();
    cdp.on((m) => {
      if (m.sessionId !== sessionId) return;
      const p = m.params ?? {};
      if (m.method === 'Runtime.exceptionThrown') events.exceptions.push(p.exceptionDetails?.exception?.description?.split('\n')[0] ?? p.exceptionDetails?.text ?? 'error');
      if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') events.consoleErrors.push((p.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
      if (m.method === 'Network.requestWillBeSent') {
        requests.set(p.requestId, p.request.url);
        try {
          const u = new URL(p.request.url);
          if (!/^(data|blob|about):$/.test(u.protocol) && u.origin !== origin && u.protocol !== 'file:') hosts.set(u.host, (hosts.get(u.host) ?? 0) + 1);
        } catch { /* ignore */ }
      }
      if (m.method === 'Network.responseReceived') {
        if (p.type === 'Document' && events.mainStatus === null) events.mainStatus = p.response.status;
        // A missing favicon.ico is reported by the static audit (QA019), not here.
        if (p.response.status >= 400 && !/\/favicon\.ico(?:\?|$)/.test(p.response.url)) events.failed.push(`${p.response.status} ${p.response.url}`);
      }
      if (m.method === 'Network.loadingFailed' && !p.canceled && p.errorText !== 'net::ERR_ABORTED' && !/\/favicon\.ico(?:\?|$)/.test(requests.get(p.requestId) ?? '')) events.failed.push(`${p.errorText} ${requests.get(p.requestId) ?? ''}`.trim());
      if (m.method === 'Page.loadEventFired') events.loadFired = true;
    });
    for (const domain of ['Page', 'Runtime', 'Network']) await call(`${domain}.enable`);
    await call('Emulation.setFocusEmulationEnabled', { enabled: true });
    await call('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER_SOURCE });

    const evaluate = async (expression) => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'The page script failed.');
      return result.result.value;
    };
    const open = async () => {
      events = { exceptions: [], consoleErrors: [], failed: events.failed, loadFired: false, mainStatus: null };
      const nav = await call('Page.navigate', { url });
      if (nav.errorText) return { ok: false, error: nav.errorText };
      for (let i = 0; i < 100 && !events.loadFired; i += 1) await sleep(100);
      await sleep(options.wait);
      return { ok: true };
    };

    let firstLoad = true;
    for (const width of options.widths) {
      const touch = width <= TOUCH_MAX_WIDTH;
      await call('Emulation.setDeviceMetricsOverride', { width, height: touch ? 844 : 900, deviceScaleFactor: 1, mobile: touch });
      await call('Emulation.setTouchEmulationEnabled', { enabled: touch });
      const loaded = await open();
      if (!loaded.ok) {
        issues.push({ code: 'BC001', severity: 'error', title: RULES.BC001.title, fix: RULES.BC001.fix, width, message: `The browser could not open the page (${loaded.error}).` });
        break;
      }
      if (events.mainStatus !== null && events.mainStatus >= 400) {
        issues.push({ code: 'BC001', severity: 'error', title: RULES.BC001.title, fix: RULES.BC001.fix, width, message: `The page answered with status ${events.mainStatus}.` });
        break;
      }
      const probe = await evaluate(LAYOUT_PROBE);
      issues.push(...judgeLayout(width, probe, touch));
      rows.push({ width, touch, scrollWidth: probe.scrollWidth, overflowX: probe.overflowX, controls: probe.controls.length, under44: probe.controls.filter((c) => c.w < 44 || c.h < 44).length, under24: probe.controls.filter((c) => c.w < 24 || c.h < 24).length, broken: probe.broken.length, bodyPx: probe.bodyPx, cls: probe.cls, lcp: probe.lcp });
      if (firstLoad) {
        if (events.exceptions.length) issues.push({ code: 'BC002', severity: 'error', title: RULES.BC002.title, fix: RULES.BC002.fix, width, message: `Uncaught: ${[...new Set(events.exceptions)].slice(0, 3).join(' | ')}` });
        if (events.consoleErrors.length) issues.push({ code: 'BC002', severity: 'error', title: RULES.BC002.title, fix: RULES.BC002.fix, width, message: `console.error: ${[...new Set(events.consoleErrors)].slice(0, 3).join(' | ')}` });
        firstLoad = false;
      }
      if (options.screenshots) {
        fs.mkdirSync(options.screenshots, { recursive: true });
        const metrics = await call('Page.getLayoutMetrics');
        const height = Math.min(8000, Math.ceil(metrics.cssContentSize?.height ?? 900));
        const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } });
        fs.writeFileSync(path.join(options.screenshots, `width-${width}.png`), Buffer.from(shot.data, 'base64'));
      }
    }

    if (events.failed.length) {
      const list = [...new Set(events.failed)];
      issues.push({ code: 'BC003', severity: 'error', title: RULES.BC003.title, fix: RULES.BC003.fix, width: null, message: `${list.length} failed request${list.length === 1 ? '' : 's'}: ${list.slice(0, 5).join(', ')}.` });
    }
    const cls = rows.map((r) => r.cls).filter((v) => typeof v === 'number');
    if (cls.length && Math.max(...cls) > 0.1) issues.push({ code: 'BC012', severity: 'warning', title: RULES.BC012.title, fix: RULES.BC012.fix, width: null, message: `Layout shift of ${Math.max(...cls).toFixed(3)} during load (lab, one run).` });

    // Keyboard walk at the widest desktop width.
    let walk = { stops: 0, done: false };
    if (rows.length && options.tabStops > 0) {
      const desktop = [...options.widths].reverse().find((w) => w > TOUCH_MAX_WIDTH) ?? options.widths[options.widths.length - 1];
      await call('Emulation.setDeviceMetricsOverride', { width: desktop, height: 900, deviceScaleFactor: 1, mobile: false });
      await call('Emulation.setTouchEmulationEnabled', { enabled: false });
      if ((await open()).ok) {
        const total = await evaluate(MARK_FOCUSABLES);
        const stops = [];
        for (let i = 0; i < options.tabStops; i += 1) {
          await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
          await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
          const stop = await evaluate(FOCUS_PROBE);
          if (stop.kind === 'body' && stops.length > 0) break; // focus left the page: the walk is complete
          if (stops.length > 2 && stop.id === stops[0].id) break; // back at the first element
          stops.push(stop);
        }
        const elementStops = stops.filter((s) => s.kind === 'el');
        walk = { stops: elementStops.length, candidates: total, done: true, order: elementStops.slice(0, 12).map((s) => `${s.tag} "${s.label}"`) };
        issues.push(...judgeKeyboard(stops));
      }
    }

    // Reduced motion pass.
    let motion = { running: null };
    if (rows.length) {
      await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      if ((await open()).ok) {
        const running = await evaluate(`document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations === Infinity).map((a) => { const t = a.effect.target; return t ? t.tagName.toLowerCase() + (t.className ? '.' + String(t.className).split(' ')[0] : '') : 'unknown'; })`);
        motion = { running: running.length };
        if (running.length) issues.push({ code: 'BC013', severity: 'warning', title: RULES.BC013.title, fix: RULES.BC013.fix, width: null, message: `${running.length} looping animation${running.length === 1 ? ' is' : 's are'} still running: ${running.slice(0, 4).join(', ')}.` });
      }
      await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: '' }] });
    }

    if (hosts.size) {
      const list = [...hosts.entries()].map(([h, n]) => `${h} (${n})`);
      issues.push({ code: 'BC014', severity: 'warning', title: RULES.BC014.title, fix: RULES.BC014.fix, width: null, message: `Requests went to ${list.length} other host${list.length === 1 ? '' : 's'}: ${list.slice(0, 6).join(', ')}.` });
    }
    return { product: browser.product, rows, walk, motion, issues };
  } finally {
    await browser.close();
  }
}

export async function runBrowserCheck(options, log = () => {}) {
  const browserPath = options.browser ?? findBrowser();
  if (!browserPath || !fs.existsSync(browserPath)) {
    const error = new Error('No Chrome or Edge was found. Install one, set CHROME_PATH, or use --browser <path>.');
    error.code = 'NO_BROWSER';
    throw error;
  }
  let server = null;
  let url;
  const target = options.target;
  if (/^https?:\/\//i.test(target)) {
    const parsed = new URL(target);
    if (!isLocalHost(parsed.hostname) && !options.allowRemote) {
      const error = new Error(`"${target}" is not on this computer. Add --allow-remote if you want the browser to open it for real.`);
      error.code = 'USAGE';
      throw error;
    }
    url = target;
  } else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    server = await startServer(target);
    url = server.url + (options.page ? options.page.replace(/^[\\/]+/, '').split(path.sep).join('/') : '');
  } else if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    url = pathToFileURL(path.resolve(target)).href;
  } else {
    const error = new Error(`"${target}" is not a folder, a file or an address.`);
    error.code = 'USAGE';
    throw error;
  }
  try {
    const result = await runChecks(options, browserPath, url, log);
    return { ...result, url: server ? '(a local copy of the folder, served on 127.0.0.1)' : url, remote: !server && /^https?:/.test(url) && !isLocalHost(new URL(url).hostname) };
  } finally {
    if (server) await server.close();
  }
}

async function main(argv) {
  const { options, problems } = parseArgs(argv);
  if (options.help || problems.length) {
    const lines = [
      ...problems,
      'Usage: node browser-check.mjs <folder | page.html | http(s)://address> [options]',
      '  --page <file>        page inside the folder (default index.html)',
      '  --widths 320,390     widths in CSS pixels (default 320,390,768,1280,1440)',
      '  --screenshots <dir>  save a full-page screenshot at each width',
      '  --browser <path>     use this Chrome or Edge (or set CHROME_PATH)',
      '  --tab-stops 50       how many Tab presses to try',
      '  --wait 800           milliseconds to let the page settle',
      '  --allow-remote       allow a page that is not on this computer',
      '  --strict             treat warnings as errors',
      '  --json               machine-readable output',
      'Exit codes: 0 passed, 1 errors found, 2 wrong usage, 3 the browser test could not be run.',
    ];
    (options.help && !problems.length ? console.log : console.error)(lines.join('\n'));
    return options.help && !problems.length ? 0 : 2;
  }

  let result;
  try {
    result = await runBrowserCheck(options, options.json ? () => {} : (line) => console.log(line));
  } catch (error) {
    if (error.code === 'USAGE') { console.error(error.message); return 2; }
    console.error(`Browser test: NOT PERFORMED. ${error.message}`);
    return 3;
  }

  const severityOf = (i) => (options.strict && i.severity === 'warning' ? 'error' : i.severity);
  const errors = result.issues.filter((i) => severityOf(i) === 'error').length;
  const warnings = result.issues.length - errors;

  if (options.json) {
    console.log(JSON.stringify({
      tool: 'vyson-browser-check',
      kind: 'browser',
      note: 'One run in one headless browser on this computer, with software graphics, no throttling and emulated touch. Not a real phone, not other browsers, not a screen reader.',
      browser: result.product,
      page: result.url,
      widths: result.rows,
      keyboard: result.walk,
      reducedMotion: result.motion,
      errors,
      warnings,
      issues: result.issues,
    }, null, 2));
    return errors > 0 ? 1 : 0;
  }

  console.log('VYSON browser check (a real-browser test: one headless run on this computer, not a static check)');
  console.log(`Browser: ${result.product}`);
  console.log(`Page: ${result.url}${result.remote ? '  (a page on another website, opened because of --allow-remote)' : ''}\n`);
  console.log('Width   Sideways scroll   Controls (under 44 / under 24)   Broken images   Layout shift   LCP');
  for (const r of result.rows) {
    const touchNote = r.touch ? `${r.controls} (${r.under44} / ${r.under24})` : `${r.controls} (not judged: not a touch width)`;
    console.log(`${String(r.width).padStart(5)}   ${(r.overflowX ? `YES (${r.scrollWidth}px)` : 'no').padEnd(15)}   ${touchNote.padEnd(32)} ${String(r.broken).padEnd(15)} ${typeof r.cls === 'number' ? r.cls.toFixed(3) : 'n/a'}          ${typeof r.lcp === 'number' && r.lcp > 0 ? `${Math.round(r.lcp)} ms` : 'n/a'}`);
  }
  console.log('\n(Layout shift and LCP are lab numbers from one run with no throttling. They are not field data and not a pass or fail on their own.)');
  if (result.walk.done) console.log(`\nKeyboard walk: ${result.walk.stops} Tab stop${result.walk.stops === 1 ? '' : 's'} reached (${result.walk.candidates} element${result.walk.candidates === 1 ? '' : 's'} in the page could take focus; hidden ones cannot be reached).${result.walk.order?.length ? ` First stops: ${result.walk.order.join(' > ')}.` : ''}`);
  if (result.motion.running !== null) console.log(`Reduced motion: ${result.motion.running} looping animation${result.motion.running === 1 ? '' : 's'} running with prefers-reduced-motion: reduce.`);
  console.log('');
  for (const i of result.issues) {
    const label = severityOf(i) === 'error' ? 'FAIL' : 'WARN';
    console.log(`${label}  ${i.code}  ${i.title}${i.width ? `  (at ${i.width}px)` : ''}`);
    console.log(`      ${i.message}`);
    console.log(`      How to fix: ${i.fix}\n`);
  }
  console.log(errors > 0
    ? `RESULT: FAILED. ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`
    : `RESULT: PASSED. 0 errors, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
  console.log('Browser test: one headless run. Not tested: a real phone, Firefox, Safari, a screen reader, a slow network, 200 percent zoom by hand.');
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
