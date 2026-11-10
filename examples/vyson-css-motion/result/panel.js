// panel.js: FAQ accordion where only one panel is expanded at a time (recipe 7).
// Opening a panel closes the one that was open. Clicking the open one closes it.
(() => {
  const panels = [...document.querySelectorAll('.panel')];
  if (!panels.length) return;
  const buttons = panels.map((panel) => panel.querySelector('.panel-button'));

  const setOpen = (panel, open) => {
    panel.dataset.open = String(open);
    panel.querySelector('.panel-button').setAttribute('aria-expanded', String(open));
    panel.querySelector('.panel-inner').inert = !open; // closed content cannot be tabbed into
  };

  // Opening one closes all the others. Clicking the open one closes it.
  const toggle = (panel) => {
    const willOpen = panel.dataset.open !== 'true';
    panels.forEach((p) => setOpen(p, p === panel && willOpen));
  };

  buttons.forEach((button, i) => {
    button.addEventListener('click', () => toggle(panels[i]));

    // Optional extras: arrow keys, Home and End move between the questions.
    // Enter and Space already work because each question is a real <button>.
    button.addEventListener('keydown', (event) => {
      const target = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 }[event.key];
      if (target === undefined) return;
      event.preventDefault();
      buttons[(target + buttons.length) % buttons.length].focus();
    });
  });

  panels.forEach((panel, i) => setOpen(panel, i === 0)); // start with the first one open
  document.documentElement.classList.add('js-panels');
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('panels-animate')));
})();
