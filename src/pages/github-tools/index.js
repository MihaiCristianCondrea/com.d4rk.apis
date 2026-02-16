/**
 * @file Page-level registration entrypoint for GitHub tool routes.
 */

/* Change Rationale:
 * - Route ownership is being migrated from legacy `src/app/githubtools/**` modules
 *   into canonical page slices under `src/pages/**`.
 * - This page entrypoint imports tool route registrations in one location so
 *   route manifest wiring can target a single page boundary.
 */

import './routes/github-favorites-route.js';
import './routes/repo-mapper-route.js';
import './routes/release-stats-route.js';
import './routes/git-patch-route.js';

export const githubToolsPageEntry = Object.freeze({
  id: 'github-tools',
  template: 'src/pages/github-tools/ui/github-tools.page.html',
});
