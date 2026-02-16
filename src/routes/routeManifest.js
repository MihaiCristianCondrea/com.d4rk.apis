/**
 * @file Central SPA route manifest and registration boundary.
 */

/*
 * Change Rationale:
 * - Route setup previously relied on ad-hoc imports in `src/app/bootstrap.js`,
 *   which spread route ownership across unrelated startup concerns.
 * - This manifest centralizes all route bootstrapping and preserves existing
 *   deep-link/hash route IDs so API-compatible navigation remains stable.
 * - Keeping registration in one file also supports future migration from
 *   legacy feature folder names to web-native SPA naming without URL churn.
 */

import '@/app/workspaces/app-toolkit/ui/index.js';
import '@/pages/workspaces/app-toolkit/index.js';
import '@/pages/workspaces/faq/index.js';
import '@/pages/workspaces/english-with-lidia/index.js';
import '@/pages/workspaces/android-studio-tutorials/index.js';
import '@/pages/github-tools/index.js';
import '@/pages/home/index.js';

/**
 * Canonical route manifest preserving public route IDs/hash links.
 *
 * @type {ReadonlyArray<{id:string, hash:string, category:string}>}
 */
export const SPA_ROUTE_MANIFEST = Object.freeze([
  { id: 'home', hash: '#home', category: 'pages' },
  { id: 'app-toolkit-api', hash: '#app-toolkit-api', category: 'tools' },
  { id: 'faq-api', hash: '#faq-api', category: 'tools' },
  { id: 'english-with-lidia-api', hash: '#english-with-lidia-api', category: 'tools' },
  { id: 'android-studio-tutorials-api', hash: '#android-studio-tutorials-api', category: 'tools' },
  { id: 'favorites', hash: '#favorites', category: 'github' },
  { id: 'repo-mapper', hash: '#repo-mapper', category: 'github' },
  { id: 'release-stats', hash: '#release-stats', category: 'github' },
  { id: 'git-patch', hash: '#git-patch', category: 'github' },
]);

/**
 * Marks route manifest registration complete.
 *
 * Route modules register themselves on import; this function acts as the
 * single bootstrap hook and returns manifest metadata for diagnostics.
 *
 * @returns {ReadonlyArray<{id:string, hash:string, category:string}>} Route manifest.
 */
export function registerRouteManifest() {
  return SPA_ROUTE_MANIFEST;
}
