import { createElement } from '../core/domain/dom/elements.js';

export async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch (error) {
    console.warn('ApiBuilderUtils: Clipboard API failed, falling back to manual copy.', error);
  }

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt('Copy this text', text);
  } else {
    console.warn('ApiBuilderUtils: Clipboard API is unavailable and no prompt fallback exists.');
  }
}
