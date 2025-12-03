import { createElement } from '../../core/domain/dom/elements.js';

export function setValidationStatus(element, { status = 'success', message = '' } = {}) {
  if (!element) {
    return;
  }

  element.dataset.status = status;
  element.innerHTML = '';

  if (!message) {
    return;
  }

  const icon =
    status === 'success' ? 'check_circle' : status === 'warning' ? 'info' : 'error';

  element.appendChild(
    createElement('span', {
      classNames: ['material-symbols-outlined'],
      text: icon,
    }),
  );
  element.appendChild(createElement('span', { text: message }));
}
