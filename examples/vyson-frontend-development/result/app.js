// app.js: wires the page together. Everything shown comes from the two helper
// modules (fetch-state.js and form-helpers.js) and the browser's own elements.
//
// The data is a local file (workshops.json) and the sign-up is pretend: nothing
// leaves your computer. The "demo controls" choose how the pretend server acts.

import { fetchJson, loadInto } from './fetch-state.js';
import { enhanceForm } from './form-helpers.js';

const results = document.querySelector('#results');
const filters = document.querySelector('#filters');
const searchInput = document.querySelector('#q');
const whenSelect = document.querySelector('#when');
const simulate = document.querySelector('#simulate');
const workshopSelect = document.querySelector('#workshop');
const dialog = document.querySelector('#details-dialog');

let allWorkshops = [];

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(new DOMException('Cancelled', 'AbortError'));
  }, { once: true });
});

async function loadWorkshops(signal) {
  const mode = simulate.value;
  if (mode === 'slow') await wait(2500, signal);
  const url = mode === 'fails' ? 'api/workshops-missing.json' : 'workshops.json';
  const data = await fetchJson(url, { signal, timeoutMs: 8000 });
  if (mode === 'empty') return [];
  allWorkshops = data;
  fillWorkshopChoices(data);

  const query = searchInput.value.trim().toLowerCase();
  const when = whenSelect.value;
  return data.filter((item) => (when === 'any' || item.when === when) && item.title.toLowerCase().includes(query));
}

function fillWorkshopChoices(items) {
  if (workshopSelect.options.length > 1) return;
  for (const item of items) {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.title} (${item.day})`;
    workshopSelect.append(option);
  }
}

function openDetails(item) {
  dialog.querySelector('#dialog-title').textContent = item.title;
  dialog.querySelector('#dialog-meta').textContent = `${item.day}. ${item.places} places.`;
  dialog.querySelector('#dialog-summary').textContent = item.summary;
  dialog.showModal();
}

function renderList(items, region) {
  const list = document.createElement('ul');
  list.className = 'workshop-list';
  for (const item of items) {
    const row = document.createElement('li');
    const heading = document.createElement('h3');
    heading.textContent = item.title;
    const meta = document.createElement('p');
    meta.className = 'hint';
    meta.textContent = `${item.day}. ${item.places} places.`;
    const button = document.createElement('button');
    button.type = 'button';
    button.append('Details');
    const hidden = document.createElement('span');
    hidden.className = 'visually-hidden';
    hidden.textContent = ` for ${item.title}`;
    button.append(hidden);
    button.addEventListener('click', () => openDetails(item));
    row.append(heading, meta, button);
    list.append(row);
  }
  region.append(list);
}

function reload() {
  return loadInto(results, loadWorkshops, {
    render: renderList,
    loadingText: 'Loading workshops',
    emptyText: 'No workshops match. Try another day or clear the search.',
    retryLabel: 'Try again',
  });
}

filters.addEventListener('submit', (event) => {
  event.preventDefault();
  reload();
});
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(reload, 250);
});
whenSelect.addEventListener('change', reload);
simulate.addEventListener('change', reload);

enhanceForm(document.querySelector('#signup'), {
  async onSubmit() {
    await wait(700); // pretend to send
    if (simulate.value === 'fails') throw new Error('Simulated failure');
  },
  successMessage: 'Thanks. This is a demo, so nothing was sent.',
  failureMessage: 'We could not reserve that place. Please try again.',
});

reload();
