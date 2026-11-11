// Checks for the Vue composable in skills/vyson-frontend-development/assets. Run through run.mjs, which supplies the packages.
import assert from 'node:assert/strict';
import { effectScope, nextTick, ref } from 'vue';
import { useFetchState } from './use-fetch-state.vue.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const calls = [];
globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
  calls.push({ url, aborted: false });
  const call = calls[calls.length - 1];
  signal.addEventListener('abort', () => { call.aborted = true; reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
  const delay = url.includes('slow') ? 80 : 5;
  setTimeout(() => {
    if (url.includes('500')) return resolve({ ok: false, status: 500, statusText: 'x' });
    if (url.includes('empty')) return resolve({ ok: true, status: 200, json: async () => [] });
    resolve({ ok: true, status: 200, json: async () => ({ from: url }) });
  }, delay);
});

// 1. loading -> success
let scope = effectScope(); let api = scope.run(() => useFetchState('/ok'));
assert.equal(api.status.value, 'loading'); await sleep(30);
assert.equal(api.status.value, 'success'); assert.deepEqual(api.data.value, { from: '/ok' }); scope.stop();

// 2. empty
scope = effectScope(); api = scope.run(() => useFetchState('/empty')); await sleep(30);
assert.equal(api.status.value, 'empty'); scope.stop();

// 3. error + polite message + reload
scope = effectScope(); api = scope.run(() => useFetchState('/500')); await sleep(30);
assert.equal(api.status.value, 'error'); assert.match(api.message.value, /server had a problem/); assert.doesNotMatch(api.message.value, /HTTP 500/);
api.reload(); assert.equal(api.status.value, 'loading'); await sleep(30); assert.equal(api.status.value, 'error'); scope.stop();

// 4. a slow old answer never overwrites a newer one
const url = ref('/slow-a'); scope = effectScope(); api = scope.run(() => useFetchState(url));
await nextTick(); url.value = '/fast-b'; await sleep(150);
assert.deepEqual(api.data.value, { from: '/fast-b' }); assert.equal(api.status.value, 'success');
assert.equal(calls.find((c) => c.url === '/slow-a').aborted, true, 'old request was cancelled'); scope.stop();

// 5. stopping the scope cancels the request in flight
const before = calls.length; scope = effectScope(); api = scope.run(() => useFetchState('/slow-c')); await nextTick(); scope.stop(); await sleep(120);
assert.equal(calls[before].aborted, true); assert.equal(api.status.value, 'loading', 'no state change after dispose');

// 6. no address -> idle, no request
const n = calls.length; scope = effectScope(); api = scope.run(() => useFetchState(() => null)); await sleep(10);
assert.equal(api.status.value, 'idle'); assert.equal(calls.length, n); scope.stop();
console.log('vue composable: 6 checks passed');
