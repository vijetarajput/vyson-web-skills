// Tiny script for the demo page. It loads in the head with no defer on purpose.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('news');
  if (form) form.addEventListener('submit', (event) => event.preventDefault());
});
