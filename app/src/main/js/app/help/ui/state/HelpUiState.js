/**
 * @file UI state helpers for the Help screen.
 *
 * Change Rationale: Define a typed UI state shape so Help rendering and events
 * share a consistent contract within the feature.
 */

/**
 * @typedef {Object} HelpUiState
 * @property {boolean} isLoading - Whether data is loading.
 * @property {string|null} error - Error message when loading fails.
 * @property {Array<import('../../domain/model/FaqItem.js').FaqItem>} items
 *   FAQ items to display.
 * @property {string|null} selectedId - Currently selected FAQ ID.
 */

/**
 * Creates the default Help UI state.
 *
 * @returns {HelpUiState} Default state.
 */
export function createHelpUiState() {
  return {
    isLoading: false,
    error: null,
    items: [],
    selectedId: null,
  };
}
