import { createElement } from '../dom/elements.js';

const noop = () => {};

export function createInputField({
  label,
  value = '',
  type = 'text',
  placeholder = '',
  onInput = noop,
  helperText = '',
}) {
  const wrapper = createElement('label', { classNames: 'api-field' });

  if (label) {
    wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
  }

  const input = createElement('input', {
    classNames: 'api-input',
    attrs: { type, value, placeholder },
  });
  input.addEventListener('input', (event) => onInput(event.target.value));
  wrapper.appendChild(input);

  if (helperText) {
    wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
  }

  return { wrapper, input };
}

export function createTextareaField({
  label,
  value = '',
  rows = 3,
  placeholder = '',
  onInput = noop,
  helperText = '',
}) {
  const wrapper = createElement('label', { classNames: 'api-field api-field-textarea' });

  if (label) {
    wrapper.appendChild(createElement('span', { classNames: 'api-field-label', text: label }));
  }

  const textarea = createElement('textarea', {
    classNames: 'api-textarea',
    attrs: { rows, placeholder },
    text: value,
  });
  textarea.addEventListener('input', (event) => onInput(event.target.value));
  wrapper.appendChild(textarea);

  if (helperText) {
    wrapper.appendChild(createElement('span', { classNames: 'api-field-helper', text: helperText }));
  }

  return { wrapper, textarea };
}

export function createSelectField({ label, value = '', options = [], onChange = noop }) {
  const wrapper = createElement('label', { classNames: 'api-field' });

  const selectAttrs = {};
  if (label) {
    selectAttrs.label = label;
    selectAttrs['aria-label'] = label;
  }

  const select = createElement('md-outlined-select', { attrs: selectAttrs });

  options.forEach((option) => {
    const optionEl = createElement('md-select-option', {
      attrs: { value: option.value },
      text: option.label,
    });
    if (option.value === value) {
      optionEl.setAttribute('selected', '');
    }
    select.appendChild(optionEl);
  });

  if (value != null) {
    select.value = value;
  }

  select.addEventListener('change', (event) => onChange(event.target.value));
  wrapper.appendChild(select);

  return { wrapper, select };
}

export function createInlineButton({ label, icon = null, onClick = noop, variant = 'ghost', title = '' }) {
  const button = createElement('button', {
    classNames: ['api-inline-button', `variant-${variant}`],
    attrs: { type: 'button', title },
  });

  if (icon) {
    button.appendChild(
      createElement('span', {
        classNames: ['material-symbols-outlined', 'api-inline-icon'],
        text: icon,
      }),
    );
  }

  if (label) {
    button.appendChild(createElement('span', { text: label }));
  }

  button.addEventListener('click', onClick);
  return button;
}
