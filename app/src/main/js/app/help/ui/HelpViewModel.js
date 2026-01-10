/**
 * @file View model for the Help screen.
 *
 * Change Rationale: Establish a Help view model entry point to align with the
 * requested UI layer structure without changing existing FAQ runtime logic.
 */

import { createHelpUiState } from './state/HelpUiState.js';

/**
 * View model for Help UI state management.
 */
export class HelpViewModel {
  /**
   * @param {import('../domain/usecases/GetFaqUseCase.js').GetFaqUseCase|null} useCase
   *   Use case used to load FAQ data.
   */
  constructor(useCase = null) {
    this.useCase = useCase;
    this.state = createHelpUiState();
  }

  /**
   * Loads FAQ data and updates state.
   *
   * @param {string} cacheKey - Cache key for local storage.
   * @param {string} remoteUrl - Remote URL to fetch.
   * @returns {Promise<void>} Resolves when state is updated.
   */
  async loadFaq(cacheKey, remoteUrl) {
    this.state = { ...this.state, isLoading: true, error: null };
    try {
      const catalog = await this.useCase?.execute?.(cacheKey, remoteUrl);
      this.state = {
        ...this.state,
        isLoading: false,
        items: Array.isArray(catalog?.products) ? catalog.products : [],
      };
    } catch (error) {
      this.state = {
        ...this.state,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unable to load FAQ data.',
      };
    }
  }
}
