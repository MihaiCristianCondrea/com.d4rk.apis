import { createElement } from '../core/domain/dom/elements.js';

export function downloadJson(filename, jsonString) {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = createElement('a', { attrs: { href: url, download: filename } });
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('ApiBuilderUtils: Failed to download JSON.', error);
  }
}
