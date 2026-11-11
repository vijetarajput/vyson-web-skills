// fetch-state.js: safe data loading with visible loading, empty and error states.
//
// A small, dependency-free ES module. Copy it into your project and import it:
//
//   import { fetchJson, describeError, createLatest, loadInto } from './fetch-state.js';
//
// What it gives you:
//   * fetchJson(): fetch that checks the status code, times out, can be cancelled
//     and throws clear errors (HttpError, TimeoutError, ParseError).
//   * describeError(): a short, polite message for each kind of error. It never
//     shows raw error text to visitors.
//   * createLatest(): lets you ignore a slow answer that arrives after a newer
//     request (a common bug in search boxes and filters).
//   * loadInto(): shows "loading", then the result, an "empty" message or an error
//     with a "Try again" button, in one region of the page.
//
// It builds elements with textContent and createElement, never with innerHTML,
// so data cannot inject markup.

export class HttpError extends Error {
  constructor(status, statusText = '', url = '') {
    super(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs) {
    super(`The request took longer than ${timeoutMs} ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

export class ParseError extends Error {
  constructor(cause) {
    super('The response was not valid JSON');
    this.name = 'ParseError';
    this.cause = cause;
  }
}

/**
 * Fetch JSON with a status check, a timeout and cancellation.
 * options: timeoutMs (default 10000), signal (an AbortSignal), fetchImpl (for tests), and any fetch option.
 * Resolves with the parsed body, or null for a 204 response.
 */
export async function fetchJson(url, options = {}) {
  const { timeoutMs = 10000, signal, fetchImpl = globalThis.fetch, headers, ...init } = options;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);
  });
  const work = (async () => {
    const response = await fetchImpl(url, { ...init, headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
    if (!response.ok) throw new HttpError(response.status, response.statusText, String(url));
    if (response.status === 204) return null;
    try {
      return await response.json();
    } catch (cause) {
      throw new ParseError(cause);
    }
  })();
  work.catch(() => {}); // when the timeout wins, the aborted request must not become an unhandled rejection
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/** A short message for a visitor. Returns '' for a cancelled request (nothing to show). */
export function describeError(error) {
  if (error && error.name === 'AbortError') return '';
  if (error instanceof TimeoutError) return 'This is taking longer than expected. Check your connection and try again.';
  if (error instanceof HttpError) {
    if (error.status === 401 || error.status === 403) return 'You do not have access to this.';
    if (error.status === 404) return 'We could not find that.';
    if (error.status === 429) return 'Too many requests. Wait a moment and try again.';
    if (error.status >= 500) return 'The server had a problem. Please try again in a moment.';
    return `Something went wrong (code ${error.status}).`;
  }
  if (error instanceof ParseError) return 'The answer from the server could not be read. Please try again.';
  if (error instanceof TypeError) return 'You seem to be offline, or the server cannot be reached.';
  return 'Something went wrong. Please try again.';
}

/** Make a counter that tells you whether a request is still the newest one. */
export function createLatest() {
  let current = 0;
  return {
    next() {
      current += 1;
      return current;
    },
    isCurrent(token) {
      return token === current;
    },
  };
}

const controllers = new WeakMap();
const latestFor = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Load something into a region and show every state.
 *
 * region:  the element that will hold the content
 * loader:  async function (signal) that returns the data (use fetchJson with the signal)
 * options: render(data, region) builds the content with DOM methods (required)
 *          isEmpty(data) returns true when there is nothing to show (default: empty array)
 *          loadingText, emptyText, retryLabel
 *
 * A newer call for the same region cancels the older one and ignores its answer.
 */
export async function loadInto(region, loader, options) {
  const { render, isEmpty = (data) => Array.isArray(data) && data.length === 0, loadingText = 'Loading', emptyText = 'Nothing to show yet.', retryLabel = 'Try again' } = options;
  if (typeof render !== 'function') throw new Error('loadInto needs a render function.');

  controllers.get(region)?.abort();
  const controller = new AbortController();
  controllers.set(region, controller);
  if (!latestFor.has(region)) latestFor.set(region, createLatest());
  const latest = latestFor.get(region);
  const token = latest.next();

  region.setAttribute('aria-busy', 'true');
  region.replaceChildren(element('p', 'state state-loading', `${loadingText}...`));
  region.firstChild.setAttribute('role', 'status');

  try {
    const data = await loader(controller.signal);
    if (!latest.isCurrent(token)) return;
    if (isEmpty(data)) {
      region.replaceChildren(element('p', 'state state-empty', emptyText));
    } else {
      region.replaceChildren();
      render(data, region);
    }
  } catch (error) {
    if (!latest.isCurrent(token)) return;
    const message = describeError(error);
    if (message === '') return; // cancelled on purpose
    const box = element('div', 'state state-error');
    box.setAttribute('role', 'alert');
    const retry = element('button', 'state-retry', retryLabel);
    retry.type = 'button';
    retry.addEventListener('click', () => loadInto(region, loader, options), { once: true });
    box.append(element('p', '', message), retry);
    region.replaceChildren(box);
  } finally {
    if (latest.isCurrent(token)) region.setAttribute('aria-busy', 'false');
  }
}
