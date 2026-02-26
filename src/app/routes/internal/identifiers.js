// Change Rationale: Legacy GitHub tool URLs previously lived under `/layout/githubtools/*.html`,
// so normalization now resolves them to the canonical tool route IDs without reintroducing
// layout dependencies or hyphenated folder names.
const LEGACY_GITHUB_TOOL_ROUTES = Object.freeze({
  'githubtools/git-patch.html': 'git-patch',
  'githubtools/repo-mapper.html': 'repo-mapper',
  'githubtools/release-stats.html': 'release-stats',
});

// Change Rationale: Deep links can now arrive as clean SPA paths (e.g.
// `/github-tools/repo-mapper`) after route restructuring. Mapping those path
// aliases back to canonical hash IDs prevents Not Found states on refresh.
const GITHUB_TOOL_PATH_ALIASES = Object.freeze({
  'github-tools/favorites': 'favorites',
  'github-tools/repo-mapper': 'repo-mapper',
  'github-tools/release-stats': 'release-stats',
  'github-tools/git-patch': 'git-patch',
});

// Change Rationale: Primary workspace pages must resolve from clean paths
// (e.g. `/faq-api`) when users deep-link directly without hash fragments.
const WORKSPACE_PATH_ALIASES = Object.freeze({
  home: 'home',
  'app-toolkit-api': 'app-toolkit-api',
  'faq-api': 'faq-api',
  'english-with-lidia-api': 'english-with-lidia-api',
  'android-studio-tutorials-api': 'android-studio-tutorials-api',
  favorites: 'favorites',
  'favorites-api': 'favorites',
  'repo-mapper': 'repo-mapper',
  'repo-mapper-api': 'repo-mapper',
  'release-stats': 'release-stats',
  'release-stats-api': 'release-stats',
  'git-patch': 'git-patch',
  'git-patch-api': 'git-patch',
});

/* Change Rationale: Legacy bookmarks and cross-tool links still include `-api`
 * suffixes for GitHub tools (for example `#release-stats-api`). Normalizing
 * those aliases here preserves backwards-compatible deep links and prevents
 * false Not Found states during route migration.
 */

/**
 * Resolves hash-less GitHub tools SPA paths to canonical route IDs.
 *
 * @param {string} value Raw path or route fragment to inspect.
 * @returns {string|null} Canonical route ID or null when no alias matches.
 */
function resolveGitHubToolPathAlias(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const pathOnly = trimmed.split(/[?#]/)[0];
  const normalizedPath = pathOnly
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  const exactMatch = GITHUB_TOOL_PATH_ALIASES[normalizedPath];
  if (exactMatch) {
    return exactMatch;
  }

  const githubToolsSegment = '/github-tools/';
  const segmentIndex = normalizedPath.indexOf(githubToolsSegment);
  if (segmentIndex === -1) {
    return null;
  }

  const aliasCandidate = normalizedPath.substring(segmentIndex + 1);
  return GITHUB_TOOL_PATH_ALIASES[aliasCandidate] || null;
}

/**
 * Resolves clean workspace path aliases to canonical route IDs.
 *
 * @param {string} value Raw path or route fragment to inspect.
 * @returns {string|null} Canonical route ID or null when no alias matches.
 */
function resolveWorkspacePathAlias(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const pathOnly = trimmed.split(/[?#]/)[0];
  const normalizedPath = pathOnly
    .replace(/\/index\.html?$/i, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  if (!normalizedPath) {
    return 'home';
  }

  const directMatch = WORKSPACE_PATH_ALIASES[normalizedPath];
  if (directMatch) {
    return directMatch;
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (!segments.length) {
    return 'home';
  }

  const singleSegmentMatch = WORKSPACE_PATH_ALIASES[segments.at(-1)];
  if (singleSegmentMatch) {
    return singleSegmentMatch;
  }

  // Change Rationale: Static hosting deployments often serve this SPA from a
  // repository-name base folder (for example `/com.d4rk.apis/`). Mapping that
  // single-segment folder path to `home` prevents false Not Found states.
  if (segments.length === 1 && segments[0].includes('.')) {
    return 'home';
  }

  if (segments.length >= 2) {
    const trailingPair = `${segments.at(-2)}/${segments.at(-1)}`;
    return GITHUB_TOOL_PATH_ALIASES[trailingPair] || null;
  }

  return null;
}

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
  const githubToolPathMatch = resolveGitHubToolPathAlias(normalizedId);
  if (githubToolPathMatch) {
    return githubToolPathMatch;
  }
  const workspacePathMatch = resolveWorkspacePathAlias(normalizedId);
  if (workspacePathMatch) {
    return workspacePathMatch;
  }
  if (normalizedId === '' || normalizedId === 'index.html') {
    normalizedId = 'home';
  }
  return normalizedId;
}

export default normalizePageId;
