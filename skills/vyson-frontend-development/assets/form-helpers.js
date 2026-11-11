// form-helpers.js: accessible form validation and safe submission.
//
// A small, dependency-free ES module. Copy it into your project and import it:
//
//   import { enhanceForm, messageFor, createSubmitGuard } from './form-helpers.js';
//
// The form must work without this file: give it real labels, native validation
// attributes (required, type, minlength, pattern), an action and method="post".
// enhanceForm() then upgrades it:
//   * replaces the browser's pop-up bubbles with inline messages next to each
//     field, linked with aria-describedby, plus an error summary that takes focus
//   * marks bad fields with aria-invalid and clears the message when it is fixed
//   * stops double submits, keeps the button focusable while it works
//   * shows the success or failure of the submit in a status line
//
// Usage:
//   enhanceForm(document.querySelector('form'), {
//     onSubmit: async (formData) => { await sendSomewhere(formData); },
//     successMessage: 'Thanks, we will be in touch.',
//   });
//
// Elements it uses (it creates them if they are missing):
//   [data-form-summary]  the error summary, at the top of the form
//   [data-form-status]   the status line (role="status") after the button

/** Make a guard that ignores a second submit while the first is still running. */
export function createSubmitGuard() {
  let pending = null;
  return {
    get busy() {
      return pending !== null;
    },
    run(task) {
      if (pending) return pending;
      pending = Promise.resolve()
        .then(task)
        .finally(() => {
          pending = null;
        });
      return pending;
    },
  };
}

/**
 * Turn a ValidityState into a plain sentence. Returns '' when the field is valid.
 * field: { label, type, minLength, maxLength, min, max, title, customMessage }
 */
export function messageFor(validity, field = {}) {
  if (!validity || validity.valid) return '';
  const label = (field.label || 'This field').trim();
  const lower = label.toLowerCase();
  if (validity.customError) return field.customMessage || `${label} is not valid.`;
  if (validity.valueMissing) {
    if (field.type === 'checkbox') return `Tick the box: ${label}.`;
    if (field.type === 'radio') return `Choose an option for ${lower}.`;
    if (field.type === 'select-one') return `Choose an option for ${lower}.`;
    return `${label} is required.`;
  }
  if (validity.typeMismatch) {
    if (field.type === 'email') return 'Enter an email address like name@example.com.';
    if (field.type === 'url') return 'Enter a web address that starts with https://.';
    return `Enter a valid ${lower}.`;
  }
  if (validity.tooShort) return `${label} must be at least ${field.minLength} characters.`;
  if (validity.tooLong) return `${label} must be ${field.maxLength} characters or fewer.`;
  if (validity.patternMismatch) return field.title || `${label} is not in the expected format.`;
  if (validity.rangeUnderflow) return `${label} must be ${field.min} or more.`;
  if (validity.rangeOverflow) return `${label} must be ${field.max} or less.`;
  if (validity.badInput) return `Enter a number for ${lower}.`;
  if (validity.stepMismatch) return `Enter a valid value for ${lower}.`;
  return `${label} is not valid.`;
}

function labelTextFor(field) {
  const label = (field.id && field.form.querySelector(`label[for="${CSS.escape(field.id)}"]`)) || field.closest('label');
  if (!label) return field.getAttribute('aria-label') || field.name || 'This field';
  const clone = label.cloneNode(true);
  clone.querySelectorAll('input, select, textarea, [data-hint]').forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, ' ').replace(/\(optional\)/i, '').trim();
}

function describeBy(field, id, add) {
  const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  if (add) ids.add(id);
  else ids.delete(id);
  if (ids.size) field.setAttribute('aria-describedby', [...ids].join(' '));
  else field.removeAttribute('aria-describedby');
}

function showFieldError(field, message) {
  const id = `${field.id}-error`;
  let node = document.getElementById(id);
  if (!message) {
    field.removeAttribute('aria-invalid');
    describeBy(field, id, false);
    if (node) node.remove();
    return;
  }
  if (!node) {
    node = document.createElement('p');
    node.id = id;
    node.className = 'field-error';
    field.insertAdjacentElement('afterend', node);
  }
  node.textContent = message;
  field.setAttribute('aria-invalid', 'true');
  describeBy(field, id, true);
}

function checkField(field) {
  const message = messageFor(field.validity, {
    label: labelTextFor(field),
    type: field.type,
    minLength: field.minLength,
    maxLength: field.maxLength,
    min: field.min,
    max: field.max,
    title: field.title,
    customMessage: field.validationMessage,
  });
  showFieldError(field, message);
  return message;
}

/** Upgrade a form. Returns a function that removes the listeners. */
export function enhanceForm(form, { onSubmit, successMessage = 'Sent. Thank you.', failureMessage = 'We could not send that. Please try again.' } = {}) {
  if (!form || typeof onSubmit !== 'function') throw new Error('enhanceForm needs a form and an onSubmit function.');
  form.noValidate = true; // we show our own messages; the attributes still drive the rules

  let summary = form.querySelector('[data-form-summary]');
  if (!summary) {
    summary = document.createElement('div');
    summary.dataset.formSummary = '';
    form.prepend(summary);
  }
  summary.tabIndex = -1;
  let status = form.querySelector('[data-form-status]');
  if (!status) {
    status = document.createElement('p');
    status.dataset.formStatus = '';
    form.append(status);
  }
  status.setAttribute('role', 'status');

  const submitButton = form.querySelector('[type="submit"]');
  const guard = createSubmitGuard();

  const controls = () => [...form.elements].filter((el) => el.willValidate && el.id);

  function renderSummary(problems) {
    summary.replaceChildren();
    if (problems.length === 0) {
      summary.hidden = true;
      return;
    }
    summary.hidden = false;
    const heading = document.createElement('h2');
    heading.textContent = problems.length === 1 ? 'There is 1 problem' : `There are ${problems.length} problems`;
    const list = document.createElement('ul');
    for (const { field, message } of problems) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${field.id}`;
      link.textContent = message;
      link.addEventListener('click', (event) => {
        event.preventDefault();
        field.focus();
      });
      item.append(link);
      list.append(item);
    }
    summary.append(heading, list);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (guard.busy) return;
    status.textContent = '';
    const problems = controls().map((field) => ({ field, message: checkField(field) })).filter((p) => p.message);
    renderSummary(problems);
    if (problems.length) {
      summary.focus();
      return;
    }
    form.dataset.busy = 'true';
    if (submitButton) submitButton.setAttribute('aria-disabled', 'true'); // stays focusable, unlike "disabled"
    try {
      await guard.run(() => onSubmit(new FormData(form)));
      status.textContent = successMessage;
      form.reset();
    } catch {
      status.textContent = failureMessage;
    } finally {
      delete form.dataset.busy;
      if (submitButton) submitButton.removeAttribute('aria-disabled');
    }
  }

  function handleFieldChange(event) {
    const field = event.target;
    if (field.getAttribute && field.getAttribute('aria-invalid') === 'true') {
      checkField(field);
      renderSummary(controls().map((f) => ({ field: f, message: f.getAttribute('aria-invalid') === 'true' ? checkField(f) : '' })).filter((p) => p.message));
    }
  }

  form.addEventListener('submit', handleSubmit);
  form.addEventListener('input', handleFieldChange);
  form.addEventListener('change', handleFieldChange);
  return () => {
    form.removeEventListener('submit', handleSubmit);
    form.removeEventListener('input', handleFieldChange);
    form.removeEventListener('change', handleFieldChange);
  };
}
