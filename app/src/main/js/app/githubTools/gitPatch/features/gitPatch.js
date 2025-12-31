/**
 * @file Compatibility barrel for the Git Patch feature entrypoint.
 *
 * Change Rationale: Git Patch now lives in `app/github-tools/ui/routes` after the flattened
 * Android-style refactor. This re-export keeps historic import paths stable while the router uses
 * the canonical module.
 */
export * from '../../../../github-tools/ui/routes/GitPatchRoute.js';
