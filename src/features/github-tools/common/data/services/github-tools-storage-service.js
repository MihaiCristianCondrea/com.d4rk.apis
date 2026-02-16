/**
 * @file Browser storage integrations for GitHub tools.
 */

const FAVORITES_KEY = 'github_tool_favorites';
const PREFILL_KEY = 'github_tool_prefill';

/** @param {string} tool @returns {string} */
function consumePrefill(tool) {
  try {
    const stored = sessionStorage.getItem(PREFILL_KEY);
    if (!stored) return '';
    const parsed = JSON.parse(stored);
    if (parsed?.tool === tool && parsed?.slug) {
      sessionStorage.removeItem(PREFILL_KEY);
      return parsed.slug;
    }
  } catch (error) {
    // noop
  }
  return '';
}

/** @param {string} tool @param {string} slug */
function savePrefill(tool, slug) {
  if (!tool || !slug) return;
  try {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ tool, slug }));
  } catch (error) {
    console.warn('GitHubTools: Unable to persist prefill state.', error);
  }
}

/** @returns {{slug:string}[]} */
function readFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('GitHubTools: Unable to parse favorites.', error);
    return [];
  }
}

/** @param {{slug:string}[]} items */
function writeFavorites(items) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn('GitHubTools: Unable to persist favorites.', error);
  }
}

/** @param {'repo-mapper'|'release-stats'|string} hash */
function navigateWithHash(hash) {
  window.location.hash = `#${hash}`;
}

export { consumePrefill, navigateWithHash, readFavorites, savePrefill, writeFavorites };
