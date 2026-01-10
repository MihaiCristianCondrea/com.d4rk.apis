/**
 * @file Use case for loading FAQ data.
 *
 * Change Rationale: Add a domain-level use case entry point so the Help feature
 * conforms to the requested use case organization.
 */

/**
 * Loads FAQ data via a repository.
 */
export class GetFaqUseCase {
  /**
   * @param {import('../repository/FaqRepository.js').FaqRepository} repository
   *   Repository implementation used to load FAQ data.
   */
  constructor(repository) {
    this.repository = repository;
  }

  /**
   * Executes the FAQ retrieval flow.
   *
   * @param {string} cacheKey - Cache key for local storage.
   * @param {string} remoteUrl - Remote URL to fetch.
   * @returns {Promise<import('../model/FaqItem.js').FaqCatalog|null>} Catalog data.
   */
  async execute(cacheKey, remoteUrl) {
    if (!this.repository) {
      return null;
    }
    return this.repository.getCatalog(cacheKey, remoteUrl);
  }
}
