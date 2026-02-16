/**
 * @file Feature-first entrypoint for the Git Patch tool.
 */

// Change Rationale: Git Patch routes now register with composed Screen + View markup so the
// GitHub tools suite shares reusable UI fragments without duplicating layout HTML.
import { RouterRoutes } from '@/core/ui/router/routes.js';
import { initGitPatch } from '@/features/github-tools/common/ui/githubToolsUi.js';
import gitPatchScreenTemplate from '../ui/git-patch.page.html?raw';
import gitPatchFormView from '@/features/github-tools/gitpatch/ui/views/GitPatchFormView.html?raw';
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
 * Builds the Git Patch screen markup using shared GitHub tool views.
 *
 * @returns {string} Composed screen HTML.
 */
function buildGitPatchScreenHtml() {
  const headerView = renderToolHeaderView({
    template: toolHeaderViewTemplate,
    eyebrow: 'GitHub Tools',
    title: 'Git Patch',
    subtext: 'Fetch raw .patch files from commit URLs.',
  });

  const cardView = renderToolCardView({
    template: toolCardViewTemplate,
    content: gitPatchFormView,
  });

  /* Change Rationale: The status region slot now renders from the shared core view so
   * every GitHub tool announces idle/loading/success/error states consistently. */
  const statusView = renderStatusRegionView({
    template: statusRegionViewTemplate,
    id: 'git-patch-status',
    state: 'idle',
    message: 'Ready to fetch a commit patch.',
  });

  const errorView = renderEmptyStateView({
    template: emptyStateViewTemplate,
    id: 'patch-error',
    message: 'Unable to fetch patch.',
  });

  return composeGitHubToolScreen({
    screenTemplate: gitPatchScreenTemplate,
    headerView,
    cardView,
    statusView,
    emptyStateView: errorView,
  });
}

/**
 * Registers the Git Patch route with the core router.
 *
 * @returns {void}
 */
export function registerGitPatchRoute() {
  // Change Rationale: Git Patch routes must override legacy entries that pointed to `/layout`
  // so the Screen-based inline HTML path is always used. This keeps navigation aligned with
  // the Repo Mapper and Release Stats flow while preventing 404s in production.
  // Change Rationale: GitHub tools route IDs now use human-readable slugs
  // so legacy hashes stay stable and navigation labels remain concise.
  const existingRoute = RouterRoutes.getRoute('git-patch');
  if (existingRoute?.inlineHtml) {
    return;
  }

  RouterRoutes.registerRoute({
    id: 'git-patch',
    title: 'Git Patch',
    onLoad: initGitPatch,
    inlineHtml: buildGitPatchScreenHtml(),
    metadata: {
      description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
      keywords: ['Git Patch', 'GitHub', 'patch', 'commit'],
      canonicalSlug: 'git-patch',
      openGraph: {
        title: 'Git Patch',
        description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
        type: 'website',
      },
      twitter: {
        title: 'Git Patch',
        description: 'Extract raw .patch files from commit URLs. Easily apply changes from one repo to another or perform code reviews.',
      },
    },
  });
}

registerGitPatchRoute();

// Export the init function for direct calls if needed by the router.
export { initGitPatch };
