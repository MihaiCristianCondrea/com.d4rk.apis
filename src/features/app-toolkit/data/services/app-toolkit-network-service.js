/**
 * @file Network service for App Toolkit remote JSON and GitHub API calls.
 */

/**
 * Change Rationale:
 * - Route logic previously called `fetch` directly for both remote payload loading and GitHub IO.
 * - Centralizing network operations in a data service keeps IO concerns in the data layer and makes
 *   failure behavior unit-testable.
 * - The service supports a fast, clear UX by providing consistent error extraction for status copy.
 */

/**
 * Fetches JSON from a remote URL.
 *
 * @param {string} url URL to fetch.
 * @param {RequestInit} [options] Request options.
 * @returns {Promise<Response>} Raw response.
 */
export function fetchAppToolkitJson(url, options) {
  return fetch(url, options);
}

/**
 * Performs a GitHub contents API request.
 *
 * @param {string} url Request URL.
 * @param {RequestInit} options Request options.
 * @returns {Promise<Response>} Raw response.
 */
export function requestGithubContents(url, options) {
  return fetch(url, options);
}
