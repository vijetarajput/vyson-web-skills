#!/usr/bin/env node
// measure.mjs: objective measurements for ONE static website, using headless Chrome.
//
// It starts a tiny local web server for the site folder, starts Chrome with no
// window, and drives it through the Chrome DevTools Protocol (CDP). Nothing is
// installed except (optionally) axe-core, which you point to with --axe.
//
// Every number it writes is MEASURED by this script with the same steps for
// every site, so two sites can be compared fairly. It does not judge taste.
// It does not measure real-phone performance: it runs on this computer only.
//
// HARNESS VERSION 3 (after the pilot review). Changes from version 2, which is
// kept in archive/measure-v2.mjs because it produced the first published results:
//   - Hover: every element that has a :hover rule (read from the stylesheets) is
//     hovered with a real mouse move, and its computed style is compared before
//     and after. It reports which rules changed something, which animated, and
//     which declared movement that the browser did not apply (a lost cascade).
//     The old rough sample is still recorded as the "legacy" hover count.
//   - Scripts off: text is classified as transparent, visibility:hidden or
//     collapsed (clipped to no height), at desktop and phone width, and every
//     aria-controls panel is checked for visibility. v2 skipped collapsed text.
//   - Accordion: opens two panels in a row and counts how many stay expanded.
//   - Small targets at 390px are listed by name, not only counted.
//   - The site folder path is no longer written into the result file.
//
// Usage:
//   node measure.mjs <site-folder> --out result.json [--shots <folder>] [--axe <axe.min.js>]
//                    [--lint <motion-lint.mjs>] [--chrome <chrome.exe>] [--runs 3]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// 0. Command line
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[(i += 1)];
    else args._.push(argv[i]);
  }
  return args;
}

function fail(message) {
  console.error(`measure.mjs: ${message}`);
  process.exit(2);
}

const args = parseArgs(process.argv.slice(2));
const siteDir = args._[0] && path.resolve(args._[0]);
if (!siteDir || !fs.existsSync(path.join(siteDir, 'index.html'))) fail('give a site folder that contains index.html.');
if (!args.out) fail('give --out <result.json>.');
const RUNS = Number(args.runs ?? 3);
const CHROME = args.chrome ?? ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
if (!CHROME) fail('Chrome was not found. Pass --chrome <path>.');
const AXE_SOURCE = args.axe ? fs.readFileSync(args.axe, 'utf8') : null;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (list) => { const s = [...list].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const round = (n, d = 2) => (typeof n === 'number' ? Math.round(n * 10 ** d) / 10 ** d : n);

// ---------------------------------------------------------------------------
// 1. Static file server and Chrome
// ---------------------------------------------------------------------------

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };

function startServer() {
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(siteDir, rel);
    if (!file.startsWith(siteDir)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': `${TYPES[path.extname(file)] ?? 'application/octet-stream'}; charset=utf-8` });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function startChrome() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vyson-chrome-'));
  const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i += 1) await wait(100);
  if (!fs.existsSync(portFile)) fail('Chrome did not start (no DevTools port).');
  const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  return {
    port,
    version: version.Browser,
    async stop() {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      child.kill();
      await wait(500);
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    },
  };
}

// ---------------------------------------------------------------------------
// 2. A very small CDP client for one browser tab
// ---------------------------------------------------------------------------

class Tab {
  static async open(port) {
    const info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const tab = new Tab(port, info);
    await new Promise((resolve, reject) => { tab.ws.addEventListener('open', resolve, { once: true }); tab.ws.addEventListener('error', reject, { once: true }); });
    await tab.send('Page.enable');
    await tab.send('Runtime.enable');
    return tab;
  }

