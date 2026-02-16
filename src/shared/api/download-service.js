// Change Rationale: Download helpers now source DOM creation utilities from the core domain
// after the Android-style refactor to keep UI helpers centralized.
import { createElement } from '@/shared/lib/dom/elements.js';

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

export function downloadText(filename, text, mimeType = 'text/plain') {
  try {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = createElement('a', { attrs: { href: url, download: filename } });
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('ApiBuilderUtils: Failed to download text.', error);
  }
}
