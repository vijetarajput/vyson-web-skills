// use-fetch-state.vue.js: a Vue 3 composable for loading JSON with every state.
//
// Copy it next to fetch-state.js and import it in a component (Vue 3.3 or newer,
// because it uses toValue):
//
//   <script setup>
//   import { useFetchState } from './use-fetch-state.vue.js';
//   const { status, data, message, reload } = useFetchState('/api/workshops.json');
//   </script>
//
// status is one of: 'idle' (no address yet), 'loading', 'success', 'empty', 'error'.
// Show a region for each one in the template, with role="status" for loading and
// role="alert" for the error (see references/frameworks.md).
//
// The first argument can be a string, a ref or a getter. When it changes, the old
// request is cancelled and its answer is ignored. The request is also cancelled
// when the component goes away. In Nuxt, call it from client-only code, or use
// Nuxt's own data fetching on the server.

import { computed, onScopeDispose, shallowRef, toValue, watch } from 'vue';
import { createLatest, describeError, fetchJson } from './fetch-state.js';

const emptyArray = (data) => Array.isArray(data) && data.length === 0;

export function useFetchState(source, options = {}) {
  const { isEmpty = emptyArray, ...fetchOptions } = options;
  const status = shallowRef('idle');
  const data = shallowRef(null);
  const error = shallowRef(null);
  const message = computed(() => (error.value ? describeError(error.value) : ''));
  const latest = createLatest();
  let controller = null;

  async function load() {
    controller?.abort();
    const url = toValue(source);
    const token = latest.next();
    if (!url) {
      status.value = 'idle';
      return;
    }
    controller = new AbortController();
    status.value = 'loading';
    error.value = null;
    try {
      const result = await fetchJson(url, { ...fetchOptions, signal: controller.signal });
      if (!latest.isCurrent(token)) return;
      data.value = result;
      status.value = isEmpty(result) ? 'empty' : 'success';
    } catch (caught) {
      if (!latest.isCurrent(token) || describeError(caught) === '') return; // old or cancelled on purpose
      error.value = caught;
      status.value = 'error';
    }
  }

  watch(() => toValue(source), load, { immediate: true });
  onScopeDispose(() => {
    latest.next(); // anything still in flight is now stale
    controller?.abort();
  });

  return { status, data, error, message, reload: load };
}
