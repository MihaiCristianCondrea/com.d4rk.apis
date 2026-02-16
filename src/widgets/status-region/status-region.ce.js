/**
 * @file Shared status region view renderer and state helper.
 */

/*
 * Change Rationale:
 * - Feature screens previously implemented status/loading feedback inconsistently,
 *   with some missing `role="status"` live regions entirely.
 * - Centralizing rendering and state transitions keeps accessibility semantics,
 *   BeerCSS progress behavior, and Material 3 feedback timing consistent.
 * - The new helper enforces explicit `idle/loading/success/error` states so routes
 *   can communicate lifecycle progress deterministically.
 */

/**
 * Replaces token placeholders in a template string.
 *
 * @param {string} template Raw template text.
 * @param {Record<string, string>} replacements Placeholder/value mapping.
 * @returns {string} Template output with replacements applied.
 */
function applyTemplateTokens(template, replacements) {
  return Object.entries(replacements).reduce((output, [token, value]) => {
    const safeValue = String(value ?? '');
    return output.replaceAll(`{{${token}}}`, safeValue);
  }, String(template));
}

/**
 * Renders the shared status-region view template.
 *
 * @param {{
 *   template: string,
 *   id: string,
 *   state?: 'idle'|'loading'|'success'|'error',
 *   message?: string
 * }} options Rendering options.
 * @returns {string} Rendered status region HTML.
 */
export function renderStatusRegionView({ template, id, state = 'idle', message = 'Ready.' }) {
  return applyTemplateTokens(template, {
    id,
    state,
    message,
  });
}

/**
 * Updates a rendered status region with explicit state and copy.
 *
 * @param {HTMLElement | null} element Status region root element.
 * @param {{
 *   state: 'idle'|'loading'|'success'|'error',
 *   message: string,
 *   loadingLabel?: string
 * }} options Status payload.
 * @returns {void}
 */
export function setStatusRegionState(element, { state, message, loadingLabel = 'Loading' }) {
  if (!element) {
    return;
  }

  const loadingSlot = element.querySelector('[data-status-loading]');
  const loadingText = element.querySelector('[data-status-label]');
  const messageNode = element.querySelector('[data-status-message]');

  element.dataset.state = state;

  if (loadingSlot) {
    loadingSlot.hidden = state !== 'loading';
  }

  if (loadingText) {
    loadingText.textContent = loadingLabel;
  }

  if (messageNode) {
    messageNode.textContent = message;
  }
}