  constructor(port, info) {
    this.port = port;
    this.id = info.id;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.consoleErrors = [];
    this.requests = [];
    this.ws = new WebSocket(info.webSocketDebuggerUrl);
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message}`)); else resolve(msg.result);
      } else if (msg.method) {
        this.handleEvent(msg.method, msg.params);
        for (const fn of this.listeners.get(msg.method) ?? []) fn(msg.params);
      }
    });
  }

  handleEvent(method, params) {
    // A missing favicon is browser noise that every plain static site would get, so it is not counted.
    if (JSON.stringify(params ?? {}).includes('favicon.ico')) return;
    if (method === 'Runtime.exceptionThrown') this.consoleErrors.push(params.exceptionDetails?.exception?.description ?? params.exceptionDetails?.text ?? 'exception');
    if (method === 'Runtime.consoleAPICalled' && params.type === 'error') this.consoleErrors.push(params.args.map((a) => a.value ?? a.description).join(' '));
    if (method === 'Log.entryAdded' && params.entry.level === 'error') this.consoleErrors.push(`${params.entry.text} ${params.entry.url ?? ''}`.trim());
    if (method === 'Network.requestWillBeSent') this.requests.push({ id: params.requestId, url: params.request.url, bytes: 0 });
    if (method === 'Network.loadingFinished') { const r = this.requests.find((x) => x.id === params.requestId); if (r) r.bytes = params.encodedDataLength; }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method) {
    return new Promise((resolve) => {
      const list = this.listeners.get(method) ?? [];
      const fn = (p) => { this.listeners.set(method, (this.listeners.get(method) ?? []).filter((x) => x !== fn)); resolve(p); };
      list.push(fn);
      this.listeners.set(method, list);
    });
  }

  /** Run JavaScript in the page and return its value. */
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`page script failed: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }

  async goto(url, { settleMs = 400 } = {}) {
    const loaded = this.once('Page.loadEventFired');
    await this.send('Page.navigate', { url });
    await Promise.race([loaded, wait(15000)]);
    await wait(settleMs);
  }

  async setViewport(width, height, mobile) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await this.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  }

  async key(key, code, vk, text) {
    await this.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text });
    await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  }

  mouseMove(x, y) { return this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }

  async click(x, y) {
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  async close() {
    this.ws.close();
    await fetch(`http://127.0.0.1:${this.port}/json/close/${this.id}`).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 3. Scripts that run INSIDE the page
// ---------------------------------------------------------------------------

// Records every CSS animation, CSS transition and Web Animation it sees, every 30 ms.
const ANIMATION_LOGGER = `
(() => {
  window.__phase = 'load';
  window.__anim = new Map();
  const SKIP = ['offset', 'easing', 'composite', 'computedOffset'];
  const label = (el) => {
    if (!el) return '?';
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls;
  };
  const sample = () => {
    for (const a of document.getAnimations()) {
      const e = a.effect;
      if (!e) continue;
      let props = [];
      // Keyframe property names come back in camelCase (gridTemplateRows). Turn them into CSS names (grid-template-rows).
      const kebab = (k) => (k === 'cssFloat' ? 'float' : k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));
      try { props = [...new Set(e.getKeyframes().flatMap((k) => Object.keys(k)).filter((k) => !SKIP.includes(k)).map(kebab))]; } catch (err) { /* ignore */ }
      const timing = e.getComputedTiming();
      const target = e.target;
      const name = a.animationName || a.transitionProperty || '';
      const key = [a.constructor.name, name, label(target), props.join('+')].join('|');
      if (window.__anim.has(key)) continue;
      const rect = target ? target.getBoundingClientRect() : { top: 0 };
      window.__anim.set(key, {
        kind: a.constructor.name, name, element: label(target), props,
        durationMs: typeof timing.duration === 'number' ? timing.duration : null,
        delayMs: timing.delay, infinite: timing.iterations === Infinity,
        phase: window.__phase, atMs: Math.round(performance.now()), pageY: Math.round(rect.top + window.scrollY),
      });
    }
  };
  window.__sample = sample;
  setInterval(sample, 30);
})();
`;

// Measures layout shift while the page loads and is scrolled, and records frame times.
const FRAME_RECORDER = `
(() => {
  window.__cls = 0; window.__longTasks = 0; window.__frames = []; window.__recording = false;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (err) { /* ignore */ }
  try { new PerformanceObserver((l) => { window.__longTasks += l.getEntries().length; }).observe({ type: 'longtask', buffered: true }); } catch (err) { /* ignore */ }
  let last = 0;
  const tick = (t) => { if (window.__recording && last) window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
`;

// Text elements that are laid out but nearly invisible because of opacity.
const HIDDEN_TEXT_FN = `
(() => {
  const effectiveOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const out = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,a,button,figcaption,dt,dd,summary')) {
    if (!(el.textContent || '').trim()) continue;
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (r.width < 1 || r.height < 1 || cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (effectiveOpacity(el) < 0.5) out.push(el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '') + ': ' + el.textContent.trim().slice(0, 30));
  }
  return out;
})()
`;

// Scroll from top to bottom in steps, then wait.
const scrollThroughScript = (stepFraction = 0.6, intervalMs = 350) => `
(async () => {
  const step = Math.max(200, Math.round(innerHeight * ${stepFraction}));
  const max = () => document.documentElement.scrollHeight - innerHeight;
  for (let y = 0; y <= max() + step; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, ${intervalMs})); }
  await new Promise((r) => setTimeout(r, 1200));
  return max();
})()
`;

const PICK_HOVER_TARGETS = `
(() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const pick = (sel, n, filter = () => true) => [...document.querySelectorAll(sel)].filter((e) => visible(e) && filter(e)).slice(0, n);
  const area = (e) => { const r = e.getBoundingClientRect(); return r.width * r.height; };
  const set = new Set([
    ...pick('header a, nav a', 2),
    ...pick('main a, main button, section a, section button', 3, (e) => !e.closest('nav') && !e.hasAttribute('aria-expanded')),
    ...pick('article, [class*="card" i], [class*="project" i], li', 6, (e) => area(e) > 8000),
    ...pick('[aria-expanded], summary', 2),
  ]);
  window.__hoverEls = [...set].slice(0, 14);
  return window.__hoverEls.length;
})()
`;

// ---------------------------------------------------------------------------
// 4. Measurement scenarios
// ---------------------------------------------------------------------------

// --- v3: the real hover test -------------------------------------------------
// Finds every element that a ":hover" rule can change by reading the stylesheets
// (rules inside media queries that do not match right now are skipped, and counted).
// The element that gets hovered is the part of the selector before ":hover".
const HOVER_RULES_SETUP = `
(() => {
  const MOVE = ['transform', 'translate', 'scale', 'rotate'];
  const rules = [];
  const byElement = new Map();
  let rulesSkippedByMedia = 0;
  const visit = (list) => {
    for (const rule of list) {
      if (rule.cssRules && !rule.selectorText) {
        if (rule.media && !window.matchMedia(rule.media.mediaText).matches) { rulesSkippedByMedia += 1; continue; }
        if (rule.constructor.name === 'CSSSupportsRule' && !CSS.supports(rule.conditionText)) continue;
        visit(rule.cssRules);
        continue;
      }
      if (!rule.selectorText || !rule.selectorText.includes(':hover')) continue;
      const declared = MOVE.filter((p) => { const v = rule.style.getPropertyValue(p); return v && v !== 'none'; });
      for (const selector of rule.selectorText.split(',')) {
        const at = selector.indexOf(':hover');
        if (at < 0) continue;
        const base = selector.slice(0, at).trim();
        if (!base) continue;
        let full = selector.replace(':hover', '').trim();
        let pseudo = '';
        const m = full.match(/::?(before|after)$/);
        if (m) { pseudo = '::' + m[1]; full = full.slice(0, m.index).trim(); }
        let els = [];
        try { els = [...document.querySelectorAll(base)]; } catch (e) { continue; }
        const idx = rules.push({ selector: selector.trim(), base, full, pseudo, declared }) - 1;
        for (const el of els) { if (!byElement.has(el)) byElement.set(el, []); byElement.get(el).push(idx); }
      }
    }
  };
  for (const sheet of document.styleSheets) { try { visit(sheet.cssRules); } catch (e) { /* cross-origin sheet */ } }
  const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  // Up to 2 visible elements per rule, so every rule is tried, then at most 45 elements in all.
  const chosen = new Set();
  rules.forEach((rule, idx) => {
    let n = 0;
    for (const [el, list] of byElement) { if (n >= 2) break; if (list.includes(idx) && visible(el)) { chosen.add(el); n += 1; } }
  });
  window.__hoverRules = rules;
  window.__hoverMap = byElement;
  window.__hoverEls2 = [...chosen].slice(0, 45);
  const PROPS = ['transform', 'translate', 'scale', 'rotate', 'opacity', 'box-shadow', 'background-color', 'color', 'border-color', 'outline-color', 'filter', 'text-decoration-color', 'background-position', 'width', 'height'];
  const readAll = (el) => [el, ...[...el.querySelectorAll('*')].slice(0, 24)].flatMap((e) => ['', '::before', '::after'].map((ps) => { const cs = getComputedStyle(e, ps); return PROPS.map((p) => cs.getPropertyValue(p)); }));
  const moveValues = (el) => (window.__hoverMap.get(el) || []).map((i) => {
    const r = window.__hoverRules[i];
    if (!r.declared.length) return null;
    try {
      const target = el.matches(r.full || '*') ? el : el.querySelector(r.full);
      if (!target) return 'no-target';
      const cs = getComputedStyle(target, r.pseudo || null);
      return r.declared.map((p) => cs.getPropertyValue(p)).join('|');
    } catch (e) { return 'unreadable'; }
  });
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(' ').slice(0, 2).join('.') : '');
  window.__hoverBegin = (i) => {
    const el = window.__hoverEls2[i];
    const h = { el, before: readAll(el), movBefore: moveValues(el), animsBefore: new Set(document.getAnimations()), animated: false };
    h.timer = setInterval(() => { if (document.getAnimations().some((a) => !h.animsBefore.has(a) && a.effect && a.effect.target && el.contains(a.effect.target))) h.animated = true; }, 16);
    window.__h = h;
  };
  window.__hoverEnd = () => {
    const h = window.__h; clearInterval(h.timer);
    const after = readAll(h.el);
    const changed = new Set();
    after.forEach((slot, s) => slot.forEach((v, p) => { if (v !== h.before[s][p]) changed.add(PROPS[p]); }));
    const movAfter = moveValues(h.el);
    const rulesList = window.__hoverMap.get(h.el) || [];
    const lost = [];
    rulesList.forEach((ruleIndex, k) => { if (h.movBefore[k] !== null && h.movBefore[k] === movAfter[k]) lost.push(window.__hoverRules[ruleIndex].selector); });
    return { hovered: h.el.matches(':hover'), changedProps: [...changed], movementChanged: ['transform', 'translate', 'scale', 'rotate'].some((p) => changed.has(p)), animated: h.animated, declaredMovementNotApplied: [...new Set(lost)] };
  };
  window.__hoverLabel = label;
  return { hoverSelectors: rules.length, hoverTargetsInPage: byElement.size, selectedForTest: window.__hoverEls2.length, rulesSkippedByMedia, hoverMediaMatches: matchMedia('(hover: hover)').matches, pointerFineMatches: matchMedia('(pointer: fine)').matches };
})()
`;

// --- v3: text and panels that are hidden or collapsed (used with scripts off) ---
const HIDDEN_V3 = `
(() => {
  const label = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(' ')[0] : '');
  const effectiveOpacity = (el) => { let o = 1; for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  const displayNone = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (getComputedStyle(n).display === 'none') return true; return false; };
  const clippedToNothing = (el) => { for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) { const c = getComputedStyle(n); if ((c.overflow !== 'visible' || c.overflowY !== 'visible') && n.getBoundingClientRect().height < 1) return true; } return false; };
  const parents = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const p = n.parentElement;
    if (!n.nodeValue.trim() || !p || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) continue;
    parents.add(p);
  }
  const out = { textElements: parents.size, transparent: [], visibilityHidden: [], collapsed: [], displayNone: [] };
  for (const el of parents) {
    const text = label(el) + ': ' + el.textContent.trim().slice(0, 28);
    if (displayNone(el)) { out.displayNone.push(text); continue; }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.position === 'absolute' && r.width <= 1 && r.height <= 1) continue; // screen-reader-only text
    if (cs.visibility === 'hidden') { out.visibilityHidden.push(text); continue; }
    if (r.width < 1 || r.height < 1 || clippedToNothing(el)) { out.collapsed.push(text); continue; }
    if (effectiveOpacity(el) < 0.5) out.transparent.push(text);
  }
  const panelVisible = (p) => { if (!p || displayNone(p)) return false; const cs = getComputedStyle(p); const r = p.getBoundingClientRect(); return cs.visibility !== 'hidden' && r.width >= 1 && r.height >= 1 && !clippedToNothing(p) && effectiveOpacity(p) >= 0.5; };
  out.disclosures = [...document.querySelectorAll('[aria-controls]')].map((c) => {
    const cr = c.getBoundingClientRect();
    const controlVisible = cr.width >= 1 && cr.height >= 1 && !displayNone(c);
    const panel = document.getElementById(c.getAttribute('aria-controls'));
    return { control: label(c), controlVisible, panelFound: Boolean(panel), panelVisible: panelVisible(panel) };
  });
  out.unreachablePanels = out.disclosures.filter((d) => d.controlVisible && d.panelFound && !d.panelVisible).map((d) => d.control);
  return out;
})()
`;

// --- v3: accordion test (open two panels in a row, count how many stay expanded) ---
const ACCORDION_FIND = `
(() => {
  const sels = ['[class*="faq" i] [aria-expanded]', '[id*="faq" i] [aria-expanded]', '[class*="accordion" i] [aria-expanded]', 'main [aria-expanded]'];
  let list = [];
  for (const s of sels) {
    list = [...document.querySelectorAll(s)].filter((c) => { const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !c.closest('header, nav'); });
    if (list.length >= 2) break;
  }
  window.__acc = list;
  return list.length;
})()
`;

const SPATIAL = /^(transform|translate|scale|rotate|top|left|right|bottom|inset.*|margin.*|padding.*|width|height|min-.*|max-.*|font-size|line-height|letter-spacing|gap|row-gap|column-gap|flex-basis|grid-template-.*|background-position)$/;
const COMPOSITOR = /^(transform|opacity|translate|scale|rotate)$/;
const LAYOUT = /^(top|left|right|bottom|inset.*|margin.*|padding.*|width|height|min-.*|max-.*|font-size|line-height|letter-spacing|gap|row-gap|column-gap|flex-basis|grid-template-.*|border(-[a-z]+)*-width)$/;

function classifyAnimations(records) {
  const real = records.filter((r) => r.durationMs === null || r.durationMs >= 1); // ignore 0.01 ms "switched off" ones
  const byClass = { compositorOnly: 0, layout: 0, paintOrOther: 0 };
  const layoutProps = new Set();
  const paintProps = new Set();
  for (const r of real) {
    const props = r.props.length ? r.props : [r.name].filter(Boolean);
    if (props.some((p) => LAYOUT.test(p))) { byClass.layout += 1; props.filter((p) => LAYOUT.test(p)).forEach((p) => layoutProps.add(p)); }
    else if (props.length && props.every((p) => COMPOSITOR.test(p))) byClass.compositorOnly += 1;
    else { byClass.paintOrOther += 1; props.filter((p) => !COMPOSITOR.test(p)).forEach((p) => paintProps.add(p)); }
  }
  const longest = real.filter((r) => !r.infinite && r.durationMs).reduce((m, r) => Math.max(m, r.durationMs), 0);
  return {
    totalDistinct: real.length,
    cssAnimations: real.filter((r) => r.kind === 'CSSAnimation').length,
    cssTransitions: real.filter((r) => r.kind === 'CSSTransition').length,
    webAnimations: real.filter((r) => r.kind === 'Animation').length,
    ...byClass,
    layoutProperties: [...layoutProps],
    otherProperties: [...paintProps],
    infiniteAnimations: real.filter((r) => r.infinite).length,
    longestFiniteMs: round(longest, 0),
  };
}

/** Walk through the page the way a visitor would: load, scroll, hover, click. Records all animation. */
async function behaviourPass(tab, url, { reduced }) {
  if (reduced) await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: ANIMATION_LOGGER });
  await tab.send('Network.enable');
  await tab.send('Log.enable');
  await tab.goto(url, { settleMs: 1800 });

  await tab.eval("window.__phase = 'scroll'");
  const scrollable = await tab.eval(scrollThroughScript());
  const hiddenAfterScroll = await tab.eval(HIDDEN_TEXT_FN);

  await tab.eval("window.scrollTo(0, 0); window.__phase = 'hover'");
  await wait(300);
  const count = await tab.eval(PICK_HOVER_TARGETS);
  for (let i = 0; i < count; i += 1) {
    const [x, y] = await tab.eval(`(() => { const e = window.__hoverEls[${i}]; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    await wait(120);
    await tab.mouseMove(x, y);
    await wait(380);
    await tab.mouseMove(2, 2);
    await wait(120);
  }

  // The FAQ-style toggle: click it with the mouse and watch how the page changes.
  await tab.eval("window.__phase = 'click'");
  const faq = await faqClickTest(tab);

  await tab.eval('window.__sample()');
  const records = await tab.eval('JSON.stringify([...window.__anim.values()])').then(JSON.parse);
  const running = await tab.eval(`JSON.stringify(document.getAnimations().filter((a) => a.playState === 'running').map((a) => ({ infinite: a.effect.getComputedTiming().iterations === Infinity, duration: a.effect.getComputedTiming().duration })))`).then(JSON.parse);
  const scrollBehavior = await tab.eval('getComputedStyle(document.documentElement).scrollBehavior');
  const requests = tab.requests.filter((r) => r.url.startsWith('http'));
  const external = requests.filter((r) => !r.url.startsWith(`http://127.0.0.1`));

  const firstScreenLimit = 800;
  const pairs = (list) => new Set(list.map((r) => r.element)).size;
  const loadPhase = records.filter((r) => r.phase === 'load' && (r.durationMs === null || r.durationMs >= 1));
  const scrollPhase = records.filter((r) => r.phase === 'scroll' && r.pageY >= firstScreenLimit - 200 && (r.durationMs === null || r.durationMs >= 1));
  const hoverPhase = records.filter((r) => r.phase === 'hover' && (r.durationMs === null || r.durationMs >= 1));

  return {
    scrollableHeightPx: scrollable,
    behaviour: {
      heroEntranceElements: pairs(loadPhase.filter((r) => r.pageY < firstScreenLimit)),
      scrollRevealElements: pairs(scrollPhase),
      hoverFeedbackElements: pairs(hoverPhase),
      faq,
    },
    animations: classifyAnimations(records),
    spatialMovementAnimations: records.filter((r) => (r.durationMs === null || r.durationMs >= 1) && r.props.some((p) => SPATIAL.test(p))).length,
    runningAtEnd: { total: running.length, infinite: running.filter((r) => r.infinite).length },
    hiddenTextAfterScrollThrough: hiddenAfterScroll,
    scrollBehavior,
    consoleErrors: tab.consoleErrors,
    network: { requests: requests.length, externalRequests: external.length, externalUrls: external.map((r) => r.url).slice(0, 5), transferredBytes: requests.reduce((s, r) => s + r.bytes, 0) },
    sampleRecords: records.slice(0, 40),
  };
}

async function faqClickTest(tab) {
  const found = await tab.eval(`(() => {
    const el = ((() => { const sels = ['[class*=\"faq\" i] [aria-expanded]', '[id*=\"faq\" i] [aria-expanded]', '[class*=\"faq\" i] button', '[id*=\"faq\" i] button', '[class*=\"accordion\" i] button', 'summary', 'main [aria-expanded]', '[aria-expanded]']; for (const s of sels) { for (const c of document.querySelectorAll(s)) { const r = c.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && !c.closest('header, nav')) return c; } } return null; })());
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    window.__faq = el;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: el.tagName.toLowerCase(), hasAriaExpanded: el.hasAttribute('aria-expanded') };
  })()`);
  if (!found) return { toggleFound: false };
  // Let any scroll-reveal finish moving the element, then measure its position again.
  await wait(1600);
  const settled = await tab.eval(`(() => { const r = window.__faq.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  found.x = settled.x; found.y = settled.y;
  const panelHeight = `(() => { const el = window.__faq; const id = el.getAttribute('aria-controls'); const p = (id && document.getElementById(id)) || el.nextElementSibling || el.parentElement; return Math.round(p.getBoundingClientRect().height * 10) / 10 + '|' + document.documentElement.scrollHeight; })()`;
  const stateNow = `(() => { const el = window.__faq; return el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') : String(!!(el.parentElement && el.parentElement.open)); })()`;
  await wait(300);
  const before = { state: await tab.eval(stateNow), size: await tab.eval(panelHeight) };
  await tab.click(found.x, found.y);
  const samples = [];
  for (let i = 0; i < 30; i += 1) { samples.push(await tab.eval(panelHeight)); await wait(30); }
  const heights = samples.map((s) => Number(s.split('|')[0]));
  const distinct = [...new Set(heights.map((h) => Math.round(h)))];
  const min = Math.min(...heights);
  const max = Math.max(...heights);
  const intermediate = distinct.filter((h) => h > min + 1 && h < max - 1).length;
  const after = { state: await tab.eval(stateNow), size: await tab.eval(panelHeight) };
  const [sizeBefore, sizeAfter] = [before.size.split('|')[0], after.size.split('|')[0]];
  return {
    toggleFound: true, element: found.tag, hasAriaExpanded: found.hasAriaExpanded,
    stateBefore: before.state, stateAfter: after.state, stateChangedByMouse: before.state !== after.state,
    panelHeightBefore: Number(sizeBefore), panelHeightAfter: Number(sizeAfter),
    toggledByMouse: before.state !== after.state || Math.abs(Number(sizeAfter) - Number(sizeBefore)) > 1,
    intermediateHeightsSeen: intermediate,
    animatedOpen: intermediate >= 2,
  };
}

/**
 * Scripts switched off, at desktop and at phone width.
 * v3 classifies hidden text as transparent, visibility:hidden or collapsed, lists
 * panels named by aria-controls that cannot be seen, and keeps the v2 fields.
 */
async function noScriptPass(tab, url) {
  await tab.send('Emulation.setScriptExecutionDisabled', { value: true });
  const widths = {};
  for (const [name, width, mobile] of [['desktop1280', 1280, false], ['phone390', 390, true]]) {
    await tab.setViewport(width, 800, mobile);
    await tab.goto(url, { settleMs: 1000 });
    widths[name] = {
      ...(await tab.eval(HIDDEN_V3)),
      visibleTextCharacters: await tab.eval('document.body.innerText.length'),
    };
  }
  await tab.setViewport(1280, 800, false);
  await tab.goto(url, { settleMs: 800 });
  const legacyHidden = await tab.eval(HIDDEN_TEXT_FN);
  await tab.send('Emulation.setScriptExecutionDisabled', { value: false });
  const unreadable = (w) => w.transparent.length + w.visibilityHidden.length + w.collapsed.length;
  return {
    hiddenTextElements: legacyHidden, // the v2 measure: laid-out but transparent text
    visibleTextCharacters: widths.desktop1280.visibleTextCharacters,
    v3: {
      ...widths,
      unreadableTextElementsDesktop: unreadable(widths.desktop1280),
      unreadableTextElementsPhone: unreadable(widths.phone390),
      unreachablePanelsDesktop: widths.desktop1280.unreachablePanels,
      unreachablePanelsPhone: widths.phone390.unreachablePanels,
      note: 'Text that is display:none is listed separately because it can be legitimate (for example content for another breakpoint). Panels are only counted when their control is visible and the panel cannot be seen.',
    },
  };
}

/** v3: hover every element that a :hover rule can change, with a real mouse move, and compare computed styles. */
async function hoverRulesTest(tab, url) {
  await tab.goto(url, { settleMs: 1800 });
  await tab.eval(scrollThroughScript(0.7, 200));
  await tab.eval('window.scrollTo(0, 0)');
  await wait(300);
  const setup = await tab.eval(HOVER_RULES_SETUP);
  const details = [];
  for (let i = 0; i < setup.selectedForTest; i += 1) {
    await tab.eval(`window.__hoverEls2[${i}].scrollIntoView({ block: 'center' })`);
    await wait(350);
    const spot = await tab.eval(`(() => { const e = window.__hoverEls2[${i}]; const r = e.getBoundingClientRect(); const x = r.x + r.width / 2; const y = r.y + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, label: window.__hoverLabel(e), reachable: Boolean(top && (e === top || e.contains(top) || top.contains(e))) }; })()`);
    if (!spot.reachable) { details.push({ label: spot.label, skipped: 'covered by another element' }); continue; }
    await tab.mouseMove(2, 2);
    await wait(60);
    await tab.eval(`window.__hoverBegin(${i})`);
    await tab.mouseMove(spot.x, spot.y);
    await wait(700);
    details.push({ label: spot.label, ...(await tab.eval('window.__hoverEnd()')) });
    await tab.mouseMove(2, 2);
    await wait(80);
  }
  const tested = details.filter((d) => !d.skipped && d.hovered);
  return {
    ...setup,
    tested: tested.length,
    skippedCovered: details.filter((d) => d.skipped).length,
    notHovered: details.filter((d) => !d.skipped && !d.hovered).length,
    changedVisibly: tested.filter((d) => d.changedProps.length > 0).length,
    animated: tested.filter((d) => d.animated).length,
    movementApplied: tested.filter((d) => d.movementChanged).length,
    declaredMovementNotApplied: [...new Set(tested.flatMap((d) => d.declaredMovementNotApplied))],
    noVisibleChange: tested.filter((d) => d.changedProps.length === 0).map((d) => d.label),
    note: 'Elements are chosen from the :hover rules in the stylesheets (up to 2 per rule, 45 in all). Computed styles of the element, its first 24 descendants and their ::before/::after are compared before and after a real mouse move. Rules inside media queries that do not match in headless Chrome are skipped and counted in rulesSkippedByMedia.',
    details,
  };
}

/** v3: open two accordion panels in a row and count how many are expanded. */
async function accordionTest(tab, url) {
  await tab.goto(url, { settleMs: 1800 });
  await tab.eval(scrollThroughScript(0.7, 200));
  const count = await tab.eval(ACCORDION_FIND);
  if (count < 2) return { controlsFound: count, note: 'fewer than two expandable controls were found, so the test did not run' };
  const states = () => tab.eval('window.__acc.map((c) => c.getAttribute("aria-expanded") === "true")');
  const press = async (i) => {
    await tab.eval(`window.__acc[${i}].scrollIntoView({ block: 'center' })`);
    await wait(900);
    const [x, y] = await tab.eval(`(() => { const r = window.__acc[${i}].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
    await tab.click(x, y);
    await wait(700);
  };
  const initial = await states();
  if (!initial[0]) await press(0); // make sure the first one is open
  const afterFirst = await states();
  await press(1);
  const afterSecond = await states();
  await press(1);
  const afterSecondAgain = await states();
  const open = (s) => s.filter(Boolean).length;
  return {
    controlsFound: count,
    initialOpen: open(initial),
    openAfterOpeningFirst: open(afterFirst),
    openAfterOpeningSecond: open(afterSecond),
    openAfterPressingSecondAgain: open(afterSecondAgain),
    onlyOneOpenAfterOpeningTwo: open(afterSecond) === 1,
    note: 'Presses panel 1 (if closed), then panel 2, then panel 2 again, with real mouse clicks. "Only one open" is true when exactly one panel is expanded after panel 2 was opened.',
  };
}

async function responsivePass(tab, url) {
  const widths = [320, 360, 390, 768, 1024, 1280, 1920];
  const out = [];
  for (const width of widths) {
    await tab.setViewport(width, width <= 768 ? 800 : 900, width <= 768);
    await tab.goto(url, { settleMs: 800 });
    const atLoad = await tab.eval('document.documentElement.scrollWidth - innerWidth');
    await tab.eval(scrollThroughScript(0.7, 150));
    const detail = await tab.eval(`(() => {
      const vw = innerWidth;
      const wide = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; });
      const inter = [...document.querySelectorAll('a[href], button, summary, input, select, textarea, [role=button]')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; });
      const small = (n) => inter.filter((e) => { const r = e.getBoundingClientRect(); return r.width < n || r.height < n; }).length;
      return {
        overflowAfterScroll: document.documentElement.scrollWidth - vw,
        wideElements: wide.slice(0, 4).map((e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\\s+/)[0] : '')),
        interactiveCount: inter.length, smallerThan24px: small(24), smallerThan44px: small(44),
        smallerThan44List: inter.filter((e) => { const r = e.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).slice(0, 14).map((e) => { const r = e.getBoundingClientRect(); return e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(' ')[0] : '') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ': ' + (e.textContent || '').trim().slice(0, 18); }),
        bodyFontPx: parseFloat(getComputedStyle(document.body).fontSize),
        smallestTextPx: Math.min(...[...document.querySelectorAll('p, li, a, button, span')].filter((e) => (e.textContent || '').trim() && e.getBoundingClientRect().width > 0).map((e) => parseFloat(getComputedStyle(e).fontSize))),
      };
    })()`);
    out.push({ width, overflowAtLoadPx: atLoad, ...detail });
  }
  const meta = await tab.eval("(document.querySelector('meta[name=viewport]') || {}).content || null");
  await tab.send('Emulation.clearDeviceMetricsOverride');
  await tab.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  return { viewportMeta: meta, widths: out, widthsWithHorizontalScroll: out.filter((w) => w.overflowAfterScroll > 1 || w.overflowAtLoadPx > 1).map((w) => w.width) };
}

async function accessibilityPass(tab, url) {
  await tab.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const result = {};
  for (const [label, width, mobile] of [['desktop1280', 1280, false], ['phone390', 390, true]]) {
    await tab.setViewport(width, 850, mobile);
    await tab.goto(url, { settleMs: 800 });
    await tab.eval(scrollThroughScript(0.7, 200));
    await tab.eval('window.scrollTo(0, 0)');
    await wait(600);
    if (AXE_SOURCE) {
      await tab.eval(AXE_SOURCE);
      const axe = await tab.eval(`axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }).then((r) => JSON.stringify({
        version: axe.version,
        violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })),
        incomplete: r.incomplete.map((v) => v.id), passes: r.passes.length }))`).then(JSON.parse);
      const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
      for (const v of axe.violations) counts[v.impact] += v.nodes;
      result[label] = { axeVersion: axe.version, violationRules: axe.violations.length, violatingNodesByImpact: counts, violations: axe.violations, incompleteRules: axe.incomplete, passedRules: axe.passes };
    }
  }

  await tab.setViewport(1280, 850, false);
  await tab.goto(url, { settleMs: 800 });
  result.structure = await tab.eval(`(() => {
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1]));
    let skips = 0; for (let i = 1; i < headings.length; i += 1) if (headings[i] - headings[i - 1] > 1) skips += 1;
    const expanders = [...document.querySelectorAll('[aria-expanded]')];
    return {
      htmlLang: document.documentElement.lang || null, title: document.title || null,
      h1Count: headings.filter((h) => h === 1).length, headingLevelSkips: skips,
      landmarks: { header: document.querySelectorAll('header, [role=banner]').length, nav: document.querySelectorAll('nav, [role=navigation]').length, main: document.querySelectorAll('main, [role=main]').length, footer: document.querySelectorAll('footer, [role=contentinfo]').length },
      imagesWithoutAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
      ariaExpandedControls: expanders.length,
      ariaExpandedWithValidAriaControls: expanders.filter((e) => e.getAttribute('aria-controls') && document.getElementById(e.getAttribute('aria-controls'))).length,
      detailsElements: document.querySelectorAll('details').length,
      skipLinkPresent: !!document.querySelector('a[href^="#"]:first-of-type') && /skip/i.test((document.querySelector('a') || {}).textContent || ''),
    };
  })()`);

  // Keyboard: press Tab repeatedly and look at where focus goes.
  await tab.eval("document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0);");
  const stops = [];
  for (let i = 0; i < 60; i += 1) {
    await tab.key('Tab', 'Tab', 9);
    await wait(40);
    const stop = await tab.eval(`(() => {
      const el = document.activeElement; if (!el || el === document.body) return null;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow !== 'none';
      let clipped = r.width < 1 || r.height < 1;
      for (let n = el.parentElement; n && !clipped; n = n.parentElement) { const s = getComputedStyle(n); if (s.overflow !== 'visible' && n.getBoundingClientRect().height < 1) clipped = true; if (s.visibility === 'hidden') clipped = true; }
      return { id: el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 24), outlineOrShadow: outline || shadow, notVisible: clipped };
    })()`);
    if (!stop) break;
    if (stops.length && stops[0].id === stop.id) break; // came back around
    stops.push(stop);
  }
  result.keyboard = {
    tabStops: stops.length,
    stopsWithoutOutlineOrShadow: stops.filter((s) => !s.outlineOrShadow).length,
    stopsFocusedButNotVisible: stops.filter((s) => s.notVisible).length,
    firstStop: stops[0]?.id ?? null,
    note: 'Focus indicator check looks for an outline or box-shadow only, so a colour-only focus style is counted as missing.',
  };

  // Can the FAQ toggle be used from the keyboard?
  await tab.eval("window.scrollTo(0, 0)");
  result.keyboardToggle = await tab.eval(`(async () => {
    const el = ((() => { const sels = ['[class*=\"faq\" i] [aria-expanded]', '[id*=\"faq\" i] [aria-expanded]', '[class*=\"faq\" i] button', '[id*=\"faq\" i] button', '[class*=\"accordion\" i] button', 'summary', 'main [aria-expanded]', '[aria-expanded]']; for (const s of sels) { for (const c of document.querySelectorAll(s)) { const r = c.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && !c.closest('header, nav')) return c; } } return null; })());
    if (!el) return { toggleFound: false };
    el.scrollIntoView({ block: 'center' }); el.focus();
    window.__kbToggle = el;
    const id = el.getAttribute('aria-controls'); const p = (id && document.getElementById(id)) || el.nextElementSibling || el.parentElement;
    const state = el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') : String(!!(el.parentElement && el.parentElement.open));
    return { toggleFound: true, before: state + '|' + Math.round(p.getBoundingClientRect().height), tag: el.tagName.toLowerCase() };
  })()`);
  if (result.keyboardToggle.toggleFound) {
    await wait(1600);
    await tab.eval(`(() => { window.__kbToggle.focus(); })()`);
    result.keyboardToggle.before = await tab.eval(`(() => { const el = window.__kbToggle; const id = el.getAttribute('aria-controls'); const p = (id && document.getElementById(id)) || el.nextElementSibling || el.parentElement;
      const state = el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') : String(!!(el.parentElement && el.parentElement.open));
      return state + '|' + Math.round(p.getBoundingClientRect().height); })()`);
    result.keyboardToggle.focusedBeforeKey = await tab.eval(`document.activeElement === window.__kbToggle`);
    await tab.key('Enter', 'Enter', 13, '\r');
    await wait(700);
    const after = await tab.eval(`(() => { const el = window.__kbToggle; const id = el.getAttribute('aria-controls'); const p = (id && document.getElementById(id)) || el.nextElementSibling || el.parentElement;
      const state = el.hasAttribute('aria-expanded') ? el.getAttribute('aria-expanded') : String(!!(el.parentElement && el.parentElement.open));
      return state + '|' + Math.round(p.getBoundingClientRect().height); })()`);
    result.keyboardToggle.after = after;
    result.keyboardToggle.changedByEnterKey = after !== result.keyboardToggle.before;
  }
  await tab.send('Emulation.clearDeviceMetricsOverride');
  return result;
}

async function performancePass(browser, url, { mobile, cpuSlowdown }) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    const tab = await Tab.open(browser.port);
    await tab.setViewport(mobile ? 390 : 1280, mobile ? 800 : 800, mobile);
    if (cpuSlowdown > 1) await tab.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
    await tab.send('Page.addScriptToEvaluateOnNewDocument', { source: FRAME_RECORDER });
    await tab.send('Performance.enable');
    await tab.goto(url, { settleMs: 1800 });
    const before = Object.fromEntries((await tab.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    await tab.eval('window.__recording = true; window.__frames.length = 0;');
    await tab.eval(`(async () => { const max = document.documentElement.scrollHeight - innerHeight; for (let y = 0; y <= max; y += 60) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } await new Promise((r) => setTimeout(r, 600)); })()`);
    await tab.eval('window.__recording = false');
    const after = Object.fromEntries((await tab.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const frames = await tab.eval('JSON.stringify(window.__frames)').then(JSON.parse);
    const cls = await tab.eval('window.__cls');
    const longTasks = await tab.eval('window.__longTasks');
    const sorted = [...frames].sort((a, b) => a - b);
    const delta = (name) => after[name] - before[name];
    runs.push({
      frames: frames.length,
      meanFrameMs: round(frames.reduce((s, f) => s + f, 0) / Math.max(1, frames.length)),
      p95FrameMs: round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
      maxFrameMs: round(sorted[sorted.length - 1] ?? 0),
      framesOver33ms: frames.filter((f) => f > 33).length,
      layoutCountDuringScroll: delta('LayoutCount'),
      styleRecalcCountDuringScroll: delta('RecalcStyleCount'),
      layoutMs: round(delta('LayoutDuration') * 1000),
      styleRecalcMs: round(delta('RecalcStyleDuration') * 1000),
      scriptMs: round(delta('ScriptDuration') * 1000),
      taskMs: round(delta('TaskDuration') * 1000),
      layoutShiftScore: round(cls, 4),
      longTasks,
    });
    await tab.close();
  }
  const keys = Object.keys(runs[0]);
  return { setup: { mobile, cpuSlowdown, runs: RUNS }, runs, median: Object.fromEntries(keys.map((k) => [k, round(median(runs.map((r) => r[k])), 4)])) };
}

async function screenshots(browser, url, dir) {
  if (!dir) return [];
  fs.mkdirSync(dir, { recursive: true });
  const saved = [];
  const shots = [
    { name: 'desktop-1280-full.png', width: 1280, height: 900, mobile: false, reduced: false, scroll: true },
    { name: 'phone-390-full.png', width: 390, height: 844, mobile: true, reduced: false, scroll: true },
    { name: 'desktop-1280-reduced-motion-no-scroll.png', width: 1280, height: 900, mobile: false, reduced: true, scroll: false },
    { name: 'desktop-1280-motion-first-screen-no-wait.png', width: 1280, height: 900, mobile: false, reduced: false, scroll: false },
  ];
  for (const s of shots) {
    const tab = await Tab.open(browser.port);
    await tab.setViewport(s.width, s.height, s.mobile);
    if (s.reduced) await tab.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await tab.goto(url, { settleMs: s.name.includes('no-wait') ? 100 : 1500 });
    if (s.scroll) { await tab.eval(scrollThroughScript(0.7, 200)); await tab.eval('window.scrollTo(0, 0)'); await wait(500); }
    const height = await tab.eval('document.documentElement.scrollHeight');
    const shot = await tab.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: s.width, height: Math.min(height, 6000), scale: 1 } });
    fs.writeFileSync(path.join(dir, s.name), Buffer.from(shot.data, 'base64'));
    saved.push(s.name);
    await tab.close();
  }
  return saved;
}

// ---------------------------------------------------------------------------
// 5. Static code measurements (no browser needed)
// ---------------------------------------------------------------------------

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out.sort();
}

function staticMetrics(dir) {
  const files = listFiles(dir);
  const bytesBy = { html: 0, css: 0, js: 0, other: 0 };
  const sources = { html: '', css: '', js: '' };
  let lines = 0;
  for (const rel of files) {
    const full = path.join(dir, rel);
    const size = fs.statSync(full).size;
    const ext = path.extname(rel).slice(1).toLowerCase();
    const kind = ext === 'html' || ext === 'htm' ? 'html' : ext === 'css' ? 'css' : ext === 'js' || ext === 'mjs' ? 'js' : 'other';
    bytesBy[kind] += size;
    if (kind !== 'other') { const text = fs.readFileSync(full, 'utf8'); sources[kind] += `\n${text}`; lines += text.split('\n').length; }
  }
  const all = `${sources.html}\n${sources.css}\n${sources.js}`;
  const count = (re, text = all) => (text.match(re) ?? []).length;
  return {
    files,
    bytes: bytesBy,
    codeLines: lines,
    transitionAll: count(/transition(-property)?\s*:[^;}]*\ball\b/gi, `${sources.css}\n${sources.html}`),
    importantDeclarations: count(/!important/g, `${sources.css}\n${sources.html}`),
    willChangeDeclarations: count(/will-change\s*:/gi, `${sources.css}\n${sources.html}`),
    keyframesBlocks: count(/@keyframes/g, `${sources.css}\n${sources.html}`),
    reducedMotionMentions: count(/prefers-reduced-motion/gi),
    reducedMotionNoPreferenceBlocks: count(/prefers-reduced-motion\s*:\s*no-preference/gi),
    reducedMotionReduceBlocks: count(/prefers-reduced-motion\s*:\s*reduce/gi),
    hoverMediaQueries: count(/\(\s*hover\s*:\s*hover\s*\)/gi),
    intersectionObserverUses: count(/IntersectionObserver/g),
    scrollEventListeners: count(/addEventListener\(\s*['"]scroll['"]/g, sources.js + sources.html),
    requestAnimationFrameUses: count(/requestAnimationFrame/g, sources.js + sources.html),
    inlineStyleAttributes: count(/\sstyle\s*=\s*["']/g, sources.html),
    externalReferences: count(/(?:src|href)\s*=\s*["']https?:\/\/|url\(\s*["']?https?:|@import\s+url\(\s*["']?https?:/gi),
    animationLibraryMentions: count(/\b(gsap|anime\.js|framer-motion|lottie|scrollreveal|aos\.init|locomotive|lenis)\b/gi),
  };
}

function runLint(lintPath, dir) {
  if (!lintPath) return null;
  const r = spawnSync(process.execPath, [lintPath, dir, '--json'], { encoding: 'utf8' });
  try {
    const data = JSON.parse(r.stdout);
    return { note: 'Uses the rules shipped with the skill, so it is NOT independent of the skill.', errors: data.errors, warnings: data.warnings, codes: data.issues.map((i) => `${i.code}@${path.basename(i.file)}:${i.line}`) };
  } catch {
    return { error: (r.stderr || r.stdout || 'lint failed').slice(0, 300) };
  }
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browser = await startChrome();
const result = { meta: { tool: 'vyson measure.mjs', harnessVersion: 3, measuredAt: new Date().toISOString(), site: '(folder path not recorded)', browser: browser.version, node: process.version, platform: `${os.platform()} ${os.release()}`, perfRunsPerSetting: RUNS, axe: Boolean(AXE_SOURCE) } };

async function scenario(name, fn) {
  if (args.only && !args.only.split(',').includes(name)) return; // --only hoverRules,accordion,...
  const started = Date.now();
  try {
    result[name] = await fn();
  } catch (error) {
    result[name] = { error: error.message };
    console.error(`  ${name}: FAILED (${error.message})`);
  }
  console.log(`  ${name}: done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

