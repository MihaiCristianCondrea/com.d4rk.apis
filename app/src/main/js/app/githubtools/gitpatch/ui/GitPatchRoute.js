/**
 * @file Feature-first entrypoint for the Git Patch tool.
 */

// Change Rationale: Git Patch routes now register with composed Screen + View markup so the
// GitHub tools suite shares reusable UI fragments without duplicating layout HTML.
import { RouterRoutes } from '@/core/ui/router/routes.js';
import { initGitPatch } from '@/app/githubtools/common/domain/githubTools.js';
import gitPatchScreenTemplate from './GitPatchScreen.html?raw';
import gitPatchFormView from './views/GitPatchFormView.html?raw';
import toolHeaderViewTemplate from '@/app/githubtools/common/ui/views/GitHubToolHeaderView.html?raw';
import toolCardViewTemplate from '@/app/githubtools/common/ui/views/GitHubToolCardView.html?raw';
import emptyStateViewTemplate from '@/app/githubtools/common/ui/views/GitHubEmptyStateView.html?raw';
import {
  composeGitHubToolScreen,
  renderEmptyStateView,
  renderToolCardView,
  renderToolHeaderView,
} from '@/app/githubtools/common/ui/githubToolsViewComposer.js';

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

  const errorView = renderEmptyStateView({
    template: emptyStateViewTemplate,
    id: 'patch-error',
    message: 'Unable to fetch patch.',
  });

  return composeGitHubToolScreen({
    screenTemplate: gitPatchScreenTemplate,
    headerView,
    cardView,
    emptyStateView: errorView,
  });
}

/**
 * Registers the Git Patch route with the core router.
 *
 * @returns {void}
 */
export function registerGitPatchRoute() {
  if (RouterRoutes.hasRoute('git-patch')) {
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
