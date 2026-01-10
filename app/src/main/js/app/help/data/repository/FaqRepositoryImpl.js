/**
 * @file Repository implementation for FAQ data.
 *
 * Change Rationale: Define a repository implementation in the Help data layer
 * so the feature structure matches the requested architecture without altering
 * existing FAQ behavior.
 */

import { mapFaqCatalogDto, mapFaqQuestionDto } from '../mapper/FaqMappers.js';

/**
 * Repository implementation that coordinates local/remote FAQ data.
 */
export class FaqRepositoryImpl {
  /**
   * @param {import('../../domain/repository/FaqRepository.js').FaqRepositoryDependencies} dependencies
   *   Dependencies for repository access.
   */
  constructor({ localDataSource, remoteDataSource } = {}) {
    this.localDataSource = localDataSource ?? null;
    this.remoteDataSource = remoteDataSource ?? null;
  }

  /**
   * Loads a FAQ catalog from cache or remote.
   *
   * @param {string} cacheKey - Storage key for cached data.
   * @param {string} remoteUrl - Remote URL to fetch.
   * @returns {Promise<import('../../domain/model/FaqItem.js').FaqCatalog|null>}
   *   Normalized FAQ catalog or null when unavailable.
   */
  async getCatalog(cacheKey, remoteUrl) {
    const cached = this.localDataSource?.readCachedFaq?.(cacheKey);
    if (cached) {
      return mapFaqCatalogDto(cached);
    }

    if (!this.remoteDataSource) {
      return null;
    }

    const payload = await this.remoteDataSource.fetchJson(remoteUrl);
    if (payload) {
      this.localDataSource?.writeCachedFaq?.(cacheKey, payload);
      return mapFaqCatalogDto(payload);
    }

    return null;
  }

  /**
   * Maps a FAQ question payload into domain format.
   *
   * @param {import('../remote/model/FaqQuestionDto.js').FaqQuestionDto} dto
   *   FAQ question payload.
   * @returns {import('../../domain/model/FaqItem.js').FaqItem}
   *   Normalized FAQ item.
   */
  mapQuestion(dto) {
    return mapFaqQuestionDto(dto);
  }
}
