// Change Rationale: Legacy GitHub tool URLs previously lived under `/layout/githubtools/*.html`,
// so normalization now resolves them to the canonical tool route IDs without reintroducing
// layout dependencies or hyphenated folder names.
const LEGACY_GITHUB_TOOL_ROUTES = Object.freeze({
  'githubtools/git-patch.html': 'git-patch',
  'githubtools/repo-mapper.html': 'repo-mapper',
  'githubtools/release-stats.html': 'release-stats',
});

/**
 * Resolves legacy layout URLs to canonical route IDs.
 *
 * @param {string} value Raw path or hash fragment to inspect.
 * @returns {string|null} Canonical route ID or null when no match is found.
 */
function resolveLegacyLayoutRoute(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  // Change Rationale: Legacy URLs arrive with mixed casing, duplicate slashes, or trailing
  // delimiters. Normalizing those variants keeps the compatibility layer conservative while
  // ensuring known GitHub tool paths continue to resolve.
  const pathOnly = trimmed.split(/[?#]/)[0];
  const normalizedPath = pathOnly
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/^layout\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  if (!normalizedPath.startsWith('githubtools/')) {
    return null;
  }
  return LEGACY_GITHUB_TOOL_ROUTES[normalizedPath] || null;
}

/**
 * Normalizes a route identifier from hashes, paths, or legacy layout URLs.
 *
 * @param {string} pageId Raw route identifier.
 * @returns {string} Canonical route ID.
 */
export function normalizePageId(pageId) {
  if (typeof pageId !== 'string') {
    return 'home';
  }
  let normalizedId = pageId.trim();
  if (normalizedId.startsWith('#')) {
    normalizedId = normalizedId.substring(1);
  }
  const legacyMatch = resolveLegacyLayoutRoute(normalizedId);
  if (legacyMatch) {
    return legacyMatch;
  }
  if (normalizedId === '' || normalizedId === 'index.html') {
    normalizedId = 'home';
  }
  return normalizedId;
}

export default normalizePageId;
