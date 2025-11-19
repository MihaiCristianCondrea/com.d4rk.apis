const DATASET_KEY = 'dataset';

function applyClassNames(element, classNames) {
  if (!classNames) {
    return;
  }
  if (typeof classNames === 'string') {
    element.className = classNames;
    return;
  }
  if (Array.isArray(classNames) && classNames.length > 0) {
    element.className = classNames.filter(Boolean).join(' ');
  }
}

function applyDataset(element, dataset) {
  if (!dataset || typeof dataset !== 'object') {
    return;
  }
  Object.entries(dataset).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    element.dataset[key] = String(value);
  });
}

function applyAttributes(element, attrs = {}) {
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null) {
      return;
    }
    if (key === DATASET_KEY) {
      applyDataset(element, value);
      return;
    }
    if (key in element) {
      element[key] = value;
      return;
    }
    element.setAttribute(key, value);
  });
}

/**
 * @param {string} tag
 * @param {{classNames?: string|string[], attrs?: Object<string, any>, text?: string}} [options]
 */
export function createElement(tag, { classNames, attrs, text } = {}) {
  const element = document.createElement(tag);
  applyClassNames(element, classNames);
  if (attrs) {
    applyAttributes(element, attrs);
  }
  if (typeof text === 'string' && text.length > 0) {
    element.textContent = text;
  }
  return element;
}

export function clearElement(element) {
  if (!element) {
    return;
  }
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
