// reveal.js: scroll reveal with no library (recipe 2).
(() => {
  const motionOk = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  if (!motionOk || !('IntersectionObserver' in window)) return; // content stays visible

  const items = document.querySelectorAll('.vy-reveal');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target); // reveal once, then stop watching
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => observer.observe(el));
  document.documentElement.classList.add('vy-js'); // hide-until-seen turns on only now
})();
