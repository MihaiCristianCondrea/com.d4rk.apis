// Change Rationale: Clipboard helpers depend on DOM element utilities that now live under
// `core/domain/dom` after the Android-style refactor.
import { createElement } from '@/shared/lib/dom/elements.js';

/**
 * Copies arbitrary text to the clipboard using the modern Clipboard API when available.
 *
 * The function returns a boolean indicating whether the copy operation was confirmed by
 * the browser API. UI callers can use this signal to surface Material Design feedback
 * (e.g., a transient check icon) only when the copy action actually succeeded.
 *
 * @param {string} text Text value to copy to the clipboard.
 * @returns {Promise<boolean>} Resolves to `true` when the Clipboard API succeeds, otherwise `false`.
 */
export async function copyToClipboard(text) {
  /* Change Rationale: Previously this helper silently returned `undefined`, which made it hard
   * for buttons to confirm when the Clipboard API accepted a copy request. Returning a boolean
   * success flag lets Material Design confirmations only fire after a real copy, improving
   * user feedback consistency and reducing false positives when the browser blocks clipboard
   * writes.
   */
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('ApiBuilderUtils: Clipboard API failed, falling back to manual copy.', error);
  }

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt('Copy this text', text);
    return false;
  }

  console.warn('ApiBuilderUtils: Clipboard API is unavailable and no prompt fallback exists.');
  return false;
}
