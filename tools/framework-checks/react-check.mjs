// Checks for the React hook in skills/vyson-frontend-development/assets. Run through run.mjs, which supplies the packages.
import assert from 'node:assert/strict';
import React, { createElement as h } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useFetchState } from './use-fetch-state.react.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = [];
globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
  const call = { url, aborted: false }; calls.push(call);
  signal.addEventListener('abort', () => { call.aborted = true; reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
  setTimeout(() => {
    if (url.includes('500')) return resolve({ ok: false, status: 500, statusText: 'x' });
    if (url.includes('empty')) return resolve({ ok: true, status: 200, json: async () => [] });
    resolve({ ok: true, status: 200, json: async () => ({ from: url }) });
  }, url.includes('slow') ? 80 : 5);
});

let last;
function Probe({ url }) { last = useFetchState(url); return h('p', null, last.status); }
const wait = (ms) => act(async () => { await sleep(ms); });
const mount = (url, strict = false) => { let r; act(() => { r = TestRenderer.create(strict ? h(React.StrictMode, null, h(Probe, { url })) : h(Probe, { url })); }); return r; };

let r = mount('/ok'); assert.equal(last.status, 'loading'); await wait(40);
assert.equal(last.status, 'success'); assert.deepEqual(last.data, { from: '/ok' }); act(() => r.unmount());

r = mount('/empty'); await wait(40); assert.equal(last.status, 'empty'); act(() => r.unmount());

r = mount('/500'); await wait(40); assert.equal(last.status, 'error'); assert.match(last.message, /server had a problem/);
act(() => last.reload()); assert.equal(last.status, 'loading'); await wait(40); assert.equal(last.status, 'error'); act(() => r.unmount());

// stale answer: change the address while the first is slow
r = mount('/slow-a'); await wait(5);
act(() => r.update(h(Probe, { url: '/fast-b' })));
assert.equal(last.status, 'loading', 'new address reads as loading at once, never old data');
await wait(150);
assert.deepEqual(last.data, { from: '/fast-b' }); assert.equal(calls.find((c) => c.url === '/slow-a').aborted, true); act(() => r.unmount());

// unmount cancels
const before = calls.length; r = mount('/slow-c'); await wait(5); act(() => r.unmount()); await wait(120);
assert.equal(calls[before].aborted, true);

// Strict Mode (effects run twice): ends in success, with one live answer
r = mount('/ok-strict', true); await wait(60); assert.equal(last.status, 'success'); act(() => r.unmount());

// no address
const n = calls.length; r = mount(null); await wait(10); assert.equal(last.status, 'idle'); assert.equal(calls.length, n); act(() => r.unmount());
console.log('react hook: 8 checks passed');
