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
} from './githubToolsLegacyUi.js';

export { initRepoMapper } from './surfaces/mapper/RepoMapperToolUi.js';
export { initGitPatch } from './surfaces/gitpatch/GitPatchToolUi.js';
export { initReleaseStats } from './surfaces/releasestats/ReleaseStatsToolUi.js';
export { initFavoritesPage } from './surfaces/favorites/FavoritesToolUi.js';
