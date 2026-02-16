/**
 * @file Feature-first entrypoint for the Release Stats tool.
 */

// Change Rationale: Release Stats routes now register with composed Screen + View markup so the
// GitHub tools suite shares reusable UI fragments without duplicating layout HTML.
import { RouterRoutes } from '@/core/ui/router/routes.js';
import { initReleaseStats } from '@/features/github-tools/common/ui/githubToolsUi.js';
import releaseStatsScreenTemplate from '../ui/release-stats.page.html?raw';
import releaseStatsFormView from '@/features/github-tools/releasestats/ui/views/ReleaseStatsFormView.html?raw';
import toolHeaderViewTemplate from '@/features/github-tools/common/ui/views/GitHubToolHeaderView.html?raw';
import toolCardViewTemplate from '@/features/github-tools/common/ui/views/GitHubToolCardView.html?raw';
import emptyStateViewTemplate from '@/features/github-tools/common/ui/views/GitHubEmptyStateView.html?raw';
import statusRegionViewTemplate from '@/widgets/status-region/status-region.widget.html?raw';
import {
  composeGitHubToolScreen,
  renderEmptyStateView,
  renderToolCardView,
  renderToolHeaderView,
} from '@/features/github-tools/common/ui/githubToolsViewComposer.js';
import { renderStatusRegionView } from '@/widgets/status-region/status-region.ce.js';

/**
 * Builds the Release Stats screen markup using shared GitHub tool views.
 *
 * @returns {string} Composed screen HTML.
 */
function buildReleaseStatsScreenHtml() {
  const headerView = renderToolHeaderView({
    template: toolHeaderViewTemplate,
    eyebrow: 'GitHub Tools',
    title: 'Release Stats',
    subtext: 'Analyze downloads and assets for repository releases.',
  });

  const cardView = renderToolCardView({
    template: toolCardViewTemplate,
    content: releaseStatsFormView,
  });

  /* Change Rationale: The status region slot now renders from the shared core view so
   * every GitHub tool announces idle/loading/success/error states consistently. */
  const statusView = renderStatusRegionView({
    template: statusRegionViewTemplate,
    id: 'release-stats-status',
    state: 'idle',
    message: 'Ready to analyze releases.',
  });

  const errorView = renderEmptyStateView({
    template: emptyStateViewTemplate,
    id: 'releases-error',
    message: 'Unable to analyze releases.',
  });

  return composeGitHubToolScreen({
    screenTemplate: releaseStatsScreenTemplate,
    headerView,
    cardView,
    statusView,
    emptyStateView: errorView,
  });
}

/**
 * Registers the Release Stats route with the core router.
 *
 * @returns {void}
 */
export function registerReleaseStatsRoute() {
  // Change Rationale: Release Stats must prefer the Screen + View composition when legacy
  // `/layout` routes are still registered, keeping the GitHub tools navigation consistent
  // and eliminating 404s tied to removed layout files.
  // Change Rationale: GitHub tools route IDs now use human-readable slugs
  // so legacy hashes stay stable and navigation labels remain concise.
  const existingRoute = RouterRoutes.getRoute('release-stats');
  if (existingRoute?.inlineHtml) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'release-stats',
    title: 'Release Stats',
    onLoad: initReleaseStats,
    inlineHtml: buildReleaseStatsScreenHtml(),
    metadata: {
      description: 'Visualize download counts, analyze asset performance, and track version history in real-time.',
      keywords: ['Release Stats', 'GitHub', 'downloads', 'statistics'],
      canonicalSlug: 'release-stats',
      openGraph: {
        title: 'Release Stats',
        description: 'Visualize download counts, analyze asset performance, and track version history in real-time.',
        type: 'website',
      },
      twitter: {
        title: 'Release Stats',
        description: 'Visualize download counts, analyze asset performance, and track version history in real-time.',
      },
    },
  });
}

registerReleaseStatsRoute();

// Export the init function for direct calls if needed by the router.
export { initReleaseStats };
