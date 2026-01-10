/**
 * @file Repository contract for FAQ data.
 *
 * Change Rationale: Define the repository interface for the Help feature to
 * establish a domain boundary that can be implemented by data sources.
 */

/**
 * @typedef {Object} FaqRepositoryDependencies
 * @property {import('../../data/local/HelpLocalDataSource.js').HelpLocalDataSource|null} [localDataSource]
 * @property {import('../../data/remote/HelpRemoteDataSource.js').HelpRemoteDataSource|null} [remoteDataSource]
 */

/**
 * Repository interface for FAQ data access.
 */
export class FaqRepository {
  /**
   * Loads a FAQ catalog.
   *
   * @param {string} cacheKey - Cache key for local storage.
   * @param {string} remoteUrl - Remote URL to fetch.
   * @returns {Promise<import('../model/FaqItem.js').FaqCatalog|null>} Catalog data.
   */
  async getCatalog(cacheKey, remoteUrl) {
    throw new Error('FaqRepository.getCatalog must be implemented by subclasses.');
  }

  /**
   * Maps a question DTO into a domain item.
   *
   * @param {import('../../data/remote/model/FaqQuestionDto.js').FaqQuestionDto} dto
   *   FAQ question payload.
   * @returns {import('../model/FaqItem.js').FaqItem} Domain FAQ item.
   */
  mapQuestion(dto) {
    throw new Error('FaqRepository.mapQuestion must be implemented by subclasses.');
  }
}
