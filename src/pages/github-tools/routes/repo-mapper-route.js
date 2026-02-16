/**
 * @file Feature-first entrypoint for the Repo Mapper tool.
 */

// Change Rationale: Repo Mapper routes now register with composed Screen + View markup so the
// GitHub tools suite shares reusable UI fragments without duplicating layout HTML.
import { RouterRoutes } from '@/core/ui/router/routes.js';
import { initRepoMapper } from '@/features/github-tools/common/ui/github-tools-ui.js';
import repoMapperScreenTemplate from '../ui/repo-mapper.page.html?raw';
import repoMapperFormView from '@/features/github-tools/repomapper/ui/views/repo-mapper-form.view.html?raw';
import toolHeaderViewTemplate from '@/features/github-tools/common/ui/views/github-tool-header.view.html?raw';
import toolCardViewTemplate from '@/features/github-tools/common/ui/views/github-tool-card.view.html?raw';
import emptyStateViewTemplate from '@/features/github-tools/common/ui/views/github-empty-state.view.html?raw';
import statusRegionViewTemplate from '@/widgets/status-region/status-region.widget.html?raw';
import {
  composeGitHubToolScreen,
  renderEmptyStateView,
  renderToolCardView,
  renderToolHeaderView,
} from '@/features/github-tools/common/ui/github-tools-view-composer.js';
import { renderStatusRegionView } from '@/widgets/status-region/status-region.ce.js';

/**
 * Builds the Repo Mapper screen markup using shared GitHub tool views.
 *
 * @returns {string} Composed screen HTML.
 */
function buildRepoMapperScreenHtml() {
  const headerView = renderToolHeaderView({
    template: toolHeaderViewTemplate,
    eyebrow: 'GitHub Tools',
    title: 'Repo Mapper',
    subtext: 'Generate ASCII directory trees or path lists for any repository.',
  });

  const cardView = renderToolCardView({
    template: toolCardViewTemplate,
    content: repoMapperFormView,
  });

  /* Change Rationale: The status region slot now renders from the shared core view so
   * every GitHub tool announces idle/loading/success/error states consistently. */
  const statusView = renderStatusRegionView({
    template: statusRegionViewTemplate,
    id: 'repo-mapper-status',
    state: 'idle',
    message: 'Ready to map a repository tree.',
  });

  const errorView = renderEmptyStateView({
    template: emptyStateViewTemplate,
    id: 'mapper-error',
    message: 'Unable to process repository.',
  });

  return composeGitHubToolScreen({
    screenTemplate: repoMapperScreenTemplate,
    headerView,
    cardView,
    statusView,
    emptyStateView: errorView,
  });
}

/**
 * Registers the Repo Mapper route with the core router.
 *
 * @returns {void}
 */
export function registerRepoMapperRoute() {
  // Change Rationale: The Repo Mapper route previously short-circuited if a legacy route was already
  // registered, which left deployments pointing at a removed layout HTML file. Re-registering when
  // the existing route lacks inline HTML ensures the Screen + Views version always wins, keeping
  // routing stable and aligned with Material 3 layout composition.
  // Change Rationale: GitHub tools route IDs now use human-readable slugs
  // so legacy hashes stay stable and navigation labels remain concise.
  const existingRoute = RouterRoutes.getRoute('repo-mapper');
  if (existingRoute?.inlineHtml) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'repo-mapper',
    title: 'Repo Mapper',
    onLoad: initRepoMapper,
    inlineHtml: buildRepoMapperScreenHtml(),
    metadata: {
      description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
      keywords: ['Repo Mapper', 'GitHub', 'ASCII', 'directory tree'],
      canonicalSlug: 'repo-mapper',
      openGraph: {
        title: 'Repo Mapper',
        description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
        type: 'website',
      },
      twitter: {
        title: 'Repo Mapper',
        description: 'Generate ASCII directory trees from any public repository. Perfect for documentation and LLM context.',
      },
    },
  });
}

registerRepoMapperRoute();

// Export the init function for direct calls if needed by the router.
export { initRepoMapper };