try {
  console.log(`Measuring ${siteDir}`);
  result.static = staticMetrics(siteDir);
  result.skillLint = runLint(args.lint, siteDir);
  await scenario('motionAllowed', async () => { const t = await Tab.open(browser.port); await t.setViewport(1280, 800, false); const r = await behaviourPass(t, url, { reduced: false }); await t.close(); return r; });
  await scenario('reducedMotion', async () => { const t = await Tab.open(browser.port); await t.setViewport(1280, 800, false); const r = await behaviourPass(t, url, { reduced: true }); await t.close(); return r; });
  await scenario('hoverRules', async () => { const t = await Tab.open(browser.port); await t.setViewport(1280, 800, false); const r = await hoverRulesTest(t, url); await t.close(); return r; });
  await scenario('accordion', async () => { const t = await Tab.open(browser.port); await t.setViewport(1280, 800, false); const r = await accordionTest(t, url); await t.close(); return r; });
  await scenario('scriptsDisabled', async () => { const t = await Tab.open(browser.port); await t.setViewport(1280, 800, false); const r = await noScriptPass(t, url); await t.close(); return r; });
  await scenario('responsive', async () => { const t = await Tab.open(browser.port); const r = await responsivePass(t, url); await t.close(); return r; });
  await scenario('accessibility', async () => { const t = await Tab.open(browser.port); const r = await accessibilityPass(t, url); await t.close(); return r; });
  await scenario('performanceDesktop', () => performancePass(browser, url, { mobile: false, cpuSlowdown: 1 }));
  await scenario('performancePhoneCpu4x', () => performancePass(browser, url, { mobile: true, cpuSlowdown: 4 }));
  await scenario('screenshots', async () => ({ files: await screenshots(browser, url, args.shots) }));
} finally {
  await browser.stop();
  server.close();
}

fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${args.out}`);
process.exit(0);
