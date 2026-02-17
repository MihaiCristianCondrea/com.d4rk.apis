/**
 * @file Central GitHub tools UI composition index.
 *
 * Change Rationale: The previous monolithic UI module is now composed via explicit surface
 * entrypoints (mapper/patch/release/favorites) plus shared helpers. Keeping this as the
 * stable import boundary avoids route churn while allowing progressive extraction per surface.
 */

export {
  buildRepoTreeModel,
  consumePrefill,
  formatReleaseCsv,
  formatReleaseSummary,
  normalizeRepoInput,
  normalizeRepoSlug,
  parseCommitInput,
  renderAsciiTree,
  renderPathList,
  savePrefill,
} from './github-tools-legacy-ui.js';

export { initRepoMapper } from './surfaces/mapper/repo-mapper-tool-ui.js';
export { initGitPatch } from './surfaces/git-patch/git-patch-tool-ui.js';
export { initReleaseStats } from './surfaces/release-stats/release-stats-tool-ui.js';
export { initFavoritesPage } from './surfaces/favorites/favorites-tool-ui.js';
