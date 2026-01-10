/**
 * @file Provides local storage access for Help FAQ data.
 *
 * Change Rationale: Introduce a local data source placeholder to align the Help
 * feature with the requested data/local structure while keeping existing FAQ
 * behavior untouched.
 */

/**
 * Local data source for cached FAQ payloads.
 */
export class HelpLocalDataSource {
  /**
   * @param {Storage|null} storage - Storage provider for cached FAQ data.
   */
  constructor(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    this.storage = storage;
  }

  /**
   * Reads cached FAQ data from storage.
   *
   * @param {string} key - Storage key to read from.
   * @returns {object|null} Cached FAQ payload or null when unavailable.
   */
  readCachedFaq(key) {
    if (!this.storage || !key) {
      return null;
    }

    const raw = this.storage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('HelpLocalDataSource: Unable to parse cached FAQ payload.', error);
      return null;
    }
  }

  /**
   * Stores FAQ data in storage.
   *
   * @param {string} key - Storage key to write to.
   * @param {object} payload - FAQ payload to cache.
   * @returns {void}
   */
  writeCachedFaq(key, payload) {
    if (!this.storage || !key) {
      return;
    }

    this.storage.setItem(key, JSON.stringify(payload ?? null));
  }
}
