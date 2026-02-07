/**
 * Describes a workspace that maps UI routes to canonical API slugs.
 *
 * Each workspace entry keeps the `id` aligned with `api/<slug>` while exposing a
 * route-friendly `route` segment and a human-readable `label`.
 *
 * @typedef {Object} WorkspaceDescriptor
 * @property {string} id Canonical workspace identifier matching the API slug (e.g., "faq").
 * @property {string} route Route-safe slug used for hash navigation (e.g., "app-toolkit").
 * @property {string} label Human-friendly name for UI surfaces.
 */

/**
 * Registry of known workspaces keyed by their canonical API slug.
 *
 * Keeping this registry centralized prevents drift between UI routes, folder names,
 * and API paths while preserving the display labels used in Material Design 3 tiles.
 */
export const Workspaces = Object.freeze({
  faq: { id: 'faq', route: 'faq', label: 'FAQ' },
  app_toolkit: { id: 'app_toolkit', route: 'app-toolkit', label: 'App Toolkit' },
  android_studio_tutorials: {
    id: 'android_studio_tutorials',
    route: 'android-studio-tutorials',
    label: 'Android Studio Tutorials',
  },
  english_with_lidia: {
    id: 'english_with_lidia',
    route: 'english-with-lidia',
    label: 'English with Lidia',
  },
});

/**
 * Resolves a hash anchor for a workspace using its route slug.
 *
 * @param {WorkspaceDescriptor|string} workspace Workspace descriptor or registry key.
 * @param {string} [suffix='api'] Optional suffix appended after the route slug.
 * @returns {string} Hash anchor (e.g., "#faq-api").
 */
export function getWorkspaceAnchor(workspace, suffix = 'api') {
  const descriptor =
    typeof workspace === 'string' ? Workspaces[workspace] : workspace;
  if (!descriptor) {
    return '#';
  }
  const route = descriptor.route || descriptor.id;
  return `#${route}${suffix ? `-${suffix}` : ''}`;
}
