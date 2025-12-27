/**
 * @file Compatibility barrel for the Git Patch feature entrypoint.
 *
 * Change Rationale: Git Patch now lives in `features/github-tools/git-patch` under the feature-first
 * layout. This re-export keeps historic import paths stable while the router uses the canonical
 * module.
 */
export * from '../../../../features/github-tools/git-patch/features/gitPatch.js';
