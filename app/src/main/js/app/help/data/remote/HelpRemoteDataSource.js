/**
 * @file Remote data source for Help FAQ payloads.
 *
 * Change Rationale: Add a dedicated remote data source stub in the Help data
 * layer so API wiring can be centralized without disrupting the current UI.
 */

/**
 * Remote data source for FAQ payloads.
 */
export class HelpRemoteDataSource {
  /**
   * @param {typeof fetch} fetcher - Fetch implementation to use.
   */
  constructor(fetcher = typeof fetch === 'function' ? fetch : null) {
    this.fetcher = fetcher;
  }

  /**
   * Fetches a JSON payload from a remote URL.
   *
   * @param {string} url - Remote endpoint to fetch.
   * @returns {Promise<object|null>} Parsed JSON payload or null when unavailable.
   */
  async fetchJson(url) {
    if (!this.fetcher || !url) {
      return null;
    }

    const response = await this.fetcher(url);
    if (!response.ok) {
      throw new Error(`HelpRemoteDataSource: Request failed (${response.status}).`);
    }
    return response.json();
  }
}
