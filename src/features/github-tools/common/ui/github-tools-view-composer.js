/**
 * @file Shared helpers for composing GitHub tool screens from view templates.
 */

/*
 * Change Rationale:
 * - GitHub tool screens now reuse shared header, card, and error views.
 * - Centralizing the string replacement logic avoids duplicating placeholder
 *   handling in each Route module while keeping UI composition in the UI layer.
 * - A dedicated status live region slot keeps loading/error announcements
 *   reusable and consistent with Material 3 feedback patterns.
 * - This keeps screens modular and consistent with Material 3 layout patterns.
 */

/**
 * Replaces token placeholders in a template string with supplied values.
 *
 * @param {string} template Raw template string containing `{{token}}` placeholders.
 * @param {Record<string, string>} replacements Map of token names to values.
 * @returns {string} Template string with tokens replaced.
 */
export function applyTemplateTokens(template, replacements) {
  return Object.entries(replacements).reduce((output, [token, value]) => {
    const safeValue = String(value ?? '');
    return output.replaceAll(`{{${token}}}`, safeValue);
  }, String(template));
}

/**
 * Renders the shared GitHub tool header view.
 *
 * @param {{
 *   template: string,
 *   eyebrow: string,
 *   title: string,
 *   subtext: string
 * }} options Header configuration.
 * @returns {string} Rendered header HTML string.
 */
export function renderToolHeaderView({ template, eyebrow, title, subtext }) {
  return applyTemplateTokens(template, {
    eyebrow,
    title,
    subtext,
  });
}

/**
 * Renders the shared GitHub tool card view.
 *
 * @param {{ template: string, content: string }} options Card configuration.
 * @returns {string} Rendered card HTML string.
 */
export function renderToolCardView({ template, content }) {
  return applyTemplateTokens(template, { content });
}

/**
 * Renders the shared GitHub tool error/empty state view.
 *
 * @param {{ template: string, id: string, message: string }} options Error state configuration.
 * @returns {string} Rendered error state HTML string.
 */
export function renderEmptyStateView({ template, id, message }) {
  return applyTemplateTokens(template, { id, message });
}

/**
 * Composes a GitHub tool screen by replacing its view placeholders.
 *
 * @param {{
 *   screenTemplate: string,
 *   headerView: string,
 *   cardView: string,
 *   statusView?: string,
 *   emptyStateView: string
 * }} options Screen composition inputs.
 * @returns {string} Fully composed screen HTML.
 */
export function composeGitHubToolScreen({
  screenTemplate,
  headerView,
  cardView,
  statusView = '',
  emptyStateView,
}) {
  return applyTemplateTokens(screenTemplate, {
    GH_TOOL_HEADER: headerView,
    GH_TOOL_CARD: cardView,
    GH_TOOL_STATUS: statusView,
    GH_TOOL_ERROR: emptyStateView,
  });
}
