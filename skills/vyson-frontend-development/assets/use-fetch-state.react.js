// use-fetch-state.react.js: a React hook for loading JSON with every state.
//
// Copy it next to fetch-state.js and import it in a component (React 18 or newer):
//
//   import { useFetchState } from './use-fetch-state.react.js';
//   const { status, data, message, reload } = useFetchState('/api/workshops.json');
//
// status is one of: 'idle' (no address yet), 'loading', 'success', 'empty', 'error'.
// Render a region for each one, with role="status" for loading and role="alert"
// for the error (see references/frameworks.md).
//
// When the address changes, or the component goes away, the old request is
// cancelled and its answer is ignored. That also makes it safe in React Strict
// Mode, which runs effects twice in development.
//
// Next.js App Router: a component that calls this hook must be a client
// component, so the file that uses it starts with the line  'use client'.
// For data a server component can read, fetch it in the server component instead.

import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError, fetchJson } from './fetch-state.js';

const emptyArray = (data) => Array.isArray(data) && data.length === 0;

export function useFetchState(url, options = {}) {
  const { isEmpty = emptyArray, ...fetchOptions } = options;
  const [result, setResult] = useState({ url, phase: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const optionsRef = useRef(fetchOptions);
  optionsRef.current = fetchOptions;

  useEffect(() => {
    if (!url) return undefined;
    const controller = new AbortController();
    setResult({ url, phase: 'loading', data: null, error: null });
    fetchJson(url, { ...optionsRef.current, signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ url, phase: 'done', data, error: null });
      },
      (error) => {
        if (controller.signal.aborted || describeError(error) === '') return; // old or cancelled on purpose
        setResult({ url, phase: 'error', data: null, error });
      },
    );
    return () => controller.abort();
  }, [url, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  let status = 'idle';
  if (url) {
    if (result.url !== url) status = 'loading'; // a new address is loading even before the effect runs
    else if (result.phase === 'error') status = 'error';
    else if (result.phase === 'loading') status = 'loading';
    else status = isEmpty(result.data) ? 'empty' : 'success';
  }
  return { status, data: result.data, error: result.error, message: result.error ? describeError(result.error) : '', reload };
}
