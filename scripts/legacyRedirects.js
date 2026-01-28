'use strict';

// Change Rationale: Centralize legacy GitHub tools redirect logic so Vite build hooks and tests
// share a single, deterministic implementation for URL mapping and redirect HTML generation.

/**
 * Legacy layout filename to route ID mapping for GitHub tools.
 */
const legacyGitHubToolRedirects = Object.freeze({
  'git-patch.html': 'git-patch',
  'repo-mapper.html': 'repo-mapper',
  'release-stats.html': 'release-stats',
});

/**
 * Resolves legacy GitHub tool layout URLs to route IDs.
 *
 * @param {string | undefined} url Incoming request URL.
 * @returns {string | null} Route ID for the GitHub tool, or null when no mapping exists.
 */
function resolveLegacyGitHubToolRoute(url) {
  if (!url) {
    return null;
  }
  const pathOnly = url.split(/[?#]/)[0];
  const normalizedPath = pathOnly.replace(/\\+/g, '/').replace(/\/+$/, '');
  const lowerPath = normalizedPath.toLowerCase();
  if (!lowerPath.startsWith('/layout/github-tools/')) {
    return null;
  }
  const legacyFile = lowerPath.replace('/layout/github-tools/', '');
  return legacyGitHubToolRedirects[legacyFile] || null;
}

/**
 * Builds a redirect HTML payload for legacy GitHub tool URLs.
 *
 * @param {string} routeId Canonical route ID to redirect toward.
 * @returns {string} HTML document that redirects to the SPA route.
 */
function createLegacyRedirectHtml(routeId) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=../../#${routeId}" />
    <meta name="robots" content="noindex" />
    <title>Redirecting…</title>
  </head>
  <body>
    <script>
      (function () {
        const search = window.location.search || '';
        const hash = window.location.hash || '';
        const basePath = window.location.pathname.replace(/\\/layout\\/github-tools\\/[^/]*$/i, '/');
        const base = basePath.endsWith('/') ? basePath : basePath + '/';
        const target = base + '#${routeId}' + search + hash;
        window.location.replace(target);
      })();
    </script>
    <p>Redirecting to the GitHub Tools console…</p>
  </body>
</html>`;
}

module.exports = {
  legacyGitHubToolRedirects,
  resolveLegacyGitHubToolRoute,
  createLegacyRedirectHtml,
};
