/**
 * @file Feature-first entrypoint for the GitHub Favorites tool.
 */

import { RouterRoutes } from '@/core/ui/router/routes.js';
import { initFavoritesPage } from '@/app/githubtools/common/ui/githubToolsUi.js';
import favoritesScreenTemplate from '../ui/github-favorites.page.html?raw';
import statusRegionViewTemplate from '@/widgets/status-region/status-region.widget.html?raw';
import { applyTemplateTokens } from '@/app/githubtools/common/ui/githubToolsViewComposer.js';
import { renderStatusRegionView } from '@/widgets/status-region/status-region.ce.js';

/**
 * Builds the favorites screen markup with a shared status region.
 *
 * @returns {string} Composed screen HTML.
 */
function buildFavoritesScreenHtml() {
  const statusView = renderStatusRegionView({
    template: statusRegionViewTemplate,
    id: 'favorites-status',
    state: 'idle',
    message: 'Ready to read saved repositories.',
  });

  return applyTemplateTokens(favoritesScreenTemplate, {
    GH_TOOL_STATUS: statusView,
  });
}

/**
 * Registers the Favorites route with inline screen composition.
 *
 * @returns {void}
 */
export function registerGitHubFavoritesRoute() {
  /* Change Rationale: Favorites previously depended only on a static screen path and had no
   * reusable status region. Registering inline composed HTML keeps status feedback consistent
   * with other GitHub tools and guarantees the shared status fragment is always present. */
  const existingRoute = RouterRoutes.getRoute('favorites');
  if (existingRoute?.inlineHtml) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'favorites',
    title: 'Favorites',
    onLoad: initFavoritesPage,
    inlineHtml: buildFavoritesScreenHtml(),
    metadata: existingRoute?.metadata,
    path: existingRoute?.path,
  });
}

registerGitHubFavoritesRoute();

export { initFavoritesPage };
