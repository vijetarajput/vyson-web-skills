// Demo form behaviour. The demo has no server, so the form says so instead of pretending to send.
const form = document.getElementById('news-form');
const status = document.getElementById('news-status');

if (form && status) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.elements.email;
    if (!email.value || !email.validity.valid) {
      status.textContent = 'Enter an email address like name@example.com.';
      email.focus();
      return;
    }
    status.textContent = 'This is a demo, so nothing was sent.';
  });
}
