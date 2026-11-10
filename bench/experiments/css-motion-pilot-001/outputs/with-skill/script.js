// Harborline: scroll reveal and FAQ panels. No library, no scroll listeners.
(() => {
  const root = document.documentElement;
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;

  // 1. Scroll reveal. If motion is not wanted or unsupported, content stays visible.
  if (motionOk && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // reveal once
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll('.vy-reveal').forEach((el) => observer.observe(el));
    root.classList.add('vy-js'); // hiding turns on only now
  }

  // 2. FAQ panels. First one starts open, the rest closed.
  const panels = document.querySelectorAll('.panel');
  panels.forEach((panel, index) => {
    const button = panel.querySelector('.panel-button');
    const inner = panel.querySelector('.panel-inner');
    const setOpen = (open) => {
      panel.dataset.open = String(open);
      button.setAttribute('aria-expanded', String(open));
      inner.inert = !open; // closed answers cannot be tabbed into
    };
    setOpen(index === 0);
    button.addEventListener('click', () => setOpen(panel.dataset.open !== 'true'));
  });
  root.classList.add('js-panels');
  // Switch the smooth transition on one frame later, so nothing animates at load.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('panels-animate')));
})();
